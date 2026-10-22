'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot, Sparkles, Globe, GraduationCap, Mic, Menu, X, Users,
  Moon, Sun
} from 'lucide-react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('omniagent_theme');
      if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        setIsDark(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDark(false);
      }
    } catch (e) {}
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

  return (
    <header className="glass-nav sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight">OmniAgent AI</span>
              <span className="badge badge-blue text-[10px] sm:text-xs">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600" /> Live
              </span>
            </div>
            <p className="text-[10px] sm:text-xs t3 hidden xs:block">Universal Website-to-AI Assistant</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-2.5">
          <Link
            href="/lead-engine"
            className={`text-xs lg:text-sm font-extrabold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
              pathname === '/lead-engine'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'sf t1 border-[var(--border)] hover:bg-[var(--surface-3)]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-teal-600" />
            <span>Lead Engine</span>
            <span className="px-1.5 py-0.2 rounded bg-teal-600 text-white text-[10px] font-black">NEW</span>
          </Link>

          <Link
            href="/college-voice-search"
            className={`text-xs lg:text-sm font-extrabold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
              pathname === '/college-voice-search'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'badge-teal hover:brightness-105'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
            <span>Voice Search</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[10px] font-black">BETA</span>
          </Link>

          <Link
            href="/college-web-search"
            className={`text-xs lg:text-sm font-extrabold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
              pathname === '/college-web-search'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'badge-emerald hover:brightness-105'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-600" />
            <span>Web Search</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">BETA</span>
          </Link>

          <Link
            href="/xyz-college"
            className={`text-xs lg:text-sm font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
              pathname === '/xyz-college'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'badge-blue hover:brightness-105'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
            <span>XYZ College</span>
            <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold">BETA</span>
          </Link>

          <Link
            href="/"
            className={`text-xs lg:text-sm font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
              pathname === '/'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'sf t2 border-[var(--border)] hover:bg-[var(--surface-3)]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" /> New Crawl
          </Link>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-xl hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)] ml-1"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </nav>

        {/* Mobile Hamburger Toggle & Actions */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-3)]"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <Link
            href="/college-voice-search"
            className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-300/40 flex items-center gap-1 text-xs font-bold"
          >
            <Mic className="w-4 h-4 text-teal-600 animate-pulse" />
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] focus:outline-none transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bd sf px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-xl">
          <Link
            href="/lead-engine"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-xl sf2 border bd text-xs font-extrabold"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              <span>Lead Engine CRM</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-teal-600 text-white text-[10px] font-black">NEW</span>
          </Link>

          <Link
            href="/college-voice-search"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-xl badge-teal text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-teal-600" />
              <span>College Voice Search</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[10px] font-black">BETA</span>
          </Link>

          <Link
            href="/college-web-search"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-xl badge-emerald text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>College Web Search</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">BETA</span>
          </Link>

          <Link
            href="/xyz-college"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-xl badge-blue text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>XYZ College Assistant</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold">BETA</span>
          </Link>

          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2.5 rounded-xl sf2 border bd text-xs font-semibold"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>New Crawl / Home</span>
          </Link>
        </div>
      )}
    </header>
  );
}
