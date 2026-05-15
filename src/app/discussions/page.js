'use client';

import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import Chat from '../../components/Chat';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const ini = (n) => n ? n.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() : '?';
const AV = ['from-[#1A656D] to-[#31747c]','from-purple-600 to-violet-500','from-blue-600 to-sky-500','from-emerald-600 to-green-500','from-amber-500 to-orange-400','from-rose-500 to-pink-500'];
const av = (id) => AV[(id || 0) % AV.length];
const TI = { general:'🌐', department:'🏢', project:'📁', direct:'👤' };

export default function DiscussionsPage() {
  const router = useRouter();
  const [user, setUser]             = useState(null);
  const [channels, setChannels]     = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('channels');
  const [search, setSearch]         = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newCh, setNewCh]           = useState({ name: '', type: 'general', description: '' });
  const [creating, setCreating]     = useState(false);
  const [online, setOnline]         = useState(new Set());
  const socketRef                   = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const ud = localStorage.getItem('user');
    if (!token || !ud) { router.push('/login'); return; }
    const u = JSON.parse(ud);
    setUser(u);
    loadAll(token);
    initSocket(token);
  }, []);

  const initSocket = async (token) => {
    try {
      const { io } = await import('socket.io-client');
      const s = io(window.location.origin, { auth: { token }, transports: ['websocket','polling'] });
      socketRef.current = s;
      s.on('user_online',  d => setOnline(p => new Set([...p, d.userId])));
      s.on('user_offline', d => setOnline(p => { const n = new Set(p); n.delete(d.userId); return n; }));
    } catch {}
  };

  const loadAll = async (token) => {
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/channels', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      if (d1.success) {
        setChannels(d1.channels);
        // Only auto-select on first load (when nothing is selected yet)
        setSelected(prev => {
          if (prev) return prev;
          return d1.channels.find(c => c.type === 'general' && c.is_member)
            || d1.channels.find(c => c.is_member)
            || null;
        });
      }
      if (d2.success) setEmployees(d2.employees || []);
      // employees API may return 403 for non-admin roles — that's fine, DM tab will just show empty people list
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const joinChannel = async (id) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/channels/${id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    if (d.success) { toast.success('Joined!'); loadAll(token); }
    else toast.error(d.error || 'Failed');
  };

  const createChannel = async (e) => {
    e.preventDefault(); setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newCh)
      });
      const d = await res.json();
      if (d.success) {
        toast.success('Channel created!');
        setShowCreate(false); setNewCh({ name: '', type: 'general', description: '' });
        await loadAll(token); setSelected(d.channel); setTab('channels');
      } else toast.error(d.error || 'Failed');
    } catch { toast.error('Error'); }
    finally { setCreating(false); }
  };

  const openDM = async (emp) => {
    const token = localStorage.getItem('token');
    const ex = channels.find(c => c.type === 'direct' && c.name === emp.fullName);
    if (ex) { setSelected(ex); return; }
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: emp.fullName, type: 'direct', description: `DM with ${emp.fullName}`, dm_user_id: emp.userId })
      });
      const d = await res.json();
      if (d.success) { await loadAll(token); setSelected(d.channel); }
      else toast.error(d.error || 'Failed to open DM');
    } catch { toast.error('Error'); }
  };

  if (loading || !user) return <LogoLoader />;

  const groupChs = channels.filter(c => c.type !== 'direct');
  const dmChs    = channels.filter(c => c.type === 'direct');
  const filtChs  = groupChs.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const filtEmps = employees.filter(e => e.userId !== user.id && e.fullName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout user={user}>
      <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8 flex bg-[#050c0d] rounded-xl overflow-hidden border border-white/[0.06]" style={{height:'calc(100vh - 130px)'}}>

        {/* ── SIDEBAR ── */}
        <div className="w-60 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#060d0e]">
          {/* top */}
          <div className="flex-shrink-0 px-3 py-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[14px] font-bold text-white">Discussions</span>
              <button onClick={() => setShowCreate(true)}
                className="w-6 h-6 rounded-md bg-[#1A656D]/20 text-[#7dd3d8] hover:bg-[#1A656D]/30 transition flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              </button>
            </div>
            <div className="relative mb-2">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/15 transition"/>
            </div>
            <div className="flex gap-1">
              {['channels','dms'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all ${tab===t ? 'bg-[#1A656D]/20 text-[#7dd3d8]' : 'text-white/30 hover:text-white/55 hover:bg-white/[0.03]'}`}>
                  {t === 'channels' ? '# Channels' : '💬 Direct'}
                </button>
              ))}
            </div>
          </div>

          {/* list */}
          <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
            {tab === 'channels' ? (
              filtChs.length === 0
                ? <p className="text-white/20 text-[10px] text-center py-8">No channels</p>
                : filtChs.map(ch => {
                    const act = selected?.id === ch.id;
                    return (
                      <button key={ch.id} onClick={() => ch.is_member ? setSelected(ch) : joinChannel(ch.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all group ${act ? 'bg-[#1A656D]/20 border border-[#1A656D]/25' : 'hover:bg-white/[0.04] border border-transparent'}`}>
                        <span className="text-sm flex-shrink-0">{TI[ch.type]||'#'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-semibold truncate ${act ? 'text-white' : 'text-white/55 group-hover:text-white/80'}`}>#{ch.name}</p>
                          <p className="text-[9px] text-white/20">{ch.member_count||0} members</p>
                        </div>
                        {!ch.is_member && <span className="text-[8px] font-bold text-[#7dd3d8] bg-[#1A656D]/20 px-1 py-0.5 rounded-full">Join</span>}
                      </button>
                    );
                  })
            ) : (
              <>
                {dmChs.length > 0 && (
                  <>
                    <p className="px-2 pt-1 pb-0.5 text-[8px] font-bold uppercase tracking-widest text-white/20">Recent</p>
                    {dmChs.map(ch => {
                      const act = selected?.id === ch.id;
                      return (
                        <button key={ch.id} onClick={() => setSelected(ch)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all group ${act ? 'bg-[#1A656D]/20 border border-[#1A656D]/25' : 'hover:bg-white/[0.04] border border-transparent'}`}>
                          <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${av(ch.id)} flex items-center justify-center text-white font-bold text-[9px] flex-shrink-0`}>{ini(ch.name)}</div>
                          <p className={`text-[11px] font-semibold truncate flex-1 ${act ? 'text-white' : 'text-white/55 group-hover:text-white/80'}`}>{ch.name}</p>
                        </button>
                      );
                    })}
                    <div className="h-px bg-white/[0.04] my-1"/>
                  </>
                )}
                <p className="px-2 pt-1 pb-0.5 text-[8px] font-bold uppercase tracking-widest text-white/20">People</p>
                {filtEmps.length === 0
                  ? <p className="text-white/20 text-[10px] text-center py-6">No people found</p>
                  : filtEmps.map(emp => (
                    <button key={emp.id} onClick={() => openDM(emp)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/[0.04] border border-transparent transition-all group">
                      <div className="relative flex-shrink-0">
                        <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${av(emp.id)} flex items-center justify-center text-white font-bold text-[9px]`}>{ini(emp.fullName)}</div>
                        {online.has(emp.userId) && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#060d0e]"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-white/55 group-hover:text-white/80 truncate transition-colors">{emp.fullName}</p>
                        <p className="text-[9px] text-white/20 truncate capitalize">{emp.role?.replace('_',' ')}</p>
                      </div>
                    </button>
                  ))
                }
              </>
            )}
          </div>
        </div>

        {/* ── CHAT ── */}
        <div className="flex-1 min-w-0">
          {selected
            ? <Chat channel={selected} user={user}/>
            : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#1A656D]/10 flex items-center justify-center mx-auto mb-4 text-3xl">💬</div>
                  <p className="text-white/40 font-semibold mb-1">Select a channel or person</p>
                  <p className="text-white/20 text-sm">to start chatting</p>
                  <button onClick={() => setShowCreate(true)}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-[#1A656D] to-[#31747c] text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-95 transition-all">
                    Create Channel
                  </button>
                </div>
              </div>
            )
          }
        </div>
      </div>

      {/* ── CREATE MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A2A2D] rounded-2xl border border-white/[0.08] w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div>
                <h3 className="text-lg font-bold text-white">Create Channel</h3>
                <p className="text-white/30 text-sm mt-0.5">Start a new group discussion</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={createChannel} className="p-5 space-y-4">
              <div>
                <label className="block text-white/50 text-xs font-semibold mb-1.5 uppercase tracking-wider">Name <span className="text-red-400">*</span></label>
                <input type="text" value={newCh.name} onChange={e => setNewCh({...newCh, name: e.target.value})}
                  className="input-field py-2.5 text-sm" placeholder="e.g., general, project-alpha" required/>
              </div>
              <div>
                <label className="block text-white/50 text-xs font-semibold mb-1.5 uppercase tracking-wider">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['general','department','project'].map(t => (
                    <button key={t} type="button" onClick={() => setNewCh({...newCh, type: t})}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${newCh.type===t ? 'bg-[#1A656D]/20 text-[#7dd3d8] border-[#1A656D]/40' : 'text-white/35 border-white/[0.06] hover:border-white/15 hover:text-white/55'}`}>
                      {TI[t]} {t.charAt(0).toUpperCase()+t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-white/50 text-xs font-semibold mb-1.5 uppercase tracking-wider">Description</label>
                <textarea value={newCh.description} onChange={e => setNewCh({...newCh, description: e.target.value})}
                  className="input-field py-2.5 text-sm resize-none" rows={2} placeholder="What is this channel about?"/>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#1A656D] to-[#31747c] text-white rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {creating ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating…</> : 'Create Channel'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} disabled={creating}
                  className="flex-1 py-2.5 bg-white/[0.04] text-white/50 rounded-xl font-semibold hover:bg-white/[0.07] transition border border-white/[0.06] disabled:opacity-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
