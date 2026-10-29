'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot, Plus, Mic, Globe, GraduationCap, Users, ArrowLeft,
  Moon, Sun, Menu, X
} from 'lucide-react';
import { api } from '@/lib/api';

interface DashboardShellProps {
  children: React.ReactNode;
  activeNav?: 'home' | 'college-voice-search' | 'college-web-search' | 'xyz-college' | 'lead-engine';
}

export default function DashboardShell({ children, activeNav }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  useEffect(() => {
    // Check real backend status
    api.checkHealth().then(res => {
      if (res && res.status === 'online') {
        setIsBackendConnected(true);
      }
    }).catch(() => {});

    try {
      const saved = localStorage.getItem('omniagent_theme');
      if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        setIsDark(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDark(false);
      }
    } catch (e) {}

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('omniagent_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('omniagent_theme', 'light');
    }
  };

  const currentTab = activeNav || (
    pathname === '/college-voice-search' ? 'college-voice-search' :
    pathname === '/college-web-search' ? 'college-web-search' :
    pathname === '/xyz-college' ? 'xyz-college' :
    pathname === '/lead-engine' ? 'lead-engine' : 'home'
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      <div className="flex min-h-screen">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r bd sf sticky top-0 h-screen z-30">
          <div className="p-4 border-b bd flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-extrabold text-sm leading-none">OmniAgent AI</p>
                <p className="text-[10px] t3 mt-1">Workspace</p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-3 space-y-1" aria-label="App pages">
            <Link
              href="/?app=1"
              className={`app-nav-link ${currentTab === 'home' ? 'active' : ''}`}
            >
              <Plus className="w-4 h-4" />
              <span>Create Assistant</span>
              <span className="ml-auto text-[9px] t3 font-medium">New crawl</span>
            </Link>

            <Link
              href="/college-voice-search"
              className={`app-nav-link ${currentTab === 'college-voice-search' ? 'active' : ''}`}
            >
              <Mic className="w-4 h-4 text-teal-600" />
              <span>Voice Assistant</span>
              <span className="badge badge-amber ml-auto">Beta</span>
            </Link>

            <Link
              href="/college-web-search"
              className={`app-nav-link ${currentTab === 'college-web-search' ? 'active' : ''}`}
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Live Web Search</span>
            </Link>

            <Link
              href="/xyz-college"
              className={`app-nav-link ${currentTab === 'xyz-college' ? 'active' : ''}`}
            >
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>XYZ College Assistant</span>
            </Link>

            <Link
              href="/lead-engine"
              className={`app-nav-link ${currentTab === 'lead-engine' ? 'active' : ''}`}
            >
              <Users className="w-4 h-4 text-teal-600" />
              <span>Lead Engine</span>
              <span className="badge badge-teal ml-auto">New</span>
            </Link>
          </nav>

          <div className="p-3 border-t bd space-y-2">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] t3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>{isBackendConnected ? 'Backend connected' : 'Demo mode — backend not connected'}</span>
            </div>
            <button
              onClick={toggleTheme}
              className="app-nav-link w-full text-left"
              type="button"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-600" />
                  <span>Dark mode</span>
                </>
              )}
            </button>
            <Link href="/" className="app-nav-link">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to site</span>
            </Link>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile Header */}
          <header className="lg:hidden glass-nav sticky top-0 z-40 h-14 px-4 flex items-center justify-between gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl hover:bg-[var(--surface-3)]"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-sm">OmniAgent AI</span>
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-[var(--surface-3)]"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </header>

          <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-label="App navigation">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <aside className="absolute left-0 top-0 h-full w-72 sf border-r bd p-4 space-y-1 drawer-panel overflow-y-auto z-10 shadow-2xl">
            <div className="flex items-center justify-between px-1 pb-3 mb-2 border-b bd">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-sm">OmniAgent AI</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-3)]"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Link
              href="/?app=1"
              onClick={() => setMobileMenuOpen(false)}
              className={`app-nav-link ${currentTab === 'home' ? 'active' : ''}`}
            >
              <Plus className="w-4 h-4" />
              <span>Create Assistant</span>
            </Link>

            <Link
              href="/college-voice-search"
              onClick={() => setMobileMenuOpen(false)}
              className={`app-nav-link ${currentTab === 'college-voice-search' ? 'active' : ''}`}
            >
              <Mic className="w-4 h-4 text-teal-600" />
              <span>Voice Assistant</span>
              <span className="badge badge-amber ml-auto">Beta</span>
            </Link>

            <Link
              href="/college-web-search"
              onClick={() => setMobileMenuOpen(false)}
              className={`app-nav-link ${currentTab === 'college-web-search' ? 'active' : ''}`}
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Live Web Search</span>
            </Link>

            <Link
              href="/xyz-college"
              onClick={() => setMobileMenuOpen(false)}
              className={`app-nav-link ${currentTab === 'xyz-college' ? 'active' : ''}`}
            >
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>XYZ College Assistant</span>
            </Link>

            <Link
              href="/lead-engine"
              onClick={() => setMobileMenuOpen(false)}
              className={`app-nav-link ${currentTab === 'lead-engine' ? 'active' : ''}`}
            >
              <Users className="w-4 h-4 text-teal-600" />
              <span>Lead Engine</span>
            </Link>

            <div className="pt-3 mt-2 border-t bd space-y-1">
              <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] t3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                <span>{isBackendConnected ? 'Backend connected' : 'Demo mode — backend not connected'}</span>
              </div>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="app-nav-link"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to site</span>
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
