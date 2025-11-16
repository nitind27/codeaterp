'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
      { name: 'Complaints', path: '/complaints', icon: '📝' },
      { name: 'Interviews', path: '/interviews', icon: '🎯' },
      { name: 'Reports', path: '/reports', icon: '📈' },
      { name: 'Discussions', path: '/discussions', icon: '💬' }
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
      { name: 'Tasks', path: '/tasks', icon: '✅' },
      { name: 'Complaints', path: '/complaints', icon: '📝' },
      { name: 'Profile', path: '/profile', icon: '👤' },
      { name: 'Discussions', path: '/discussions', icon: '💬' }
    ],
    intern: [
      { name: 'Dashboard', path: '/dashboard', icon: '📊' },
      { name: 'Attendance', path: '/attendance', icon: '⏰' },
      { name: 'Leave', path: '/leave', icon: '📅' },
      { name: 'Tasks', path: '/tasks', icon: '✅' },
      { name: 'Profile', path: '/profile', icon: '👤' },
      { name: 'Discussions', path: '/discussions', icon: '💬' }
    ]
  };

  const items = menuItems[user?.role] || [];

  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-codeat-dark flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed lg:static lg:translate-x-0 w-72 bg-codeat-mid h-screen transition-transform duration-300 z-40 border-r border-codeat-muted/30 shadow-2xl`}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-codeat-muted/30 bg-gradient-to-br from-codeat-dark/50 to-codeat-mid/30">
            <div className="flex items-center justify-center mb-3">
              <div className="bg-codeat-dark/50 p-3 rounded-xl border border-codeat-muted/30">
                <Image
                  src="/logo-vertical.svg"
                  alt="Codeat Infotech"
                  width={100}
                  height={120}
                  className="h-auto max-h-20 w-auto"
                  priority
                />
              </div>
            </div>
            <p className="text-center text-codeat-gray text-xs font-semibold tracking-wider uppercase">ERP System</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {items.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative ${
                  pathname === item.path
                    ? 'bg-gradient-to-r from-codeat-teal to-codeat-teal/80 text-codeat-accent shadow-lg shadow-codeat-teal/30 scale-[1.02]'
                    : 'text-codeat-silver hover:bg-codeat-muted/50 hover:text-codeat-accent hover:translate-x-1'
                }`}
              >
                <span className={`text-xl ${pathname === item.path ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>
                  {item.icon}
                </span>
                <span className="font-semibold text-sm">{item.name}</span>
                {pathname === item.path && (
                  <div className="absolute right-2 w-1.5 h-1.5 bg-codeat-accent rounded-full animate-pulse"></div>
                )}
              </Link>
            ))}
          </nav>

          {/* User Info Footer */}
          <div className="p-5 border-t border-codeat-muted/30 bg-gradient-to-br from-codeat-dark/50 to-codeat-mid/30">
            <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-codeat-dark/60 border border-codeat-muted/30 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-codeat-accent via-codeat-teal to-codeat-accent flex items-center justify-center text-white font-bold text-base shadow-lg ring-2 ring-codeat-accent/20">
                {(user?.employee?.fullName || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-codeat-silver text-sm font-semibold truncate">
                  {user?.employee?.fullName || user?.email || 'User'}
                </p>
                <p className="text-codeat-gray text-xs capitalize truncate font-medium">
                  {user?.role?.replace('_', ' ') || 'User'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-gradient-to-r from-codeat-mid to-codeat-mid/95 border-b border-codeat-muted/30 px-4 lg:px-8 py-5 sticky top-0 z-30 backdrop-blur-md bg-opacity-95 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-codeat-silver hover:text-codeat-accent transition-all p-2.5 rounded-xl hover:bg-codeat-muted/50 active:scale-95"
                aria-label="Toggle sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-codeat-silver font-bold text-xl lg:text-2xl">
                  {items.find(item => item.path === pathname)?.name || 'Dashboard'}
                </h1>
                <p className="text-codeat-gray text-sm mt-0.5">Welcome back, {user?.employee?.firstName || 'User'}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 lg:space-x-4">
              <div className="hidden md:flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-codeat-dark/60 border border-codeat-muted/30 shadow-md hover:shadow-lg transition-shadow">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-codeat-accent via-codeat-teal to-codeat-accent flex items-center justify-center shadow-lg ring-2 ring-codeat-accent/20">
                  <span className="text-white text-sm font-bold">
                    {(user?.employee?.fullName || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-codeat-silver text-sm font-semibold">
                    {user?.employee?.fullName || user?.email}
                  </p>
                  <p className="text-codeat-gray text-xs capitalize font-medium">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-gradient-to-r from-codeat-accent to-codeat-teal text-white rounded-xl hover:from-codeat-accent/90 hover:to-codeat-teal/90 transition-all duration-300 font-semibold text-sm shadow-lg shadow-codeat-accent/30 hover:shadow-codeat-accent/50 hover:scale-105 active:scale-95"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-codeat-dark via-codeat-dark to-codeat-mid/20">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
