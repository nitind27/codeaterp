'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import Chat from '../../components/Chat';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function DiscussionsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: '',
    type: 'general',
    description: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/channels', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setChannels(data.channels);
        
        // Auto-select first channel or general channel
        if (data.channels.length > 0 && !selectedChannel) {
          const generalChannel = data.channels.find(c => c.type === 'general') || data.channels[0];
          setSelectedChannel(generalChannel);
        }
      }
    } catch (error) {
      console.error('Error loading channels:', error);
      toast.error('Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newChannel)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Channel created successfully!');
        setShowCreateModal(false);
        setNewChannel({ name: '', type: 'general', description: '' });
        await loadChannels();
        setSelectedChannel(data.channel);
      } else {
        toast.error(data.error || 'Failed to create channel');
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      toast.error('Failed to create channel');
    }
  };

  const handleJoinChannel = async (channelId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/channels/${channelId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Joined channel successfully!');
        await loadChannels();
      } else {
        toast.error(data.error || 'Failed to join channel');
      }
    } catch (error) {
      console.error('Error joining channel:', error);
      toast.error('Failed to join channel');
    }
  };

  if (loading || !user) {
    return <LogoLoader />;
  }

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">Discussions</h1>
            <p className="text-codeat-gray text-lg">Real-time group discussions and chat</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Channel
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)]">
          {/* Channels Sidebar */}
          <div className="lg:col-span-1 bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-4 lg:p-6 overflow-y-auto shadow-xl">
            <h2 className="text-xl font-bold text-codeat-silver mb-4">Channels</h2>
            <div className="space-y-2">
              {channels.length === 0 ? (
                <div className="text-codeat-gray text-sm text-center py-8">
                  No channels available
                </div>
              ) : (
                channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      if (!channel.is_member) {
                        handleJoinChannel(channel.id);
                      } else {
                        setSelectedChannel(channel);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-300 ${
                      selectedChannel?.id === channel.id
                        ? 'bg-gradient-to-r from-codeat-teal to-codeat-teal/80 text-codeat-accent shadow-lg'
                        : channel.is_member
                        ? 'bg-codeat-dark/50 text-codeat-silver hover:bg-codeat-dark border border-codeat-muted/30'
                        : 'bg-codeat-dark/30 text-codeat-gray hover:bg-codeat-dark/50 border border-codeat-muted/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">#{channel.name}</span>
                      {!channel.is_member && (
                        <span className="text-xs bg-codeat-muted px-2 py-0.5 rounded-full">Join</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-codeat-gray">
                      <span className="capitalize">{channel.type}</span>
                      <span>•</span>
                      <span>{channel.member_count || 0} members</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 bg-codeat-mid rounded-2xl border border-codeat-muted/30 overflow-hidden shadow-xl">
            {selectedChannel ? (
              <Chat 
                channel={selectedChannel} 
                user={user}
                onChannelChange={setSelectedChannel}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-30">💬</div>
                  <p className="text-codeat-gray text-xl font-semibold mb-2">Select a channel</p>
                  <p className="text-codeat-gray text-sm">Choose a channel from the sidebar to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Channel Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md modal-backdrop flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/50 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
              <div className="sticky top-0 bg-codeat-mid border-b border-codeat-muted/30 p-6 backdrop-blur-sm z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-codeat-silver mb-1">Create Channel</h2>
                    <p className="text-codeat-gray text-sm">Start a new discussion channel</p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 hover:bg-codeat-muted/50 rounded-lg transition text-codeat-gray hover:text-codeat-silver"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleCreateChannel} className="p-6 lg:p-8 space-y-6">
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                    Channel Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                    className="input-field"
                    placeholder="e.g., General, Project Alpha"
                    required
                  />
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                    Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={newChannel.type}
                    onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="general">General</option>
                    <option value="department">Department</option>
                    <option value="project">Project</option>
                  </select>
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                    Description
                  </label>
                  <textarea
                    value={newChannel.description}
                    onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                    className="input-field"
                    rows="3"
                    placeholder="What is this channel about?"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-codeat-muted/30">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95"
                  >
                    Create Channel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3.5 bg-codeat-muted/50 text-codeat-silver rounded-xl hover:bg-codeat-muted transition-all duration-300 font-semibold border border-codeat-muted/30"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

