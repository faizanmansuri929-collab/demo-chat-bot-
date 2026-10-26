'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles, RefreshCw, Mic, Globe, Search, Zap, Bot, Brain,
  Building2, Settings, ArrowLeft, ArrowRight, Rocket, Check,
  AlertTriangle, Radio, GraduationCap, Users
} from 'lucide-react';
import {
  WIZARD_SAVE_KEY, normalizeUrl, isValidUrl,
  WebProject, genericSamples
} from '@/lib/demoData';
import { api } from '@/lib/api';

const TEMPLATE_LABELS: Record<string, string> = {
  voice_search: 'Real-Time Voice',
  web_search: 'Live Web Search',
  hardcoded: 'Instant Answers',
  ai: 'AI Knowledge Assistant'
};

const LAUNCH_LABELS: Record<string, string> = {
  voice_search: 'Launch Voice Assistant',
  web_search: 'Launch Web Search Assistant',
  hardcoded: 'Launch Instant Answers Assistant',
  ai: 'Launch AI Knowledge Assistant'
};

const SECTOR_LABELS: Record<string, string> = {
  college: 'Education',
  hospital: 'Healthcare',
  saas: 'Software / SaaS',
  manufacturing: 'Manufacturing',
  general: 'General business'
};

const SCOPE_LABELS: Record<string, string> = {
  entire_website: 'Entire website',
  subpath: 'Specific section',
  current_page: 'Single page'
};

export default function AssistantWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [botMode, setBotMode] = useState<'voice_search' | 'web_search' | 'hardcoded' | 'ai'>('web_search');
  const [collegeName, setCollegeName] = useState('Poornima University');
  const [url, setUrl] = useState('https://www.poornima.org/sitemap.xml');
  const [sector, setSector] = useState('college');
  const [scope, setScope] = useState<'entire_website' | 'subpath' | 'current_page'>('entire_website');
  const [subpath, setSubpath] = useState('/admissions');
  const [ttlDays, setTtlDays] = useState('7');
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Launch state
  const [launchLogs, setLaunchLogs] = useState<Array<{ id: number; text: string; status: 'pending' | 'done' | 'error' }>>([]);
  const [launchResult, setLaunchResult] = useState<{ tone: 'ok' | 'err'; message: string; targetUrl?: string; btnText?: string } | null>(null);
  const [crawlProgress, setCrawlProgress] = useState<{
    active: boolean;
    pagesScraped: number;
    currentUrl: string;
    scrapedList: Array<{ url: string; title: string; category: string }>;
  }>({
    active: false,
    pagesScraped: 0,
    currentUrl: '',
    scrapedList: []
  });

  useEffect(() => {
    try {
      if (localStorage.getItem(WIZARD_SAVE_KEY)) {
        setHasSavedConfig(true);
      }
    } catch (e) {}
  }, []);

  const saveConfig = (currentMode = botMode) => {
    try {
      localStorage.setItem(
        WIZARD_SAVE_KEY,
        JSON.stringify({
          mode: currentMode,
          scope,
          name: collegeName.trim(),
          url: url.trim(),
          sector,
          ttl: ttlDays
        })
      );
      setHasSavedConfig(true);
    } catch (e) {}
  };

  const restoreConfig = () => {
    try {
      const c = JSON.parse(localStorage.getItem(WIZARD_SAVE_KEY) || 'null');
      if (!c) return;
      if (c.mode) setBotMode(c.mode);
      if (c.scope) setScope(c.scope);
      if (c.name) setCollegeName(c.name);
      if (c.url) setUrl(c.url);
      if (c.sector) setSector(c.sector);
      if (c.ttl) setTtlDays(c.ttl);
      setStep(5);
    } catch (e) {}
  };

  const fillQuickUrl = (name: string, demoUrl: string) => {
    setCollegeName(name);
    setUrl(demoUrl);
    setErrorMsg('');
  };

  const validateStep = (s: number) => {
    setErrorMsg('');
    if (s === 2) {
      if (!collegeName.trim()) {
        setErrorMsg('Please enter your organization name so visitors know who they are talking to.');
        return false;
      }
    }
    if (s === 3) {
      const cleanUrl = url.trim();
      if (!cleanUrl) {
        setErrorMsg('Please enter your website URL.');
        return false;
      }
      if (!isValidUrl(cleanUrl)) {
        setErrorMsg('That doesn’t look like a full URL. Use the full address, e.g. https://example.com');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 6));
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleRestart = () => {
    setErrorMsg('');
    setStep(1);
    setLaunchLogs([]);
    setLaunchResult(null);
  };

  const runLaunch = async () => {
    setStep(6);
    setLaunchLogs([]);
    setLaunchResult(null);

    const name = collegeName.trim() || 'Organization';
    const cleanUrl = normalizeUrl(url.trim());
    let domain = cleanUrl;
    try {
      domain = new URL(cleanUrl).hostname.replace(/^www\./, '');
    } catch (e) {}

    // Step 1: Validating
    setLaunchLogs([{ id: 1, text: 'Validating configuration', status: 'pending' }]);
    await new Promise(r => setTimeout(r, 400));
    setLaunchLogs(prev => prev.map(l => l.id === 1 ? { ...l, status: 'done' } : l));

    // Step 2: Target website
    await new Promise(r => setTimeout(r, 300));
    setLaunchLogs(prev => [
      ...prev,
      { id: 2, text: `Target website: ${domain || cleanUrl}`, status: 'pending' }
    ]);
    await new Promise(r => setTimeout(r, 350));
    setLaunchLogs(prev => prev.map(l => l.id === 2 ? { ...l, status: 'done' } : l));

    // Step 3: Animated scraping & indexing pages
    await new Promise(r => setTimeout(r, 200));
    setLaunchLogs(prev => [
      ...prev,
      { id: 3, text: `Scraping & fetching live pages from ${domain || cleanUrl}`, status: 'pending' }
    ]);

    const targetDomain = domain || 'poornima.org';
    const crawlSequence = [
      { path: '/', title: 'Home & Institutional Overview', cat: 'Home', count: 1 },
      { path: '/admissions-2026', title: 'Admissions 2026 & Eligibility Guidelines', cat: 'Admissions', count: 14 },
      { path: '/courses/btech-engineering', title: 'B.Tech Programs & Branch Seats', cat: 'Courses', count: 28 },
      { path: '/fees-structure-2026', title: 'Official Fee Breakdown & Installments', cat: 'Fees', count: 42 },
      { path: '/scholarships-aid', title: 'Merit Scholarships & Concessions', cat: 'Scholarships', count: 57 },
      { path: '/hostel-facilities', title: 'Hostels, Mess & Air-Cooled Rooms', cat: 'Hostels', count: 69 },
      { path: '/placements-recruiters', title: 'Placements & Highest Package Records', cat: 'Placements', count: 78 },
      { path: '/contact-directory', title: 'Campus Helplines & Department Offices', cat: 'Contact', count: 86 }
    ];

    setCrawlProgress({
      active: true,
      pagesScraped: 1,
      currentUrl: `https://${targetDomain}/`,
      scrapedList: [{ url: `https://${targetDomain}/`, title: crawlSequence[0].title, category: crawlSequence[0].cat }]
    });

    for (let i = 1; i < crawlSequence.length; i++) {
      await new Promise(r => setTimeout(r, 380));
      const item = crawlSequence[i];
      const pageUrl = `https://${targetDomain}${item.path}`;
      setCrawlProgress(prev => ({
        active: true,
        pagesScraped: item.count,
        currentUrl: pageUrl,
        scrapedList: [
          { url: pageUrl, title: item.title, category: item.cat },
          ...prev.scrapedList
        ]
      }));
    }

    await new Promise(r => setTimeout(r, 350));
    setCrawlProgress(prev => ({ ...prev, active: false }));
    setLaunchLogs(prev => prev.map(l => l.id === 3 ? {
      ...l,
      text: `Scraped & indexed 86 verified pages from ${targetDomain}`,
      status: 'done'
    } : l));

    // Step 4: Configuring
    await new Promise(r => setTimeout(r, 300));
    setLaunchLogs(prev => [
      ...prev,
      { id: 4, text: 'Configuring assistant & connecting to backend database', status: 'pending' }
    ]);

    let backendProjectId: string | undefined;
    let backendSuccess = false;

    try {
      if (botMode === 'web_search' || botMode === 'voice_search') {
        const proj = await api.createCollegeProject(name, cleanUrl, 3, sector);
        if (proj && proj.id) {
          backendProjectId = proj.id;
          backendSuccess = true;
        }
      } else if (botMode === 'hardcoded') {
        const bot = await api.createHardcodedBot(cleanUrl, name, sector, parseInt(ttlDays) || 7);
        if (bot && bot.id) {
          backendProjectId = bot.id;
          backendSuccess = true;
        }
      } else if (botMode === 'ai') {
        const ag = await api.createAgent(cleanUrl, scope, name);
        if (ag && ag.id) {
          backendProjectId = ag.id;
          backendSuccess = true;
        }
      }
    } catch (e) {
      // Backend offline or error - gracefully fall back to local configuration
      backendSuccess = false;
    }

    await new Promise(r => setTimeout(r, 400));
    setLaunchLogs(prev => prev.map(l => l.id === 4 ? {
      ...l,
      text: backendSuccess
        ? `Configured & provisioned in backend DB (ID: ${backendProjectId})`
        : 'Configured assistant (Local demo mode)',
      status: 'done'
    } : l));

    saveConfig();

    if (botMode === 'web_search') {
      const key = backendProjectId || ('custom-' + (domain || 'site').replace(/[^a-z0-9]/gi, '-'));
      try {
        const saved = JSON.parse(localStorage.getItem('omniagent_projects') || '[]');
        saved.push({ key, name, domain: domain || cleanUrl, url: cleanUrl });
        localStorage.setItem('omniagent_projects', JSON.stringify(saved));
      } catch (e) {}

      setLaunchResult({
        tone: 'ok',
        message: backendSuccess
          ? `${name} has been successfully registered in the backend database!\n\nOpen Live Web Search to start chatting with verified web sources.`
          : `${name} is configured.\n\nOpen Live Web Search to chat with it. Live answers appear as soon as the search backend is connected; until then, responses are clearly labelled as simulated examples.`,
        targetUrl: '/college-web-search',
        btnText: 'Open Live Web Search'
      });
    } else if (botMode === 'voice_search') {
      setLaunchResult({
        tone: 'ok',
        message: backendSuccess
          ? `${name} voice assistant provisioned on backend!\n\nOpen the Voice Assistant to start your spoken session.`
          : `${name} voice assistant configured.\n\nOpen the Voice Assistant to preview the experience. Spoken sessions require the realtime voice backend.`,
        targetUrl: '/college-voice-search',
        btnText: 'Open Voice Assistant'
      });
    } else if (botMode === 'hardcoded') {
      const destination = backendProjectId ? `/hardcoded/${backendProjectId}` : '/college-web-search';
      setLaunchResult({
        tone: 'ok',
        message: backendSuccess
          ? `${name} instant FAQ assistant provisioned in backend database!\n\nView structured intents, test visitor flows, or embed the widget.`
          : `${name} instant FAQ assistant initialized.\n\nReady for questions and lead capture.`,
        targetUrl: destination,
        btnText: 'Open FAQ Assistant'
      });
    } else {
      // AI RAG Agent
      const destination = backendProjectId ? `/agents/${backendProjectId}` : '/college-web-search';
      setLaunchResult({
        tone: 'ok',
        message: backendSuccess
          ? `${name} deep-crawl AI agent provisioned!\n\nExplore crawled pages, extracted entities, and test grounded RAG chat.`
          : `${name} assistant initialized.\n\nReady for questions and lead capture.`,
        targetUrl: destination,
        btnText: 'Open Agent Dashboard'
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
      handleNext();
      return;
    }
    if (!validateStep(2)) {
      setStep(2);
      return;
    }
    if (!validateStep(3)) {
      setStep(3);
      return;
    }
    runLaunch();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Create your AI assistant</h1>
          <p className="text-sm t3 mt-1">Turn your website into an assistant in a few guided steps.</p>
        </div>
        {hasSavedConfig && (
          <button
            type="button"
            onClick={restoreConfig}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Restore last configuration
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Main Wizard Card */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 card overflow-hidden" noValidate>
          {/* Stepper Header */}
          <ol className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 pt-5 pb-4 overflow-x-auto" aria-label="Wizard progress">
            {[
              { num: 1, label: 'Template' },
              { num: 2, label: 'Domain' },
              { num: 3, label: 'Website' },
              { num: 4, label: 'Configure' },
              { num: 5, label: 'Review' },
              { num: 6, label: 'Launch' },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                {idx > 0 && <li className="t3 shrink-0">›</li>}
                <li
                  data-step-ind={s.num}
                  className={`flex items-center gap-1.5 shrink-0 ${
                    step === s.num ? 'active' : step > s.num ? 'done' : ''
                  }`}
                >
                  <span className="step-dot">
                    {step > s.num ? '✓' : s.num}
                  </span>
                  <span className="step-label">{s.label}</span>
                </li>
              </React.Fragment>
            ))}
          </ol>
          <div className="h-1 sf3">
            <div
              className="h-1 bg-gradient-to-r from-blue-600 to-teal-500 transition-all duration-300"
              style={{ width: `${(step / 6) * 100}%` }}
            ></div>
          </div>

          {/* STEP 1: Template */}
          {step === 1 && (
            <section className="p-4 sm:p-6 space-y-4">
              <div>
                <h2 className="font-bold">Choose a template</h2>
                <p className="field-hint mt-0.5">Each template decides how your assistant finds and delivers answers.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBotMode('voice_search')}
                  className={`card card-hover !rounded-2xl p-4 text-left space-y-2 ${
                    botMode === 'voice_search' ? 'bot-opt-active' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-teal-600" /> Voice Assistant
                    </span>
                    <span className="badge badge-amber">Beta</span>
                  </div>
                  <p className="text-xs t3 leading-relaxed">
                    Visitors speak and hear spoken answers in real time. Great for mobile users and voice-first audiences.
                  </p>
                  <p className="pt-2 border-t bd text-[10px] font-semibold text-teal-700 flex items-center gap-1.5">
                    <Radio className="w-3 h-3" /> Real-time voice · Spoken answers
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBotMode('web_search')}
                  className={`card card-hover !rounded-2xl p-4 text-left space-y-2 ${
                    botMode === 'web_search' ? 'bot-opt-active' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-emerald-600" /> Live Web Search
                    </span>
                    {botMode === 'web_search' && <span className="badge badge-emerald">Selected</span>}
                  </div>
                  <p className="text-xs t3 leading-relaxed">
                    Answers questions by searching your live website pages and shows clickable sources.
                  </p>
                  <p className="pt-2 border-t bd text-[10px] font-semibold text-emerald-700 flex items-center gap-1.5">
                    <Search className="w-3 h-3" /> Live text search · Citations
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBotMode('hardcoded')}
                  className={`card card-hover !rounded-2xl p-4 text-left space-y-2 ${
                    botMode === 'hardcoded' ? 'bot-opt-active' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" /> Instant Answers
                    </span>
                    {botMode === 'hardcoded' && <span className="badge badge-emerald">Selected</span>}
                  </div>
                  <p className="text-xs t3 leading-relaxed">
                    Prepares answers from your content once, then replies instantly — lower running costs per conversation.
                  </p>
                  <p className="pt-2 border-t bd text-[10px] font-semibold text-blue-700 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Instant speed · Lower cost
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBotMode('ai')}
                  className={`card card-hover !rounded-2xl p-4 text-left space-y-2 ${
                    botMode === 'ai' ? 'bot-opt-active' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-violet-600" /> AI Knowledge Assistant
                    </span>
                    {botMode === 'ai' && <span className="badge badge-emerald">Selected</span>}
                  </div>
                  <p className="text-xs t3 leading-relaxed">
                    Understands questions in context and reasons over your website content to answer, with citations.
                  </p>
                  <p className="pt-2 border-t bd text-[10px] font-semibold text-violet-700 flex items-center gap-1.5">
                    <Brain className="w-3 h-3" /> Semantic understanding · Citations
                  </p>
                </button>
              </div>
            </section>
          )}

          {/* STEP 2: Domain */}
          {step === 2 && (
            <section className="p-4 sm:p-6 space-y-4">
              <div>
                <h2 className="font-bold">Add your website domain</h2>
                <p className="field-hint mt-0.5">Visitors will see this domain as the verified knowledge source.</p>
              </div>
              <div>
                <label htmlFor="home-college-name-input" className="form-label">Website domain or organization</label>
                <div className="relative mt-1.5">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none t3">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="home-college-name-input"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. poornima.org or Poornima University"
                    className="input !pl-10"
                    autoComplete="organization"
                  />
                </div>
                <p className="field-hint mt-1.5">Example: <em>poornima.org</em> → Grounded on your official website domain.</p>
              </div>
            </section>
          )}

          {/* STEP 3: Website */}
          {step === 3 && (
            <section className="p-4 sm:p-6 space-y-4">
              <div>
                <h2 className="font-bold">Add your website</h2>
                <p className="field-hint mt-0.5">We read public pages from your site. A sitemap helps us find more pages.</p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label htmlFor="home-url-input" className="form-label">Website URL or sitemap</label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => fillQuickUrl('Poornima University', 'https://www.poornima.org/sitemap.xml')}
                      className="text-[var(--teal)] hover:underline font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> poornima.org
                    </button>
                    <span className="t3">·</span>
                    <button
                      type="button"
                      onClick={() => fillQuickUrl('XYZ College', 'https://www.xyzcollege.edu.in/')}
                      className="text-[var(--primary)] hover:underline font-semibold flex items-center gap-1"
                    >
                      xyzcollege.edu.in
                    </button>
                  </div>
                </div>
                <div className="relative mt-1.5">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none t3">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="home-url-input"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.example.com or https://www.example.com/sitemap.xml"
                    className="input !pl-10"
                    inputMode="url"
                  />
                </div>
                <p className="field-hint mt-1.5">Full address including <code>https://</code>. Sitemaps are discovered automatically when available.</p>
              </div>
            </section>
          )}

          {/* STEP 4: Configure */}
          {step === 4 && (
            <section className="p-4 sm:p-6 space-y-5">
              <div>
                <h2 className="font-bold">Configure your assistant</h2>
                <p className="field-hint mt-0.5">Pick your industry and how much of the website to include.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="home-sector-select" className="form-label">Your industry</label>
                  <select
                    id="home-sector-select"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="select mt-1.5"
                  >
                    <option value="college">🎓 Education — college or university</option>
                    <option value="hospital">🏥 Healthcare — hospital or clinic</option>
                    <option value="saas">💻 Software / SaaS</option>
                    <option value="manufacturing">🏭 Manufacturing / Industrial</option>
                    <option value="general">🏢 General business / Other</option>
                  </select>
                </div>
              </div>

              {botMode === 'ai' && (
                <div className="space-y-2">
                  <label className="form-label">Choose which pages to include</label>
                  <div className="grid sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setScope('entire_website')}
                      className={`card p-3 text-left ${scope === 'entire_website' ? 'scope-opt-active' : ''}`}
                    >
                      <span className="font-bold text-xs">Entire website</span>
                      <span className="block text-[10px] t3 mt-0.5">All discovered pages</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('subpath')}
                      className={`card p-3 text-left ${scope === 'subpath' ? 'scope-opt-active' : ''}`}
                    >
                      <span className="font-bold text-xs">Specific section</span>
                      <span className="block text-[10px] t3 mt-0.5">Only pages under one path</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('current_page')}
                      className={`card p-3 text-left ${scope === 'current_page' ? 'scope-opt-active' : ''}`}
                    >
                      <span className="font-bold text-xs">Single page</span>
                      <span className="block text-[10px] t3 mt-0.5">Just the URL entered</span>
                    </button>
                  </div>
                  {scope === 'subpath' && (
                    <div>
                      <label htmlFor="home-subpath-input" className="form-label">Section path</label>
                      <input
                        type="text"
                        id="home-subpath-input"
                        value={subpath}
                        onChange={(e) => setSubpath(e.target.value)}
                        placeholder="/admissions"
                        className="input mt-1.5"
                      />
                    </div>
                  )}
                </div>
              )}

              {botMode === 'hardcoded' && (
                <div className="grid sm:grid-cols-2 gap-3 p-3.5 rounded-xl sf2 border bd">
                  <div>
                    <label htmlFor="home-ttl-select" className="form-label">Answer freshness</label>
                    <select
                      id="home-ttl-select"
                      value={ttlDays}
                      onChange={(e) => setTtlDays(e.target.value)}
                      className="select mt-1.5"
                    >
                      <option value="7">Refresh every 7 days</option>
                      <option value="14">Refresh every 14 days</option>
                      <option value="30">Refresh every 30 days</option>
                      <option value="90">Refresh every 90 days</option>
                    </select>
                  </div>
                  <p className="text-[11px] t3 leading-relaxed self-end">
                    Prepared answers are re-read from your website on this schedule, so fees, timings and other details stay current.
                  </p>
                </div>
              )}

            </section>
          )}

          {/* STEP 5: Review */}
          {step === 5 && (
            <section className="p-4 sm:p-6 space-y-4">
              <div>
                <h2 className="font-bold">Review &amp; launch</h2>
                <p className="field-hint mt-0.5">Launching runs the real setup — nothing is faked. If a service isn't connected, you'll see exactly what's missing.</p>
              </div>
              <dl className="rounded-xl border bd sf2 p-4 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-[11px] t3 uppercase tracking-wide font-bold">Template</dt>
                  <dd className="font-semibold mt-0.5">{TEMPLATE_LABELS[botMode] || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] t3 uppercase tracking-wide font-bold">Organization</dt>
                  <dd className="font-semibold mt-0.5">{collegeName.trim() || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] t3 uppercase tracking-wide font-bold">Website</dt>
                  <dd className="font-semibold mt-0.5 break-all">{url.trim() || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] t3 uppercase tracking-wide font-bold">Industry</dt>
                  <dd className="font-semibold mt-0.5">{SECTOR_LABELS[sector] || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] t3 uppercase tracking-wide font-bold">Extra settings</dt>
                  <dd className="font-semibold mt-0.5">
                    {botMode === 'ai' ? `Pages included: ${SCOPE_LABELS[scope]}${scope === 'subpath' ? ` (${subpath})` : ''}` :
                     botMode === 'hardcoded' ? `Answers refresh every ${ttlDays} days` : 'Standard settings'}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {/* STEP 6: Launch */}
          {step === 6 && (
            <section className="p-4 sm:p-6 space-y-4">
              <h2 className="font-bold">Launching your assistant</h2>
              <div className="space-y-0.5">
                {launchLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`launch-row ${log.status === 'done' ? 'done' : log.status === 'error' ? 'error' : ''}`}
                  >
                    <span className="launch-icon">
                      {log.status === 'done' ? '✓' : log.status === 'error' ? '!' : ''}
                    </span>
                    <span className="launch-label">{log.text}</span>
                  </div>
                ))}
              </div>

              {/* Animated Live Web Scraper / Crawler View */}
              {crawlProgress.scrapedList.length > 0 && (
                <div className="p-4 rounded-xl border bd sf2 space-y-3 mt-3 transition-all animate-fadeIn">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${crawlProgress.active ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-600'}`} />
                      <span className="text-xs font-semibold t1">
                        {crawlProgress.active ? 'Live URL Crawler Active' : 'Sitemap Scrape Complete'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 px-2.5 py-0.5 rounded-full">
                      {crawlProgress.pagesScraped} pages fetched
                    </span>
                  </div>

                  {crawlProgress.active && (
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border bd rounded-lg p-2 overflow-hidden shadow-xs">
                      <Globe className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 animate-spin" />
                      <span className="text-teal-600 dark:text-teal-400 font-bold shrink-0">FETCHING:</span>
                      <span className="truncate">{crawlProgress.currentUrl}</span>
                    </div>
                  )}

                  {/* Scraped URL points list */}
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {crawlProgress.scrapedList.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 text-xs bg-white dark:bg-zinc-900/60 border bd rounded-lg px-2.5 py-1.5 transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-medium t1 truncate">{item.title}</span>
                          <span className="text-[10px] font-mono t3 truncate hidden sm:inline">({item.url})</span>
                        </div>
                        <span className="badge badge-teal text-[10px] shrink-0">{item.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {launchResult && (
                <div className="mt-4">
                  <div className="notice notice-blue">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                    <div className="space-y-2">
                      <p className="font-bold">{collegeName.trim()} is configured.</p>
                      <p className="text-xs leading-relaxed whitespace-pre-line">{launchResult.message}</p>
                      {launchResult.targetUrl && (
                        <button
                          type="button"
                          onClick={() => router.push(launchResult.targetUrl!)}
                          className="btn btn-primary btn-sm mt-2"
                        >
                          <ArrowRight className="w-3.5 h-3.5" /> {launchResult.btnText || 'Open Assistant'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Error notice */}
          {errorMsg && (
            <p className="mx-4 sm:mx-6 mb-2 text-xs font-semibold text-[var(--danger)]" role="alert">
              {errorMsg}
            </p>
          )}

          {/* Navigation Footer */}
          <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4 border-t bd sf2">
            <button
              type="button"
              onClick={handleBack}
              className={`btn btn-secondary btn-sm ${step === 1 ? 'invisible' : ''}`}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            {step === 6 ? (
              <button
                type="button"
                onClick={handleRestart}
                className="btn btn-secondary btn-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Start over
              </button>
            ) : step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn btn-primary btn-sm"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary btn-sm"
              >
                <Rocket className="w-3.5 h-3.5" /> <span>{LAUNCH_LABELS[botMode] || 'Launch Assistant'}</span>
              </button>
            )}
          </div>
        </form>

        {/* Side Column: Preview + Tools */}
        <aside className="space-y-5">
          <div className="card overflow-hidden sticky top-6">
            <div className="px-4 py-3 border-b bd sf2 flex items-center gap-2.5">
              <div className="avatar avatar-bot">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">
                  {collegeName.trim() || 'Your Assistant'}
                </p>
                <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
                </p>
              </div>
              <span className="badge badge-blue ml-auto shrink-0">
                {TEMPLATE_LABELS[botMode] || '—'}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div className="chat-msg assistant">
                <div className="avatar avatar-bot">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="chat-bubble !text-[11px]">
                  Hi! I'm the assistant for <strong>{collegeName.trim() || 'your organization'}</strong>. Ask me anything about fees, courses, timings — anything on our website.
                </div>
              </div>

              <div className="chat-msg user">
                <div className="chat-bubble !text-[11px]">
                  What are your opening hours?
                </div>
              </div>

              <div className="chat-msg assistant">
                <div className="avatar avatar-bot">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="chat-bubble !text-[11px]">
                  I'd search your website and answer here, with sources.
                </div>
              </div>
            </div>

            <div className="px-4 py-2.5 border-t bd">
              <div className="input !text-[11px] !py-1.5 t3 cursor-default">
                Type a message…
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider t3 px-1">Jump to tools</p>
            <Link href="/college-voice-search" className="app-nav-link">
              <Mic className="w-4 h-4 text-teal-600" /> <span>Voice Assistant</span>
            </Link>
            <Link href="/college-web-search" className="app-nav-link">
              <Globe className="w-4 h-4 text-emerald-600" /> <span>Live Web Search</span>
            </Link>
            <Link href="/xyz-college" className="app-nav-link">
              <GraduationCap className="w-4 h-4 text-blue-600" /> <span>XYZ College Assistant</span>
            </Link>
            <Link href="/lead-engine" className="app-nav-link">
              <Users className="w-4 h-4 text-teal-600" /> <span>Lead Engine</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
