'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

/* ─── Role config ─────────────────────────────────────────────────────────── */
const RC = {
  admin:           { label:'Admin',           panel:'Admin Panel',      tagline:'Full system control — manage every module.',        sb:'from-[#071c1e] to-[#040f10]', act:'bg-[#1A656D]/20 border-[#1A656D]/50', dot:'bg-[#31747c]', badge:'bg-[#1A656D]/20 text-[#7dd3d8] border-[#1A656D]/40', av:'from-[#1A656D] to-[#31747c]', fl:[{l:'Reports',h:'/reports'},{l:'Settings',h:'/settings'},{l:'Employees',h:'/employees'}] },
  hr:              { label:'HR',              panel:'HR Panel',         tagline:'Manage people, attendance, leaves & more.',         sb:'from-[#130a1e] to-[#080410]', act:'bg-purple-600/20 border-purple-500/50', dot:'bg-purple-400', badge:'bg-purple-500/20 text-purple-300 border-purple-500/40', av:'from-purple-600 to-violet-500', fl:[{l:'Employees',h:'/employees'},{l:'Leave',h:'/leave'},{l:'Reports',h:'/reports'}] },
  project_manager: { label:'Project Manager', panel:'Project Panel',    tagline:'Track projects, tasks and your team.',              sb:'from-[#071018] to-[#040810]', act:'bg-blue-600/20 border-blue-500/50',   dot:'bg-blue-400',   badge:'bg-blue-500/20 text-blue-300 border-blue-500/40',     av:'from-blue-600 to-sky-500',     fl:[{l:'Projects',h:'/projects'},{l:'Tasks',h:'/tasks'},{l:'Team',h:'/team'}] },
  employee:        { label:'Employee',        panel:'Employee Portal',  tagline:'Your workspace — attendance, leave & tasks.',       sb:'from-[#071a0e] to-[#040f08]', act:'bg-emerald-600/20 border-emerald-500/50', dot:'bg-emerald-400', badge:'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', av:'from-emerald-600 to-green-500', fl:[{l:'Attendance',h:'/attendance'},{l:'Leave',h:'/leave'},{l:'Profile',h:'/profile'}] },
  intern:          { label:'Intern',          panel:'Intern Portal',    tagline:'Track your attendance, fees & tasks.',              sb:'from-[#1a1007] to-[#100904]', act:'bg-amber-600/20 border-amber-500/50',   dot:'bg-amber-400',   badge:'bg-amber-500/20 text-amber-300 border-amber-500/40',     av:'from-amber-500 to-orange-400', fl:[{l:'Attendance',h:'/attendance'},{l:'Fees',h:'/fees'},{l:'Profile',h:'/profile'}] },
};

/* ─── Nav icons ───────────────────────────────────────────────────────────── */
const IC = {
  '/dashboard':    <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="1.8"/></svg>,
  '/employees':    <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  '/projects':     <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>,
  '/attendance':   <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  '/leave':        <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  '/fees':         <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  '/holidays':     <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
  '/achievements': <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>,
  '/complaints':   <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
  '/reports':      <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  '/settings':     <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  '/discussions':  <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  '/tasks':        <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
  '/team':         <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
  '/profile':      <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  '/interviews':   <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
};

/* ─── Menus ───────────────────────────────────────────────────────────────── */
const MENUS = {
  admin: [
    { g:'Overview',    items:[{n:'Dashboard',p:'/dashboard'}] },
    { g:'People',      items:[{n:'Employees',p:'/employees'},{n:'Attendance',p:'/attendance'},{n:'Leave Management',p:'/leave'}] },
    { g:'Operations',  items:[{n:'Projects',p:'/projects'},{n:'Fees Management',p:'/fees'},{n:'Interviews',p:'/interviews'}] },
    { g:'Culture',     items:[{n:'Holidays',p:'/holidays'},{n:'Achievements',p:'/achievements'},{n:'Complaints',p:'/complaints'},{n:'Discussions',p:'/discussions'}] },
    { g:'System',      items:[{n:'Reports',p:'/reports'},{n:'Settings',p:'/settings'}] },
  ],
  hr: [
    { g:'Overview',    items:[{n:'Dashboard',p:'/dashboard'}] },
    { g:'People',      items:[{n:'Employees',p:'/employees'},{n:'Attendance',p:'/attendance'},{n:'Leave Management',p:'/leave'},{n:'Interviews',p:'/interviews'}] },
    { g:'Operations',  items:[{n:'Fees Management',p:'/fees'}] },
    { g:'Culture',     items:[{n:'Holidays',p:'/holidays'},{n:'Achievements',p:'/achievements'},{n:'Complaints',p:'/complaints'},{n:'Discussions',p:'/discussions'}] },
    { g:'Reports',     items:[{n:'Reports',p:'/reports'}] },
  ],
  project_manager: [
    { g:'Overview',    items:[{n:'Dashboard',p:'/dashboard'}] },
    { g:'Work',        items:[{n:'Projects',p:'/projects'},{n:'Tasks',p:'/tasks'},{n:'Team',p:'/team'}] },
    { g:'Connect',     items:[{n:'Discussions',p:'/discussions'}] },
  ],
  employee: [
    { g:'Overview',    items:[{n:'Dashboard',p:'/dashboard'}] },
    { g:'My Work',     items:[{n:'Attendance',p:'/attendance'},{n:'Leave',p:'/leave'},{n:'Tasks',p:'/tasks'}] },
    { g:'Company',     items:[{n:'Holidays',p:'/holidays'},{n:'Achievements',p:'/achievements'},{n:'Complaints',p:'/complaints'},{n:'Discussions',p:'/discussions'}] },
    { g:'Account',     items:[{n:'Profile',p:'/profile'}] },
  ],
  intern: [
    { g:'Overview',    items:[{n:'Dashboard',p:'/dashboard'}] },
    { g:'My Work',     items:[{n:'Attendance',p:'/attendance'},{n:'Leave',p:'/leave'},{n:'Tasks',p:'/tasks'}] },
    { g:'Finance',     items:[{n:'Fees & Receipts',p:'/fees'}] },
    { g:'Company',     items:[{n:'Holidays',p:'/holidays'},{n:'Achievements',p:'/achievements'},{n:'Discussions',p:'/discussions'}] },
    { g:'Account',     items:[{n:'Profile',p:'/profile'}] },
  ],
};

/* ─── Component ───────────────────────────────────────────────────────────── */
export default function Layout({ children, user }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const role  = user?.role || 'employee';
  const cfg   = RC[role] || RC.employee;
  const groups = MENUS[role] || MENUS.employee;
  const allItems = groups.flatMap(g => g.items);
  const active   = allItems.find(i => i.p === pathname);

  const displayName = user?.employee?.fullName || user?.email || 'User';
  const firstName   = user?.employee?.firstName || displayName.split(' ')[0] || 'there';
  const initials    = displayName.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase();
  const designation = user?.employee?.designation || cfg.label;
  const department  = user?.employee?.department  || '';

  /* session validation */
  const validateSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res  = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.status === 401 && data.sessionExpired) {
        ['token','sessionToken','user'].forEach(k => localStorage.removeItem(k));
        toast.error('Logged out — another device signed in.', { duration: 5000, icon: '🔐' });
        router.push('/login?sessionExpired=true');
      }
    } catch {}
  }, [router]);

  useEffect(() => {
    if (pathname === '/login' || pathname === '/register') return;
    validateSession();
    const iv = setInterval(validateSession, 30000);
    const onVis = () => { if (document.visibilityState === 'visible') validateSession(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  }, [pathname, validateSession]);

  const logout = () => {
    ['token','sessionToken','user'].forEach(k => localStorage.removeItem(k));
    router.push('/login');
  };

  if (pathname === '/login' || pathname === '/register') return <>{children}</>;

  return (
    <div className="h-screen overflow-hidden bg-[#050c0d] text-[#b8cdd0] flex">

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className={`
        ${open ? 'translate-x-0' : '-translate-x-full'}
        fixed inset-y-0 left-0 z-40 w-60
        lg:static lg:translate-x-0 lg:flex-shrink-0
        flex flex-col h-full
        transition-transform duration-300 ease-in-out
        bg-gradient-to-b ${cfg.sb}
        border-r border-white/[0.06]
      `}>

        {/* logo */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06] flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.av} flex items-center justify-center text-white font-bold text-xs shadow-md`}>CI</div>
            <div className="leading-tight">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">{cfg.label}</p>
              <p className="text-[13px] font-bold text-white">Codeat ERP</p>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1 rounded-md text-white/30 hover:text-white hover:bg-white/10 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          {groups.map(grp => (
            <div key={grp.g}>
              <p className="px-2 mb-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-white/20 select-none">{grp.g}</p>
              {grp.items.map(item => {
                const isAct = pathname === item.p;
                return (
                  <Link key={item.p} href={item.p} onClick={() => setOpen(false)}
                    className={`
                      flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium
                      transition-all duration-150 group relative
                      ${isAct
                        ? `${cfg.act} border text-white`
                        : 'text-white/45 hover:text-white/85 hover:bg-white/[0.06] border border-transparent'}
                    `}>
                    {isAct && <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full ${cfg.dot}`}/>}
                    <span className={`flex-shrink-0 ${isAct ? 'text-white' : 'text-white/30 group-hover:text-white/60'} transition-colors`}>
                      {IC[item.p] || IC['/dashboard']}
                    </span>
                    <span className="truncate">{item.n}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* user card */}
        <div className="flex-shrink-0 px-2 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg bg-white/[0.04] mb-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.av} flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0 shadow`}>{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">{displayName}</p>
              <p className="text-[10px] text-white/35 truncate capitalize mt-0.5">{role.replace('_',' ')}{department ? ` · ${department}` : ''}</p>
            </div>
          </div>
          <button onClick={logout}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-r ${cfg.av} hover:opacity-90 active:scale-[0.98] transition-all`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">

        {/* topbar */}
        <header className="flex-shrink-0 border-b border-white/[0.06] bg-[#060d0e]/90 backdrop-blur-xl">

          {/* top row: hamburger + right controls */}
          <div className="flex items-center gap-3 px-4 h-14">
            {/* hamburger */}
            <button onClick={() => setOpen(p => !p)}
              className="lg:hidden p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:bg-white/[0.06] transition flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>

            {/* spacer */}
            <div className="flex-1"/>

            {/* right controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* search */}
              <div className="relative hidden lg:block">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
                <input type="text" placeholder="Search…" className="w-44 pl-8 pr-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition"/>
              </div>

              {/* bell */}
              <button className="p-1.5 rounded-lg border border-white/10 text-white/35 hover:text-white hover:bg-white/[0.06] transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              </button>

              {/* avatar */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cfg.av} flex items-center justify-center text-white font-bold text-[10px] shadow`}>{initials}</div>
                <div className="hidden md:block leading-tight">
                  <p className="text-[12px] font-semibold text-white">{firstName}</p>
                  <p className="text-[10px] text-white/30 capitalize">{designation}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── BREADCRUMB BAR ── */}
          <div className="relative px-4 py-3 border-t border-white/[0.04] overflow-hidden">
            {/* subtle gradient bg tinted by role */}
            <div className={`absolute inset-0 bg-gradient-to-r ${cfg.sb} opacity-60`}/>
            {/* left accent line */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${cfg.av}`}/>

            <div className="relative flex items-center gap-2 flex-wrap">
              {/* home crumb */}
              <Link href="/dashboard"
                className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 hover:text-white/80 transition-colors group">
                <svg className="w-3.5 h-3.5 group-hover:text-white/70 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                Home
              </Link>

              {/* separator */}
              <svg className="w-3 h-3 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>

              {/* panel badge */}
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md border ${cfg.badge}`}>
                {cfg.panel}
              </span>

              {/* separator — only if not on dashboard */}
              {active && active.p !== '/dashboard' && (
                <>
                  <svg className="w-3 h-3 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>

                  {/* current page crumb with icon */}
                  <span className="flex items-center gap-1.5">
                    <span className="text-white/50">{IC[active.p]}</span>
                    <span className="text-[13px] font-bold text-white">{active.n}</span>
                  </span>
                </>
              )}

              {/* right side: tagline */}
              <span className="ml-auto text-[11px] text-white/25 hidden sm:block italic">{cfg.tagline}</span>
            </div>
          </div>
        </header>

        {/* page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* footer */}
        <footer className="flex-shrink-0 h-9 flex items-center justify-between px-5 border-t border-white/[0.05] bg-[#060d0e]/60 text-[11px] text-white/20">
          <span>© {new Date().getFullYear()} Codeat Infotech</span>
          <div className="flex items-center gap-4">
            {cfg.fl.map(l => (
              <Link key={l.h} href={l.h} className="hover:text-white/60 transition-colors">{l.l}</Link>
            ))}
          </div>
        </footer>
      </div>

      {/* mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}/>}
    </div>
  );
}
