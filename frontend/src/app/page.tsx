'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Bot, Sparkles, Play, ShieldCheck, Globe, Brain, Search, Mic, Users,
  LayoutTemplate, LifeBuoy, Activity, GraduationCap, Stethoscope,
  Monitor, Factory, Building2, Check, Zap, Target, Headphones,
  Eye, ExternalLink, ArrowRight, Tag, TrendingUp, Rocket, Moon, Sun,
  Menu, X
} from 'lucide-react';
import HeroOrb3D from '@/components/HeroOrb3D';
import InteractiveDemo from '@/components/InteractiveDemo';
import DashboardShell from '@/components/DashboardShell';
import AssistantWizard from '@/components/AssistantWizard';
import {
  FEATURES, SOLUTIONS, BENEFITS
} from '@/lib/demoData';

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAppView = searchParams.get('app') === '1' || searchParams.get('view') === 'app';

  const [view, setView] = useState<'site' | 'app'>(initialAppView ? 'app' : 'site');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showcaseTab, setShowcaseTab] = useState<'assistant' | 'sources' | 'leads' | 'voice'>('assistant');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  useEffect(() => {
    if (searchParams.get('app') === '1' || searchParams.get('view') === 'app') {
      setView('app');
    }
  }, [searchParams]);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const enterApp = () => {
    setView('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exitToSite = () => {
    setView('site');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If in Dashboard App view (Guided Assistant Wizard)
  if (view === 'app') {
    return (
      <DashboardShell activeNav="home">
        <AssistantWizard />
      </DashboardShell>
    );
  }

  // Marketing Site View
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-[120] toast toast-info">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="glass-nav sticky top-0 z-50" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 group"
            aria-label="OmniAgent AI home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="text-left hidden xs:block sm:block">
              <span className="font-extrabold text-base tracking-tight">OmniAgent AI</span>
              <p className="text-[10px] t3 leading-none mt-0.5 hidden sm:block">Universal Website-to-AI Assistant</p>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-1">
            <button type="button" onClick={() => scrollToSection('features')} className="btn btn-ghost">
              Features
            </button>
            <button type="button" onClick={() => scrollToSection('solutions')} className="btn btn-ghost">
              Solutions
            </button>
            <button type="button" onClick={() => scrollToSection('how')} className="btn btn-ghost">
              How it works
            </button>
            <button type="button" onClick={() => scrollToSection('pricing')} className="btn btn-ghost">
              Pricing
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-[var(--surface-3)] transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-[18px] h-[18px] text-amber-400" /> : <Moon className="w-[18px] h-[18px] text-slate-600" />}
            </button>

            <button
              type="button"
              onClick={() => showToast('Sign-in is a placeholder in this demo build — an authentication backend is required for real accounts.')}
              className="btn btn-ghost hidden sm:inline-flex"
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={enterApp}
              className="btn btn-primary"
            >
              Get started
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-[var(--surface-3)]"
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bd sf px-4 py-3 space-y-1 shadow-xl">
            <button type="button" onClick={() => scrollToSection('features')} className="app-nav-link">
              <LayoutTemplate className="w-4 h-4" /> Features
            </button>
            <button type="button" onClick={() => scrollToSection('solutions')} className="app-nav-link">
              <Building2 className="w-4 h-4" /> Solutions
            </button>
            <button type="button" onClick={() => scrollToSection('how')} className="app-nav-link">
              <Rocket className="w-4 h-4" /> How it works
            </button>
            <button type="button" onClick={() => scrollToSection('pricing')} className="app-nav-link">
              <Tag className="w-4 h-4" /> Pricing
            </button>
            <button type="button" onClick={enterApp} className="app-nav-link">
              <ArrowRight className="w-4 h-4" /> Open the product
            </button>
          </div>
        )}
      </nav>

      <main id="main-content">
        {/* ================= HERO ================= */}
        <section id="hero" className="relative overflow-hidden hero-bg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 lg:pt-20 lg:pb-16 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center relative">
            <div className="hero-copy space-y-6">
              <span className="badge badge-blue">
                <Sparkles className="w-3 h-3" /> Universal Website-to-AI Assistant
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight leading-[1.08]">
                Turn any website into an{' '}
                <span className="bg-gradient-to-r from-blue-600 via-teal-500 to-violet-600 bg-clip-text text-transparent">
                  intelligent AI assistant
                </span>.
              </h1>
              <p className="text-base sm:text-lg t2 max-w-xl leading-relaxed">
                Build AI-powered conversations, automate customer support, capture qualified leads, and deliver instant answers — all grounded in your own website.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={enterApp}
                  className="btn btn-primary btn-lg"
                >
                  <Sparkles className="w-4 h-4" /> Create your AI assistant
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('demo')}
                  className="btn btn-secondary btn-lg"
                >
                  <Play className="w-4 h-4" /> Explore live demo
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="badge badge-teal">
                  <ShieldCheck className="w-3 h-3" /> No API key needed for the demo
                </span>
                <span className="badge badge-slate">
                  <Globe className="w-3 h-3" /> Works with any public website
                </span>
              </div>
            </div>

            {/* 3D Visual with Floating Panels */}
            <div className="hero-visual relative h-[340px] sm:h-[420px] lg:h-[500px]" aria-hidden="true">
              <HeroOrb3D />
            </div>
          </div>

          {/* 4 Stat Highlights */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t bd">
              <div>
                <dt className="text-2xl font-extrabold">4</dt>
                <dd className="text-xs t3 mt-1">Assistant templates</dd>
              </div>
              <div>
                <dt className="text-2xl font-extrabold">5</dt>
                <dd className="text-xs t3 mt-1">Industry templates</dd>
              </div>
              <div>
                <dt className="text-2xl font-extrabold">3</dt>
                <dd className="text-xs t3 mt-1">Steps to launch</dd>
              </div>
              <div>
                <dt className="text-2xl font-extrabold">24/7</dt>
                <dd className="text-xs t3 mt-1">Availability for visitors</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ================= INTERACTIVE DEMO ================= */}
        <section id="demo" className="py-16 sm:py-20 border-t bd">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="badge badge-teal">
                <Play className="w-3 h-3" /> Interactive demo
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Try an interactive assistant live
              </h2>
              <p className="t2 text-sm sm:text-base">
                Ask questions to preview how the assistant answers with grounded sources.
              </p>
            </div>

            <div className="mt-10">
              <InteractiveDemo />
            </div>
          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section id="features" className="py-16 sm:py-20 border-t bd">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-3">
              <span className="badge badge-blue">
                <LayoutTemplate className="w-3 h-3" /> Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Everything you need to turn a website into an assistant
              </h2>
              <p className="t2 text-sm sm:text-base">
                From reading your sitemap to real-time voice, every tool is built to turn website visits into conversations.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
              {FEATURES.map((f, i) => (
                <div key={i} className="card card-hover p-5 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    {f.icon === 'Globe' && <Globe className="w-[18px] h-[18px]" />}
                    {f.icon === 'Brain' && <Brain className="w-[18px] h-[18px]" />}
                    {f.icon === 'Search' && <Search className="w-[18px] h-[18px]" />}
                    {f.icon === 'Mic' && <Mic className="w-[18px] h-[18px]" />}
                    {f.icon === 'Users' && <Users className="w-[18px] h-[18px]" />}
                    {f.icon === 'LayoutTemplate' && <LayoutTemplate className="w-[18px] h-[18px]" />}
                    {f.icon === 'LifeBuoy' && <LifeBuoy className="w-[18px] h-[18px]" />}
                    {f.icon === 'Activity' && <Activity className="w-[18px] h-[18px]" />}
                  </div>
                  <h3 className="font-bold text-sm">{f.title}</h3>
                  <p className="text-xs t3 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= SOLUTIONS ================= */}
        <section id="solutions" className="py-16 sm:py-20 border-t bd">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-3">
              <span className="badge badge-teal">
                <Building2 className="w-3 h-3" /> Use cases
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Tailored for the questions your visitors ask most
              </h2>
              <p className="t2 text-sm sm:text-base">
                Templates come pre-configured for education, healthcare, software and more.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
              {SOLUTIONS.map((s, i) => (
                <div key={i} className="card card-hover p-5 space-y-3 flex flex-col">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                      {s.icon === 'GraduationCap' && <GraduationCap className="w-[18px] h-[18px]" />}
                      {s.icon === 'Stethoscope' && <Stethoscope className="w-[18px] h-[18px]" />}
                      {s.icon === 'Monitor' && <Monitor className="w-[18px] h-[18px]" />}
                      {s.icon === 'Factory' && <Factory className="w-[18px] h-[18px]" />}
                      {s.icon === 'Building2' && <Building2 className="w-[18px] h-[18px]" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{s.title}</h3>
                      <p className="text-[10px] t3">{s.sub}</p>
                    </div>
                  </div>

                  <ul className="space-y-1.5 text-xs t2 flex-1">
                    {s.points.map((p, idx) => (
                      <li key={idx} className="flex gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={enterApp}
                    className="btn btn-secondary btn-sm w-full mt-1"
                  >
                    Use {s.title.toLowerCase()} template
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section id="how" className="py-16 sm:py-20 border-t bd">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-3">
              <span className="badge badge-blue">
                <Rocket className="w-3 h-3" /> Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Live in three simple steps
              </h2>
              <p className="t2 text-sm sm:text-base">
                No engineers, no manual document uploads — OmniAgent reads your live site directly.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-10">
              <div className="card p-6 space-y-3">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold text-sm flex items-center justify-center">
                  1
                </span>
                <h3 className="font-bold">Add your website</h3>
                <p className="text-xs t3 leading-relaxed">
                  Paste your homepage or sitemap URL. OmniAgent discovers public pages automatically.
                </p>
              </div>

              <div className="card p-6 space-y-3">
                <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-extrabold text-sm flex items-center justify-center">
                  2
                </span>
                <h3 className="font-bold">We read your pages</h3>
                <p className="text-xs t3 leading-relaxed">
                  Content is processed, structured and indexed so answers are grounded and accurate.
                </p>
              </div>

              <div className="card p-6 space-y-3">
                <span className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-extrabold text-sm flex items-center justify-center">
                  3
                </span>
                <h3 className="font-bold">Launch &amp; capture leads</h3>
                <p className="text-xs t3 leading-relaxed">
                  Test, deploy and let your assistant handle questions and capture qualified leads.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SHOWCASE ================= */}
        <section id="showcase" className="py-16 sm:py-20 border-t bd">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-3">
              <span className="badge badge-blue">
                <Eye className="w-3 h-3" /> Product preview
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                A look inside the product
              </h2>
              <p className="t2 text-sm sm:text-base">
                Assistant chat, cited sources, lead dashboard and real-time voice.
              </p>
            </div>

            <div className="flex gap-2 mt-8 flex-wrap">
              <button
                type="button"
                onClick={() => setShowcaseTab('assistant')}
                className={`btn btn-sm ${showcaseTab === 'assistant' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Assistant chat
              </button>
              <button
                type="button"
                onClick={() => setShowcaseTab('sources')}
                className={`btn btn-sm ${showcaseTab === 'sources' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Sources &amp; citations
              </button>
              <button
                type="button"
                onClick={() => setShowcaseTab('leads')}
                className={`btn btn-sm ${showcaseTab === 'leads' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Lead dashboard
              </button>
              <button
                type="button"
                onClick={() => setShowcaseTab('voice')}
                className={`btn btn-sm ${showcaseTab === 'voice' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Voice assistant
              </button>
            </div>

            <div className="card mt-4 p-4 sm:p-6">
              {showcaseTab === 'assistant' && (
                <div className="max-w-md mx-auto space-y-3">
                  <div className="chat-msg user">
                    <div className="chat-bubble">What is the B.Tech CSE total fee?</div>
                  </div>
                  <div className="chat-msg assistant">
                    <div className="avatar avatar-bot">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="chat-bubble md">
                      <p>Here is the fee structure:</p>
                      <table>
                        <thead>
                          <tr>
                            <th>Component</th>
                            <th>Per year</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Tuition</td>
                            <td>₹96,000</td>
                          </tr>
                          <tr>
                            <td>Development</td>
                            <td>₹12,000</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-[10px] t3 mt-1">Preview with example data</p>
                    </div>
                  </div>
                </div>
              )}

              {showcaseTab === 'sources' && (
                <div className="max-w-lg mx-auto">
                  <div className="chat-msg assistant">
                    <div className="avatar avatar-bot">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="chat-bubble md">
                      <p>Hostel options include AC and non-AC rooms with attached mess facilities.</p>
                      <p className="mt-2 font-semibold text-xs">Sources</p>
                      <div className="flex gap-2 flex-wrap mt-1">
                        <span className="source-chip">
                          <ExternalLink className="w-3 h-3" /> hostel-life
                        </span>
                        <span className="source-chip">
                          <ExternalLink className="w-3 h-3" /> admissions
                        </span>
                        <span className="source-chip">
                          <ExternalLink className="w-3 h-3" /> faq
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-xs t3 mt-3">Every answer links back to the page it came from.</p>
                </div>
              )}

              {showcaseTab === 'leads' && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="badge badge-emerald">
                      <Users className="w-3 h-3" /> Lead Engine
                    </span>
                    <span className="text-[10px] t3">Preview with sample data</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="leads-table">
                      <thead>
                        <tr>
                          <th>Visitor</th>
                          <th>Score</th>
                          <th>Status</th>
                          <th>Captured</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="font-semibold">Rahul S.</td>
                          <td>
                            <div className="score-bar">
                              <span style={{ width: '92%', background: 'var(--success)' }}></span>
                            </div>
                          </td>
                          <td><span className="badge badge-emerald">Qualified</span></td>
                          <td className="t3">Today</td>
                        </tr>
                        <tr>
                          <td className="font-semibold">Priya M.</td>
                          <td>
                            <div className="score-bar">
                              <span style={{ width: '74%', background: 'var(--amber)' }}></span>
                            </div>
                          </td>
                          <td><span className="badge badge-amber">Contacted</span></td>
                          <td className="t3">Today</td>
                        </tr>
                        <tr>
                          <td className="font-semibold">Aman K.</td>
                          <td>
                            <div className="score-bar">
                              <span style={{ width: '58%', background: 'var(--text-3)' }}></span>
                            </div>
                          </td>
                          <td><span className="badge badge-slate">New</span></td>
                          <td className="t3">Yesterday</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {showcaseTab === 'voice' && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="voice-orb !w-20 !h-20" data-state="simulating">
                    <Mic className="w-6 h-6" />
                  </div>
                  <div className="wave on">
                    <span></span><span></span><span></span><span></span><span></span>
                  </div>
                  <p className="text-sm t3 max-w-sm text-center">
                    Visitors speak naturally — in multiple languages — and hear grounded, spoken answers with sources shown on screen.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================= BENEFITS ================= */}
        <section id="benefits" className="py-16 sm:py-20 border-t bd">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-3">
              <span className="badge badge-teal">
                <TrendingUp className="w-3 h-3" /> Business value
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Why teams choose OmniAgent
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
              {BENEFITS.map((b, i) => (
                <div key={i} className="card card-hover p-5 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    {b.icon === 'Zap' && <Zap className="w-[18px] h-[18px]" />}
                    {b.icon === 'Target' && <Target className="w-[18px] h-[18px]" />}
                    {b.icon === 'Search' && <Search className="w-[18px] h-[18px]" />}
                    {b.icon === 'Headphones' && <Headphones className="w-[18px] h-[18px]" />}
                  </div>
                  <h3 className="font-bold text-sm">{b.title}</h3>
                  <p className="text-xs t3 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs t3 mt-6">
              Actual results depend on your website, traffic and configuration — we don't promise specific business outcomes.
            </p>
          </div>
        </section>

        {/* ================= PRICING ================= */}
        <section id="pricing" className="py-16 sm:py-20 border-t bd">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-3">
              <span className="badge badge-blue">
                <Tag className="w-3 h-3" /> Pricing
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Simple plans for every stage
              </h2>
              <p className="t2 text-sm sm:text-base">
                Pricing is provided on request, based on your website size and expected usage — no fabricated numbers here.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-10">
              <div className="card card-hover p-6 flex flex-col">
                <h3 className="font-bold">Starter</h3>
                <p className="text-xs t3 mt-1">Get your first assistant live.</p>
                <ul className="mt-4 space-y-2 text-sm t2 flex-1">
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />1 AI assistant</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />Text chat with citations</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />Standard templates</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />Email support</li>
                </ul>
                <button
                  type="button"
                  onClick={() => showToast('Demo build: wire this button to your CRM or mailto endpoint in production.')}
                  className="btn btn-secondary mt-5"
                >
                  Pricing on request
                </button>
              </div>

              <div className="card card-hover p-6 flex flex-col ring-2 ring-blue-500/40 relative">
                <span className="badge badge-blue absolute -top-2.5 left-6">Most popular</span>
                <h3 className="font-bold">Professional</h3>
                <p className="text-xs t3 mt-1">For teams that live on their website.</p>
                <ul className="mt-4 space-y-2 text-sm t2 flex-1">
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />Everything in Starter</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />Real-time voice assistant</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />Lead dashboard &amp; export</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />Analytics &amp; monitoring</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />Priority support</li>
                </ul>
                <button
                  type="button"
                  onClick={() => showToast('Demo build: wire this button to your CRM or mailto endpoint in production.')}
                  className="btn btn-primary mt-5"
                >
                  Talk to sales
                </button>
              </div>

              <div className="card card-hover p-6 flex flex-col">
                <h3 className="font-bold">Enterprise</h3>
                <p className="text-xs t3 mt-1">Scale, security and control.</p>
                <ul className="mt-4 space-y-2 text-sm t2 flex-1">
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />Everything in Professional</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />Custom sector templates</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />Deployment &amp; security review</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />Dedicated support &amp; SLA</li>
                </ul>
                <button
                  type="button"
                  onClick={() => showToast('Demo build: wire this button to your CRM or mailto endpoint in production.')}
                  className="btn btn-secondary mt-5"
                >
                  Contact us
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ================= FINAL CTA ================= */}
        <section className="py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="rounded-3xl p-8 sm:p-14 text-center text-white relative overflow-hidden bg-gradient-to-br from-[#0A1B33] via-[#10263F] to-[#0A1B33] shadow-2xl">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(420px 240px at 70% 20%,rgba(37,99,235,.35),transparent 60%), radial-gradient(380px 220px at 20% 80%,rgba(13,148,136,.25),transparent 60%)'
                }}
              ></div>
              <div className="relative space-y-5">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Your website has answers.<br />Let AI deliver them.
                </h2>
                <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto">
                  Create your assistant in minutes — guided setup, honest status at every step.
                </p>
                <button
                  type="button"
                  onClick={enterApp}
                  className="btn btn-primary btn-lg"
                >
                  <Sparkles className="w-4 h-4" /> Create your AI assistant
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bd sf2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-8 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold">OmniAgent AI</span>
            </div>
            <p className="t3 text-xs leading-relaxed max-w-xs">
              Universal Website-to-AI Assistant. Demo build — simulated content is clearly labelled; backend integrations are documented in the code.
            </p>
          </div>

          <div>
            <p className="font-bold text-xs uppercase tracking-wider t3 mb-3">Product</p>
            <div className="flex flex-col items-start gap-2">
              <button type="button" onClick={() => scrollToSection('features')} className="t2 hover:text-[var(--primary)] text-xs">Features</button>
              <button type="button" onClick={() => scrollToSection('demo')} className="t2 hover:text-[var(--primary)] text-xs">Live demo</button>
              <button type="button" onClick={() => scrollToSection('pricing')} className="t2 hover:text-[var(--primary)] text-xs">Pricing</button>
              <button type="button" onClick={enterApp} className="t2 hover:text-[var(--primary)] text-xs">Create assistant</button>
            </div>
          </div>

          <div>
            <p className="font-bold text-xs uppercase tracking-wider t3 mb-3">Tools</p>
            <div className="flex flex-col items-start gap-2">
              <Link href="/college-voice-search" className="t2 hover:text-[var(--primary)] text-xs">Voice search</Link>
              <Link href="/college-web-search" className="t2 hover:text-[var(--primary)] text-xs">Live web search</Link>
              <Link href="/lead-engine" className="t2 hover:text-[var(--primary)] text-xs">Lead engine</Link>
            </div>
          </div>
        </div>
        <div className="border-t bd py-4 text-center text-[11px] t3">
          © OmniAgent AI — demo build for demonstration.
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
