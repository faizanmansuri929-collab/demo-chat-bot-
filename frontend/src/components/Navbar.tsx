'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, Sparkles, Globe, GraduationCap, ShoppingBag, Mic, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">OmniAgent AI</span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600" /> Live
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 hidden xs:block">Universal Website-to-AI Assistant</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2.5 lg:gap-3">
          <Link
            href="/college-voice-search"
            className="text-xs lg:text-sm font-extrabold text-teal-800 bg-teal-50 hover:bg-teal-100/90 px-3 py-1.5 rounded-xl border border-teal-300 flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Mic className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
            <span>Voice Search</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-black">BETA</span>
          </Link>

          <Link
            href="/college-web-search"
            className="text-xs lg:text-sm font-extrabold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Globe className="w-4 h-4 text-emerald-600" />
            <span>Web Search</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold">BETA</span>
          </Link>

          <Link
            href="/scraper"
            className="text-xs lg:text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-all shadow-xs"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
            <span>Scraper</span>
            <span className="px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-900 text-[10px] font-bold">BETA</span>
          </Link>

          <Link
            href="/xyz-college"
            className="text-xs lg:text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5 transition-all shadow-xs"
          >
            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
            <span>XYZ College</span>
            <span className="px-1.5 py-0.2 rounded bg-blue-200 text-blue-900 text-[10px] font-bold">BETA</span>
          </Link>

          <Link
            href="/"
            className="text-xs lg:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" /> New Crawl
          </Link>
        </nav>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/college-voice-search"
            className="p-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-300 flex items-center gap-1 text-xs font-bold"
          >
            <Mic className="w-4 h-4 text-teal-600 animate-pulse" />
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 focus:outline-none transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/90 bg-white/98 backdrop-blur-lg px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-xl">
          <Link
            href="/college-voice-search"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50 text-teal-900 font-bold text-xs border border-teal-200"
          >
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-teal-600" />
              <span>College Voice Search</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-black">BETA</span>
          </Link>

          <Link
            href="/college-web-search"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-900 font-bold text-xs border border-emerald-200"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>College Web Search</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold">BETA</span>
          </Link>

          <Link
            href="/xyz-college"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 text-blue-900 font-bold text-xs border border-blue-200"
          >
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>XYZ College Assistant</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 text-[10px] font-bold">BETA</span>
          </Link>

          <Link
            href="/scraper"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50 text-indigo-900 font-bold text-xs border border-indigo-200"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <span>Product Scraper</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-900 text-[10px] font-bold">BETA</span>
          </Link>

          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200"
          >
            <Globe className="w-4 h-4 text-slate-600" />
            <span>New Crawl / Home</span>
          </Link>
        </div>
      )}
    </header>
  );
}

