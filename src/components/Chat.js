'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

const ini = (n) => n ? n.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() : '?';
const AV = ['from-[#1A656D] to-[#31747c]','from-purple-600 to-violet-500','from-blue-600 to-sky-500','from-emerald-600 to-green-500','from-amber-500 to-orange-400','from-rose-500 to-pink-500'];
const av = (id) => AV[(id || 0) % AV.length];
const TI = { general:'🌐', department:'🏢', project:'📁', direct:'👤' };

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat({ channel, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [typing, setTyping]     = useState([]);
  const [connected, setConnected] = useState(false);

  const socketRef      = useRef(null);
  const bottomRef      = useRef(null);
  const typingTimer    = useRef(null);
  const channelIdRef   = useRef(null); // always holds current channel id for use inside callbacks
  const messagesRef    = useRef([]);   // mirror of messages state for dedup inside callbacks

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const addMessage = useCallback((msg) => {
    // Dedup by id
    if (messagesRef.current.find(m => m.id === msg.id)) return;
    messagesRef.current = [...messagesRef.current, msg];
    setMessages([...messagesRef.current]);
  }, []);

  // ── SOCKET: connect once, never reconnect ──────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        const token = localStorage.getItem('token');
        const { io } = await import('socket.io-client');

        const s = io(window.location.origin, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
        });
        socketRef.current = s;

        s.on('connect', () => {
          if (!mounted) return;
          setConnected(true);
          // Re-join current channel on reconnect
          if (channelIdRef.current) s.emit('join_channel', channelIdRef.current);
        });

        s.on('disconnect', () => {
          if (mounted) setConnected(false);
        });

        s.on('new_message', (msg) => {
          if (!mounted) return;
          // Only show messages for the currently open channel
          if (String(msg.channelId) !== String(channelIdRef.current)) return;
          addMessage(msg);
        });

        s.on('user_typing', (d) => {
          if (!mounted || String(d.userId) === String(user.id)) return;
          setTyping(prev => prev.includes(d.userName) ? prev : [...prev, d.userName]);
        });

        s.on('user_stop_typing', (d) => {
          if (!mounted) return;
          setTyping(prev => prev.filter(n => n !== d.userName));
        });

        s.on('error', (e) => console.warn('Socket error:', e));
      } catch (err) {
        console.error('Socket connect failed:', err);
      }
    };

    connect();

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CHANNEL SWITCH ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!channel?.id) return;

    const s = socketRef.current;
    const prevId = channelIdRef.current;

    // Leave old channel
    if (prevId && prevId !== channel.id && s?.connected) {
      s.emit('leave_channel', prevId);
    }

    // Update ref before any async work so callbacks always see current channel
    channelIdRef.current = channel.id;

    // Reset state
    messagesRef.current = [];
    setMessages([]);
    setTyping([]);
    setLoading(true);

    // Join new channel
    if (s?.connected) {
      s.emit('join_channel', channel.id);
    }
    // If not connected yet, the 'connect' handler will join once ready

    // Load history
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/messages?channelId=${channel.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d = await res.json();
        if (d.success) {
          messagesRef.current = d.messages || [];
          setMessages(d.messages || []);
        }
      } catch {}
      finally { setLoading(false); }
    };

    load();
  }, [channel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── SEND ───────────────────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    clearTimeout(typingTimer.current);
    setInput('');

    const s = socketRef.current;

    if (s?.connected) {
      // Optimistically add own message immediately
      const optimistic = {
        id: `tmp_${Date.now()}`,
        channelId: channel.id,
        userId: user.id,
        userName: user.name || user.email || 'You',
        message: text,
        attachment: null,
        isEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addMessage(optimistic);

      s.emit('send_message', { channelId: channel.id, message: text });
      s.emit('stop_typing', { channelId: channel.id });

      // Replace optimistic message with real one when server broadcasts back
      // The new_message handler deduplicates by id, so we need to swap the tmp entry
      const onConfirm = (msg) => {
        if (String(msg.channelId) !== String(channel.id)) return;
        messagesRef.current = messagesRef.current
          .filter(m => m.id !== optimistic.id)
          .concat(msg.id && !messagesRef.current.find(m => m.id === msg.id) ? [msg] : []);
        setMessages([...messagesRef.current]);
        s.off('new_message', onConfirm);
      };
      s.once('new_message', onConfirm);
    } else {
      // REST fallback
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ channelId: channel.id, message: text })
        });
        const d = await res.json();
        if (d.success) addMessage(d.message);
      } catch {}
    }

    setSending(false);
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    const s = socketRef.current;
    if (!s?.connected) return;
    s.emit('typing', { channelId: channel.id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      s.emit('stop_typing', { channelId: channel.id });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // Group consecutive messages by same user
  const grouped = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1];
    const isFirst = !prev || String(prev.userId) !== String(msg.userId) ||
      (new Date(msg.createdAt) - new Date(prev.createdAt)) > 5 * 60 * 1000;
    acc.push({ ...msg, isFirst });
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#060d0e]">
        <span className="text-lg">{TI[channel.type] || '#'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {channel.type === 'direct' ? channel.name : `#${channel.name}`}
          </p>
          {channel.description && (
            <p className="text-[10px] text-white/30 truncate">{channel.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-white/20'}`}/>
          <span className="text-[10px] text-white/20">{channel.member_count || 0} members</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <svg className="w-6 h-6 animate-spin text-[#1A656D]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-xl bg-[#1A656D]/10 flex items-center justify-center text-2xl mb-3">
              {TI[channel.type] || '#'}
            </div>
            <p className="text-white/40 font-semibold text-sm">No messages yet</p>
            <p className="text-white/20 text-xs mt-1">Be the first to say something</p>
          </div>
        ) : (
          grouped.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.isFirst ? 'mt-3' : 'mt-0.5'}`}>
              {msg.isFirst ? (
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${av(msg.userId)} flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 mt-0.5`}>
                  {ini(msg.userName)}
                </div>
              ) : (
                <div className="w-7 flex-shrink-0"/>
              )}
              <div className="flex-1 min-w-0">
                {msg.isFirst && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`text-[12px] font-semibold ${String(msg.userId) === String(user.id) ? 'text-[#7dd3d8]' : 'text-white/80'}`}>
                      {String(msg.userId) === String(user.id) ? 'You' : msg.userName}
                    </span>
                    <span className="text-[9px] text-white/20">{fmtTime(msg.createdAt)}</span>
                  </div>
                )}
                <p className="text-[13px] text-white/70 leading-relaxed break-words whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <div className="flex gap-0.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}/>
              ))}
            </div>
            <span className="text-[10px] text-white/30">
              {typing.join(', ')} {typing.length === 1 ? 'is' : 'are'} typing…
            </span>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/[0.06]">
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${channel.type === 'direct' ? channel.name : '#' + channel.name}…`}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#1A656D]/50 transition"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A656D] to-[#31747c] flex items-center justify-center text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
