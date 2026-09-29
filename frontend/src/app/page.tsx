'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Globe, ArrowRight, Layers, ShieldCheck, Zap, Bot, RefreshCw,
  FileText, GraduationCap, Award, CheckCircle2, Sparkles, Server,
  Database, Users, Clock, Flame, Building2, ShoppingBag, Mic, Radio
} from 'lucide-react';

import { api, Agent, HardcodedBot } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const [botMode, setBotMode] = useState<'ai' | 'hardcoded' | 'web_search' | 'voice_search'>('web_search');
  const [collegeName, setCollegeName] = useState('Poornima University');
  const [url, setUrl] = useState('https://www.poornima.org/sitemap.xml');
  const [scope, setScope] = useState<'entire_website' | 'subpath' | 'current_page'>('entire_website');
  const [sector, setSector] = useState<string>('college');
  const [ttlDays, setTtlDays] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Existing bots list
  const [aiAgents, setAiAgents] = useState<Agent[]>([]);
  const [hardcodedBots, setHardcodedBots] = useState<HardcodedBot[]>([]);

  useEffect(() => {
    // Load existing bots
    api.listHardcodedBots().then(setHardcodedBots).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');

    try {
      if (botMode === 'voice_search') {
        const project = await api.createCollegeProject(
          collegeName.trim() || 'College / University',
          url.trim()
        );
        router.push(`/college-voice-search?project_id=${project.id}`);
      } else if (botMode === 'web_search') {
        const project = await api.createCollegeProject(
          collegeName.trim() || 'College / University',
          url.trim()
        );
        router.push(`/college-web-search?project_id=${project.id}`);
      } else if (botMode === 'hardcoded') {
        const bot = await api.createHardcodedBot(url.trim(), undefined, sector, ttlDays);
        router.push(`/hardcoded/${bot.id}`);
      } else {
        const agent = await api.createAgent(url.trim(), scope);
        router.push(`/agents/${agent.id}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to initialize chatbot creation. Please check the URL.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-2 sm:px-4 space-y-6 sm:space-y-10">
      {/* Featured Spotlight: NEW College Voice Web Search */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 border border-teal-500/40">
        <div className="space-y-1.5 sm:space-y-2 z-10">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/30 text-[11px] sm:text-xs font-bold flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-teal-300" /> College Voice Web Search
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black tracking-wider uppercase">
              BETA
            </span>
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[11px] sm:text-xs font-semibold flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              Indian Accent WebRTC
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white">
            Spoken College Voice Assistant
          </h2>
          <p className="text-xs sm:text-sm text-teal-100 max-w-xl leading-relaxed">
            Speak naturally with the AI voice assistant in Indian English or Hindi. It searches live college sitemaps and displays complete fee tables and branch details on screen.
          </p>
        </div>

        <Link
          href="/college-voice-search"
          className="z-10 px-4 sm:px-5 py-3 sm:py-3.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold rounded-2xl shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm transition-all shrink-0 w-full sm:w-auto"
        >
          <Mic className="w-4 h-4" />
          <span>Launch Voice Search</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Featured Spotlight: College Live Web Search (Text) */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 border border-emerald-500/40">
        <div className="space-y-1.5 sm:space-y-2 z-10">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-[11px] sm:text-xs font-bold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-300" /> College Text Web Search
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase">
              BETA
            </span>
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[11px] sm:text-xs font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Dynamic Sitemap Discovery
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white">
            College &amp; University Live Web Search
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed">
            AI dynamically discovers official pages from the college sitemap, performs live web searches across official domains, and generates grounded answers with clickable source links.
          </p>
        </div>

        <Link
          href="/college-web-search"
          className="z-10 px-4 sm:px-5 py-3 sm:py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold rounded-2xl shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm transition-all shrink-0 w-full sm:w-auto"
        >
          <Bot className="w-4 h-4" />
          <span>Launch Web Search</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Featured Spotlight: XYZ College AI Assistant */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
        <div className="space-y-1 sm:space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur text-xs font-semibold flex items-center gap-1.5 text-blue-100">
              <Award className="w-3.5 h-3.5 text-amber-300" /> College RAG Portal
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-semibold">
              REAP 1023 / 1050
            </span>
          </div>
          <h3 className="text-base sm:text-xl font-bold tracking-tight text-white">
            XYZ Group of Colleges AI Assistant
          </h3>
          <p className="text-xs text-blue-100 max-w-xl leading-relaxed">
            Autonomous counselor with admissions qualification, branch comparison, and lead scoring.
          </p>
        </div>

        <Link
          href="/xyz-college"
          className="z-10 px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-900 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm transition-all shrink-0 w-full sm:w-auto"
        >
          <GraduationCap className="w-4 h-4 text-blue-700" />
          <span>Open AI Portal</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Hero Header */}
      <div className="text-center space-y-2 sm:space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold shadow-sm">
          <Zap className="w-3.5 h-3.5 text-teal-600" /> 4 Chatbot Templates
        </div>
        <h1 className="text-2xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Universal Website AI Platform <br />
          <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-blue-600 bg-clip-text text-transparent">
            Choose Your Chatbot Template
          </span>
        </h1>
        <p className="text-xs sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Select between <strong>College Voice Web Search</strong>, <strong>College Text Web Search</strong>, <strong>Zero-LLM Hardcoded Chatbot</strong>, or <strong>Dynamic AI RAG Chatbot</strong>.
        </p>
      </div>

      {/* Main Creation Card */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
        {/* ENGINE MODE SELECTOR - 4 OPTIONS */}
        <div className="space-y-3">
          <label className="block text-xs sm:text-sm font-extrabold text-slate-900">
            Select Chatbot Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Option 1: College Voice Web Search (NEW) */}
            <button
              type="button"
              onClick={() => {
                setBotMode('voice_search');
                setUrl('https://www.poornima.org/sitemap.xml');
                setCollegeName('Poornima University');
              }}
              className={`p-3.5 sm:p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                botMode === 'voice_search'
                  ? 'border-teal-600 bg-teal-50/90 text-teal-950 ring-2 ring-teal-500/20 shadow-md'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-xs sm:text-base flex items-center gap-1.5 text-teal-900">
                    <Mic className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>College Voice Search</span>
                  </div>
                  {botMode === 'voice_search' ? (
                    <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold uppercase">
                      Active
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold uppercase">
                      New
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-2 leading-relaxed">
                  OpenAI Realtime voice conversation → speak naturally → live search on college sitemap → concise spoken response.
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-teal-200/60 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-teal-700">
                <Radio className="w-3 h-3 text-teal-600 animate-pulse shrink-0" />
                Realtime WebRTC &bull; Spoken Audio
              </div>
            </button>

            {/* Option 2: College Text Web Search */}
            <button
              type="button"
              onClick={() => {
                setBotMode('web_search');
                setUrl('https://www.poornima.org/sitemap.xml');
                setCollegeName('Poornima University');
              }}
              className={`p-3.5 sm:p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                botMode === 'web_search'
                  ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/20 shadow-md'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-xs sm:text-base flex items-center gap-1.5 text-emerald-900">
                    <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>College Web Search</span>
                  </div>
                  {botMode === 'web_search' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-2 leading-relaxed">
                  Text input → dynamic sitemap link discovery → live web search on domain → grounded answers with citations.
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                Live Text Search &bull; Citations
              </div>
            </button>

            {/* Option 3: Hardcoded Option */}
            <button
              type="button"
              onClick={() => {
                setBotMode('hardcoded');
                setUrl('https://www.xyzcollege.edu.in/');
              }}
              className={`p-3.5 sm:p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                botMode === 'hardcoded'
                  ? 'border-blue-600 bg-blue-50/90 text-blue-950 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-xs sm:text-base flex items-center gap-1.5 text-blue-900">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    <span>Hardcoded Chatbot</span>
                  </div>
                  {botMode === 'hardcoded' && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-2 leading-relaxed">
                  One-time crawl → FAQ dataset saved in DB → <strong>0 LLM calls at runtime</strong> with 7-day TTL caching.
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-blue-200/60 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-blue-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                Instant Speed &bull; Zero Runtime Cost
              </div>
            </button>

            {/* Option 4: AI RAG Option */}
            <button
              type="button"
              onClick={() => {
                setBotMode('ai');
                setUrl('https://www.xyzcollege.edu.in/');
              }}
              className={`p-3.5 sm:p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                botMode === 'ai'
                  ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 ring-2 ring-indigo-500/20 shadow-md'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-xs sm:text-base flex items-center gap-1.5 text-indigo-900">
                    <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>AI / RAG Chatbot</span>
                  </div>
                  {botMode === 'ai' && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-2 leading-relaxed">
                  Vector index + semantic retrieval + live LLM reasoning for every message with real website citations.
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-indigo-200/60 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-indigo-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                Dynamic Reasoning &bull; Semantic Search
              </div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* College Name input for Voice & Web Search */}
          {(botMode === 'voice_search' || botMode === 'web_search') && (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-900">
                College / University Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none text-slate-400">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Poornima University, IIT Delhi"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs sm:text-base transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* URL Input */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="block text-xs sm:text-sm font-bold text-slate-900">
                {botMode === 'voice_search' || botMode === 'web_search' ? 'Sitemap XML / Website URL' : 'Website URL to Ingest'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCollegeName('Poornima University');
                    setUrl('https://www.poornima.org/sitemap.xml');
                  }}
                  className="text-[11px] sm:text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-0.5"
                >
                  <Sparkles className="w-3 h-3 text-teal-500" /> poornima.org
                </button>
                <span className="text-slate-300">&bull;</span>
                <button
                  type="button"
                  onClick={() => {
                    setCollegeName('XYZ College');
                    setUrl('https://www.xyzcollege.edu.in/');
                  }}
                  className="text-[11px] sm:text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                >
                  xyzcollege.edu.in
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder={botMode === 'voice_search' || botMode === 'web_search' ? 'https://www.poornima.org/sitemap.xml' : 'https://www.xyzcollege.edu.in/'}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-base transition-all"
                required
              />
            </div>
          </div>

          {/* Hardcoded Specific Options */}
          {botMode === 'hardcoded' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="space-y-1 sm:space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Target Sector Template
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full p-2 sm:p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="college">🎓 College / University / Education</option>
                  <option value="hospital">🏥 Hospital / Healthcare</option>
                  <option value="saas">💻 Software / SaaS</option>
                  <option value="manufacturing">🏭 Manufacturing / Industrial</option>
                  <option value="general">🏢 General Organization</option>
                </select>
                <p className="text-[10px] sm:text-[11px] text-slate-500">Auto-detected if left as default or automatically refined during crawl.</p>
              </div>

              <div className="space-y-1 sm:space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Dataset Version TTL (Cache Duration)
                </label>
                <select
                  value={ttlDays}
                  onChange={(e) => setTtlDays(Number(e.target.value))}
                  className="w-full p-2 sm:p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={7}>7 Days (Default Standard)</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={90}>90 Days (Quarterly)</option>
                </select>
                <p className="text-[10px] sm:text-[11px] text-slate-500">Flags bot as 'Update Required' upon expiration without auto-re-crawling.</p>
              </div>
            </div>
          ) : botMode === 'ai' ? (
            /* AI RAG Specific Scope */
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-900">
                Crawl Scope
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setScope('entire_website')}
                  className={`p-3 sm:p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    scope === 'entire_website'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    Entire Website
                    {scope === 'entire_website' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1">
                    Crawl all discovered pages across domain.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('subpath')}
                  className={`p-3 sm:p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    scope === 'subpath'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    Specific Path
                    {scope === 'subpath' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1">
                    Only crawl pages under URL path.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('current_page')}
                  className={`p-3 sm:p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    scope === 'current_page'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    Single Page
                    {scope === 'current_page' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1">
                    Process only the exact URL entered.
                  </div>
                </button>
              </div>
            </div>
          ) : null}

          {error && (
            <div className="p-3 sm:p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 sm:py-4 px-4 sm:px-6 text-white font-bold text-sm sm:text-base rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              botMode === 'voice_search'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-500/20'
                : botMode === 'web_search'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
                : botMode === 'hardcoded'
                ? 'bg-gradient-to-r from-blue-600 to-amber-600 hover:from-blue-700 hover:to-amber-700 shadow-blue-500/20'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/20'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                <span>Initializing...</span>
              </>
            ) : (
              <>
                {botMode === 'voice_search' ? (
                  <>
                    <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> Launch College Voice Search <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </>
                ) : botMode === 'web_search' ? (
                  <>
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5" /> Launch College Web Search <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </>
                ) : botMode === 'hardcoded' ? (
                  <>
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5" /> Generate Hardcoded Chatbot <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5" /> Build AI RAG Chatbot <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </>
                )}
              </>
            )}
          </button>
        </form>
      </div>

      {/* RECENT HARDCODED BOTS DASHBOARD SECTION */}
      {hardcodedBots.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h3 className="font-bold text-slate-900 text-base">Your Hardcoded / Predefined Chatbots</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              {hardcodedBots.length} Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hardcodedBots.map((b) => (
              <Link
                key={b.id}
                href={`/hardcoded/${b.id}`}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                      {b.name}
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      b.status === 'READY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.status === 'UPDATE_REQUIRED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800 animate-pulse'
                    }`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate font-mono mt-1">
                    {b.website_url}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <span>📚 <strong>{b.faqs_count}</strong> FAQs</span>
                    <span>&bull;</span>
                    <span>👥 <strong>{b.visitors_count}</strong> Leads</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Zap className="w-5 h-5 fill-amber-500" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Zero Runtime LLM Calls</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pre-generates deterministic FAQ/Intent answers once. Chat matches instantly from backend database with 0 per-query API costs.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Grounded Sector Knowledge</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Strict website grounding. No invented fees, doctors, or deadlines. Unanswered queries route gracefully to Advisors or AI.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Conversational Lead Capture</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Seamlessly captures visitor Email and Mobile number on first touch before proceeding to instant answers.
          </p>
        </div>
      </div>
    </div>
  );
}
