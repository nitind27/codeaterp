'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export default function Chat({ channel, user, onChannelChange }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!channel || !user) return;

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login again');
      return;
    }

    // Dynamically import socket.io-client to avoid SSR issues
    const initSocket = async () => {
      try {
        const socketIO = await import('socket.io-client');
        const io = socketIO.io;
        
        // Initialize Socket.io connection
        const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'), {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling']
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
          console.log('Socket connected');
          setLoading(false);
          
          // Join channel
          newSocket.emit('join_channel', channel.id);
          
          // Load existing messages
          loadMessages();
        });

        newSocket.on('disconnect', () => {
          console.log('Socket disconnected');
          toast.error('Connection lost. Reconnecting...');
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          toast.error('Failed to connect to chat server');
          setLoading(false);
        });

        // Listen for new messages
        newSocket.on('new_message', (message) => {
          setMessages(prev => [...prev, message]);
          scrollToBottom();
        });

        // Listen for typing indicators
        newSocket.on('user_typing', (data) => {
          setTypingUsers(prev => {
            if (!prev.find(u => u.userId === data.userId)) {
              return [...prev, { userId: data.userId, userName: data.userName }];
            }
            return prev;
          });
        });

        newSocket.on('user_stop_typing', (data) => {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        });

        newSocket.on('error', (error) => {
          toast.error(error.message || 'An error occurred');
        });

        setSocket(newSocket);
      } catch (error) {
        console.error('Error initializing socket:', error);
        toast.error('Failed to initialize chat connection');
        setLoading(false);
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_channel', channel.id);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [channel?.id, user?.id]);

  const loadMessages = async () => {
    if (!channel?.id) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/messages?channelId=${channel.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    socket.emit('send_message', {
      channelId: channel.id,
      message: newMessage.trim()
    });

    setNewMessage('');
    
    // Clear typing indicator
    if (socket) {
      socket.emit('stop_typing', { channelId: channel.id });
    }
    clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!isTyping && socket) {
      setIsTyping(true);
      socket.emit('typing', { channelId: channel.id });
    }

    // Clear existing timeout
    clearTimeout(typingTimeoutRef.current);

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (socket) {
        socket.emit('stop_typing', { channelId: channel.id });
      }
      setIsTyping(false);
    }, 1000);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-codeat-gray">Connecting to chat...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-codeat-dark">
      {/* Chat Header */}
      <div className="bg-codeat-mid border-b border-codeat-muted/30 p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-codeat-silver mb-1">{channel.name}</h2>
            <p className="text-codeat-gray text-sm">{channel.description || 'Group discussion channel'}</p>
          </div>
          <div className="text-codeat-gray text-sm">
            {channel.member_count || 0} members
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4 opacity-30">💬</div>
              <p className="text-codeat-gray text-lg">No messages yet</p>
              <p className="text-codeat-gray text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.userId === user.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] lg:max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                  {!isOwnMessage && (
                    <div className="text-codeat-gray text-xs mb-1 px-2">
                      {msg.userName}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      isOwnMessage
                        ? 'bg-gradient-to-r from-codeat-accent to-codeat-teal text-white'
                        : 'bg-codeat-mid text-codeat-silver border border-codeat-muted/30'
                    }`}
                  >
                    <p className="text-sm lg:text-base break-words">{msg.message}</p>
                    <div className={`text-xs mt-1 ${isOwnMessage ? 'text-white/70' : 'text-codeat-gray'}`}>
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-codeat-gray text-sm italic">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-codeat-accent rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-codeat-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-codeat-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-codeat-mid border-t border-codeat-muted/30 p-4 lg:p-6">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 input-field"
            disabled={!socket}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !socket}
            className="px-6 py-3 bg-gradient-to-r from-codeat-accent to-codeat-teal text-white rounded-xl hover:from-codeat-accent/90 hover:to-codeat-teal/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-accent/30 hover:shadow-codeat-accent/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

