// app/components/dashboard/DashboardNav.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu, X, LogOut, Settings, ChevronRight, Users, BarChart2, Heart
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

export interface DashboardNavProps {
  children: React.ReactNode;
  activeTab?: string;
}

export default function DashboardNav({ children, activeTab }: DashboardNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; role: string; profile?: any } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
  }, []);

  const navigationItems: NavItem[] = [
    { id: 'candidates', label: 'Candidates', icon: <Users className="w-4 h-4" />, href: '/' },
    { id: 'favorites',   label: 'Favorites',    icon: <Heart className="w-4 h-4" />, href: '/favorites' },
    { id: 'statistics', label: 'Statistics',  icon: <BarChart2 className="w-4 h-4" />, href: '/statistics' },
    { id: 'settings',   label: 'Settings',    icon: <Settings className="w-4 h-4" />, href: '/settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    router.push('/login');
  };

  const isActive = (item: NavItem) => {
    if (activeTab) return item.id === activeTab;
    if (item.href === '/') return pathname === '/';
    return pathname.startsWith(item.href);
  };

  const initials = (user?.profile?.full_name || user?.email || 'U')[0].toUpperCase();
  const displayName = user?.profile?.full_name || user?.email || '';

  const SidebarContent = () => (
    <nav className="p-4 space-y-0.5 flex-1">
      {navigationItems.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-left ${
              active
                ? 'bg-[#b5e220]/10 text-gray-900'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <span className={`flex-shrink-0 transition-colors ${active ? 'text-[#8aaa18]' : 'text-gray-400'}`}>
              {item.icon}
            </span>
            <span className={`flex-1 text-sm ${active ? 'font-medium' : 'font-normal'}`}>
              {item.label}
            </span>
            {active && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-[#8aaa18]" />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 h-14 flex-shrink-0">
        <div className="flex items-center justify-between px-4 sm:px-6 h-full">
          {/* Left: hamburger + wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {sidebarOpen
                ? <X className="w-5 h-5 text-gray-600" />
                : <Menu className="w-5 h-5 text-gray-600" />
              }
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#b5e220] flex items-center justify-center">
                <span className="text-[10px] font-black text-gray-900 leading-none">iU</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 hidden sm:block">inVision U</span>
            </Link>
          </div>

          {/* Right: user + logout */}
          <div className="flex items-center gap-2">
            {user && (
              <Link
                href={`/profile/${user.id}`}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-7 h-7 bg-[#b5e220]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-700">{initials}</span>
                </div>
                <span className="text-sm text-gray-600 hidden sm:block">{displayName}</span>
              </Link>
            )}
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" />
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-56 bg-white border-r border-gray-100 flex-shrink-0 overflow-y-auto pt-2">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/10 z-20 lg:hidden backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed top-14 left-0 w-56 h-[calc(100vh-56px)] bg-white border-r border-gray-100 z-30 overflow-y-auto flex flex-col pt-2 lg:hidden">
              <SidebarContent />
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}