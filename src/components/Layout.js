'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Layout({ children, user }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const menuItems = {
    admin: [
      { name: 'Dashboard', path: '/dashboard', icon: '📊' },
      { name: 'Employees', path: '/employees', icon: '👥' },
      { name: 'Projects', path: '/projects', icon: '📁' },
      { name: 'Attendance', path: '/attendance', icon: '⏰' },
      { name: 'Leave Management', path: '/leave', icon: '📅' },
      { name: 'Holidays', path: '/holidays', icon: '🎉' },
      { name: 'Achievements', path: '/achievements', icon: '🏆' },
      { name: 'Complaints', path: '/complaints', icon: '📝' },
      { name: 'Reports', path: '/reports', icon: '📈' },
      { name: 'Settings', path: '/settings', icon: '⚙️' },
      { name: 'Discussions', path: '/discussions', icon: '💬' }
    ],
    hr: [
      { name: 'Dashboard', path: '/dashboard', icon: '📊' },
      { name: 'Employees', path: '/employees', icon: '👥' },
      { name: 'Attendance', path: '/attendance', icon: '⏰' },
      { name: 'Leave Management', path: '/leave', icon: '📅' },
      { name: 'Holidays', path: '/holidays', icon: '🎉' },
      { name: 'Achievements', path: '/achievements', icon: '🏆' },
      { name: 'Complaints', path: '/complaints', icon: '📝' },
      { name: 'Interviews', path: '/interviews', icon: '🎯' },
      { name: 'Reports', path: '/reports', icon: '📈' },
      { name: 'Discussions', path: '/discussions', icon: '💬' },
      { name: 'Holidays', path: '/holidays', icon: '🎉' },
      { name: 'Achievements', path: '/achievements', icon: '🏆' }
    ],
    project_manager: [
      { name: 'Dashboard', path: '/dashboard', icon: '📊' },
      { name: 'Projects', path: '/projects', icon: '📁' },
      { name: 'Tasks', path: '/tasks', icon: '✅' },
      { name: 'Team', path: '/team', icon: '👥' },
      { name: 'Discussions', path: '/discussions', icon: '💬' }
    ],
    employee: [
      { name: 'Dashboard', path: '/dashboard', icon: '📊' },
      { name: 'Attendance', path: '/attendance', icon: '⏰' },
      { name: 'Leave', path: '/leave', icon: '📅' },
      { name: 'Holidays', path: '/holidays', icon: '🎉' },
      { name: 'Achievements', path: '/achievements', icon: '🏆' },
      { name: 'Tasks', path: '/tasks', icon: '✅' },
      { name: 'Complaints', path: '/complaints', icon: '📝' },
      { name: 'Profile', path: '/profile', icon: '👤' },
      { name: 'Discussions', path: '/discussions', icon: '💬' }
    ],
    intern: [
      { name: 'Dashboard', path: '/dashboard', icon: '📊' },
      { name: 'Attendance', path: '/attendance', icon: '⏰' },
      { name: 'Leave', path: '/leave', icon: '📅' },
      { name: 'Holidays', path: '/holidays', icon: '🎉' },
      { name: 'Achievements', path: '/achievements', icon: '🏆' },
      { name: 'Tasks', path: '/tasks', icon: '✅' },
      { name: 'Profile', path: '/profile', icon: '👤' },
      { name: 'Discussions', path: '/discussions', icon: '💬' }
    ]
  };

  const items = menuItems[user?.role] || [];
  const activeItem = items.find((item) => item.path === pathname);

  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  const fallbackName = user?.employee?.fullName || user?.email || 'User';
  const initials = fallbackName
    .split(' ')
    .map((chunk) => chunk.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const statusHighlights = [
    { label: 'Role', value: user?.role?.replace('_', ' ') || 'User' },
    { label: 'Modules', value: `${items.length} enabled` },
    { label: 'Account', value: user?.employee?.department || 'General' }
  ];
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_65%)] text-codeat-silver">
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } glass-panel fixed inset-y-0 left-0 z-40 w-72 border-r border-white/5 bg-slate-950/80 px-5 py-6 transition-transform duration-300 lg:static lg:translate-x-0`}
        >
          <div className="flex h-full flex-col gap-6">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-codeat-teal to-codeat-accent text-lg font-bold text-slate-900 shadow-lg shadow-codeat-teal/40">
                  CI
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-codeat-gray">Admin</p>
                  <p className="text-base font-semibold text-codeat-silver">Codeat ERP</p>
                </div>
              </Link>
              <button
                className="lg:hidden rounded-xl border border-white/10 p-2 text-codeat-gray hover:text-codeat-silver"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-codeat-gray shadow-inner shadow-black/30">
              <p className="text-xs uppercase tracking-[0.35em] text-codeat-gray/80">Overview</p>
              <p className="text-codeat-silver font-semibold">Control and monitor every module from one place.</p>
            </div>

            <nav className="flex-1 overflow-y-auto">
              <p className="mb-3 text-[11px] uppercase tracking-[0.45em] text-codeat-gray/70">Navigation</p>
              <div className="space-y-1.5">
                {items.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition-all ${
                        isActive
                          ? 'border-codeat-teal/50 bg-white/10 text-white shadow-lg shadow-codeat-teal/30'
                          : 'border-transparent text-codeat-gray hover:border-white/10 hover:bg-white/5 hover:text-codeat-silver'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                          isActive
                            ? 'bg-gradient-to-br from-codeat-teal to-codeat-accent text-slate-900'
                            : 'bg-slate-900/70 text-codeat-gray group-hover:text-codeat-silver'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-codeat-teal shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="rounded-3xl border border-white/5 bg-white/5 p-4 shadow-lg shadow-black/30">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-codeat-accent to-codeat-teal text-base font-bold text-slate-900 shadow-lg shadow-codeat-accent/30">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-codeat-silver">{fallbackName}</p>
                  <p className="truncate text-xs uppercase tracking-wide text-codeat-gray">
                    {user?.role?.replace('_', ' ') || 'User'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full rounded-2xl bg-gradient-to-r from-codeat-accent to-codeat-teal px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-codeat-accent/30 hover:scale-[1.02] active:scale-95"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/70 backdrop-blur-2xl">
            <div className="flex flex-wrap items-center gap-4 px-5 py-4">
              <button
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="rounded-2xl border border-white/10 p-2 text-codeat-gray hover:text-codeat-silver lg:hidden"
                aria-label="Toggle sidebar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.45em] text-codeat-gray/80">Admin Panel</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold text-codeat-silver">
                    {activeItem?.name || 'Dashboard'}
                  </h1>
                  <span className="chip bg-white/10 text-[11px] uppercase tracking-widest text-codeat-gray">
                    {user?.role?.replace('_', ' ') || 'User'}
                  </span>
                </div>
                <p className="text-sm text-codeat-gray">
                  Welcome back, {user?.employee?.firstName || 'there'}! Take control of today’s operations.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative hidden min-w-[220px] md:block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-codeat-gray">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search modules, employees, tasks..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-codeat-silver placeholder:text-codeat-gray focus:border-codeat-teal focus:outline-none"
                  />
                </div>
                <button className="rounded-2xl border border-white/10 p-2.5 text-codeat-gray hover:border-codeat-teal/40 hover:text-codeat-silver">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 0 1-6 0v-1m6 0H9"
                    />
                  </svg>
                </button>
                <button className="rounded-2xl border border-white/10 p-2.5 text-codeat-gray hover:border-codeat-teal/40 hover:text-codeat-silver">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                  </svg>
                </button>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-codeat-accent to-codeat-teal text-sm font-bold text-slate-900">
                    {initials}
                  </div>
                  <div className="hidden text-right text-sm md:block">
                    <p className="font-semibold text-codeat-silver">{fallbackName}</p>
                    <p className="text-xs uppercase tracking-wide text-codeat-gray">
                      {user?.employee?.designation || 'Team member'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5">
              <div className="flex flex-wrap gap-3 px-5 py-4">
                {statusHighlights.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-1 min-w-[150px] items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-sm text-codeat-gray"
                  >
                    <span className="uppercase tracking-[0.35em] text-[11px]">{item.label}</span>
                    <span className="font-semibold text-codeat-silver">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
              {children}
            </div>
          </main>

          <footer className="border-t border-white/5 bg-slate-950/80 px-5 py-4 text-xs text-codeat-gray">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>© {year} Codeat Infotech. All rights reserved.</span>
              <div className="flex items-center gap-4">
                <a href="/reports" className="hover:text-codeat-silver">Reports</a>
                <a href="/settings" className="hover:text-codeat-silver">Settings</a>
                <a href="/support" className="hover:text-codeat-silver">Support</a>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
