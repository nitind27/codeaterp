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

// Chat receives the shared socket from DiscussionsPage
export default function Chat({ channel, user, socket, socketReady }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  // typing: Map of userId -> userName
  const [typing, setTyping]     = useState(new Map());

  const bottomRef    = useRef(null);
  const typingTimer  = useRef(null);
  const msgsRef      = useRef([]); // mirror for dedup in callbacks

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
  }, []);

  // ── Load history whenever channel changes ─────────────────────────────────
  useEffect(() => {
    msgsRef.current = [];
    setMessages([]);
    setTyping(new Map());
    setLoading(true);

    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/messages?channelId=${channel.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        if (d.success) {
          msgsRef.current = d.messages || [];
          setMessages(d.messages || []);
        }
      } catch (e) {
        console.error('Load messages error', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [channel.id]);

  // ── Join/leave channel room via shared socket ─────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const join = () => socket.emit('join_channel', channel.id);

    if (socket.connected) {
      join();
    }
    // Also join on reconnect while this channel is open
    socket.on('connect', join);

    return () => {
      socket.off('connect', join);
      socket.emit('leave_channel', channel.id);
    };
  }, [channel.id, socket]);

  // ── Listen for new messages on shared socket ──────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg) => {
      // Only handle messages for this channel
      if (String(msg.channelId) !== String(channel.id)) return;
      // Dedup: skip if already in list (handles own optimistic messages)
      if (msgsRef.current.find(m => String(m.id) === String(msg.id))) return;
      msgsRef.current = [...msgsRef.current, msg];
      setMessages([...msgsRef.current]);
      // Clear typing indicator for whoever just sent
      setTyping(prev => {
        const next = new Map(prev);
        next.delete(String(msg.userId));
        return next;
      });
    };

    const onTyping = (d) => {
      if (String(d.channelId) !== String(channel.id)) return;
      if (String(d.userId) === String(user.id)) return;
      setTyping(prev => {
        const next = new Map(prev);
        next.set(String(d.userId), d.userName);
        return next;
      });
    };

    const onStopTyping = (d) => {
      if (String(d.channelId) !== String(channel.id)) return;
      setTyping(prev => {
        const next = new Map(prev);
        next.delete(String(d.userId));
        return next;
      });
    };

    socket.on('new_message',      onMessage);
    socket.on('user_typing',      onTyping);
    socket.on('user_stop_typing', onStopTyping);

    return () => {
      socket.off('new_message',      onMessage);
      socket.off('user_typing',      onTyping);
      socket.off('user_stop_typing', onStopTyping);
    };
  }, [channel.id, socket, user.id]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput('');
    clearTimeout(typingTimer.current);

    if (socket?.connected) {
      // Optimistic: show message immediately
      const tmpId = `tmp_${Date.now()}`;
      const optimistic = {
        id: tmpId,
        channelId: channel.id,
        userId: user.id,
        userName: user.name || user.fullName || user.email || 'You',
        message: text,
        attachment: null,
        isEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      msgsRef.current = [...msgsRef.current, optimistic];
      setMessages([...msgsRef.current]);

      socket.emit('send_message', { channelId: channel.id, message: text });
      socket.emit('stop_typing',  { channelId: channel.id });
      // When server confirms, replace tmp with real message
      const onConfirm = (msg) => {
        if (String(msg.channelId) !== String(channel.id)) return;
        msgsRef.current = msgsRef.current
          .filter(m => m.id !== tmpId)
          .concat(msgsRef.current.find(m => String(m.id) === String(msg.id)) ? [] : [msg]);
        setMessages([...msgsRef.current]);
        socket.off('new_message', onConfirm);
      };
      socket.once('new_message', onConfirm);
    } else {
      // REST fallback when socket not connected
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ channelId: channel.id, message: text }),
        });
        const d = await res.json();
        if (d.success && d.message) {
          msgsRef.current = [...msgsRef.current, d.message];
          setMessages([...msgsRef.current]);
        }
      } catch (e) {
        console.error('Send via REST failed', e);
      }
    }

    setSending(false);
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!socket?.connected) return;
    socket.emit('typing', { channelId: channel.id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('stop_typing', { channelId: channel.id });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // Group consecutive messages by same user (within 5 min)
  const grouped = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1];
    const isFirst = !prev
      || String(prev.userId) !== String(msg.userId)
      || (new Date(msg.createdAt) - new Date(prev.createdAt)) > 5 * 60 * 1000;
    acc.push({ ...msg, isFirst });
    return acc;
  }, []);

  const isMe = (id) => String(id) === String(user.id);

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
          <span className={`w-1.5 h-1.5 rounded-full transition-colors ${socketReady ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`}/>
          <span className="text-[10px] text-white/20">
            {socketReady ? `${channel.member_count || 0} members` : 'connecting…'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
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
          <div className="space-y-0.5">
            {grouped.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.isFirst ? 'mt-4' : 'mt-0.5'}`}>
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
                      <span className={`text-[12px] font-semibold ${isMe(msg.userId) ? 'text-[#7dd3d8]' : 'text-white/80'}`}>
                        {isMe(msg.userId) ? 'You' : msg.userName}
                      </span>
                      <span className="text-[9px] text-white/20">{fmtTime(msg.createdAt)}</span>
                      {String(msg.id).startsWith('tmp_') && (
                        <span className="text-[9px] text-white/20 italic">sending…</span>
                      )}
                    </div>
                  )}
                  <p className={`text-[13px] leading-relaxed break-words whitespace-pre-wrap ${String(msg.id).startsWith('tmp_') ? 'text-white/40' : 'text-white/70'}`}>
                    {msg.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {typing.size > 0 && (
          <div className="flex items-center gap-2 mt-3 px-1">
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}/>
              ))}
            </div>
            <span className="text-[10px] text-white/30">
              {[...typing.values()].join(', ')} {typing.size === 1 ? 'is' : 'are'} typing…
            </span>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/[0.06]">
        {!socketReady && (
          <p className="text-[10px] text-amber-400/70 mb-2 text-center">
            Reconnecting… messages will be sent via fallback
          </p>
        )}
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
            {sending
              ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
