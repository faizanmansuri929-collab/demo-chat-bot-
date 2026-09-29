'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Globe, Bot, Send, Sparkles, ExternalLink, ShieldCheck, CheckCircle2,
  RefreshCw, Search, Layers, Sliders, ChevronDown, ChevronUp, AlertCircle,
  Clock, Database, ArrowRight, Zap, Info, Plus, Trash2, Check, X, BookOpen,
  GraduationCap, Building2, Briefcase, Home as HomeIcon, FileText, Settings,
  FolderPlus, Filter, CheckCircle, Mic
} from 'lucide-react';
import {
  api, CollegeWebSearchProject, CollegeWebSource,
  CollegeChatResponse, WebSearchDebugTrace, Citation,
  RebuildSourcesResult
} from '@/lib/api';
import { MarkdownContent } from '@/components/MarkdownContent';

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Citation[];
  sources_count?: number;
  is_live_searched?: boolean;
  debug_trace?: WebSearchDebugTrace;
  timestamp: string;
}

function CollegeWebSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialProjectId = searchParams.get('project_id') || '';

  const [activeTab, setActiveTab] = useState<'chat' | 'admin' | 'test'>('chat');
  
  // Projects State
  const [projects, setProjects] = useState<CollegeWebSearchProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>(initialProjectId);
  const [activeProject, setActiveProject] = useState<CollegeWebSearchProject | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // New Project Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newSitemapUrl, setNewSitemapUrl] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [createError, setCreateError] = useState('');

  // Rebuild State
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState<RebuildSourcesResult | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchStep, setSearchStep] = useState<string>('');
  const [expandedDebugId, setExpandedDebugId] = useState<string | null>(null);

  // Sources Allowlist State
  const [sources, setSources] = useState<CollegeWebSource[]>([]);
  const [sourceCategory, setSourceCategory] = useState<string>('All');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('All');
  const [sourceSearch, setSourceSearch] = useState<string>('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceCategory, setNewSourceCategory] = useState('Courses');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');

  // Test Tool State
  const [testQuery, setTestQuery] = useState('');
  const [testMaxSources, setTestMaxSources] = useState(3);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, searchStep]);

  // Load all projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // When activeProjectId or projects change, update activeProject and fetch sources
  useEffect(() => {
    if (projects.length > 0) {
      const current = projects.find(p => p.id === activeProjectId) || projects[0];
      if (current) {
        setActiveProjectId(current.id);
        setActiveProject(current);
        loadProjectSources(current.id);
        resetChatForProject(current);
      }
    }
  }, [activeProjectId, projects.length]);

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const list = await api.listCollegeProjects();
      setProjects(list);
      if (list.length > 0) {
        const targetId = initialProjectId && list.some(p => p.id === initialProjectId)
          ? initialProjectId
          : list[0].id;
        setActiveProjectId(targetId);
        const curr = list.find(p => p.id === targetId) || list[0];
        setActiveProject(curr);
        loadProjectSources(curr.id);
        resetChatForProject(curr);
      }
    } catch (err) {
      console.error("Failed to load college projects:", err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadProjectSources = async (projectId: string) => {
    try {
      const srcList = await api.getCollegeProjectSources(projectId);
      setSources(srcList);
    } catch (err) {
      console.error("Failed to load sources:", err);
    }
  };

  const resetChatForProject = (proj: CollegeWebSearchProject) => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 **Welcome to ${proj.college_name} Live Web Search Assistant!**\n\nI am dynamically connected to the official **${proj.base_domain}** sitemap and web sources. You can ask me anything about courses, admissions, eligibility, fee structures, faculty, or campus facilities.`,
        sources_count: proj.total_urls,
        is_live_searched: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSitemapUrl.trim()) return;

    setCreatingProject(true);
    setCreateError('');

    try {
      const proj = await api.createCollegeProject(
        newCollegeName.trim() || 'College / University',
        newSitemapUrl.trim(),
        3
      );
      setShowNewModal(false);
      setNewCollegeName('');
      setNewSitemapUrl('');
      // Reload projects list and switch
      const updatedList = await api.listCollegeProjects();
      setProjects(updatedList);
      setActiveProjectId(proj.id);
      setActiveProject(proj);
      loadProjectSources(proj.id);
      resetChatForProject(proj);
      router.push(`/college-web-search?project_id=${proj.id}`);
    } catch (err: any) {
      console.error("Create project failed:", err);
      setCreateError(err.response?.data?.detail || 'Failed to parse sitemap or create project. Please verify the URL.');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleRebuildSources = async () => {
    if (!activeProjectId || rebuilding) return;
    setRebuilding(true);
    setRebuildResult(null);

    try {
      const res = await api.rebuildCollegeProjectSources(activeProjectId);
      setRebuildResult(res);
      // Reload active project & sources
      const updatedProj = await api.getCollegeProject(activeProjectId);
      setActiveProject(updatedProj);
      loadProjectSources(activeProjectId);
    } catch (err: any) {
      console.error("Rebuild failed:", err);
      alert(err.response?.data?.detail || 'Failed to rebuild sources from sitemap.');
    } finally {
      setRebuilding(false);
    }
  };

  const handleSendMessage = async (msgToSend?: string) => {
    const text = (msgToSend || inputMessage).trim();
    if (!text || loading || !activeProjectId) return;

    const userMsg: ChatMessageItem = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    const domain = activeProject?.base_domain || 'college website';
    setSearchStep(`🔍 OpenAI analyzing query & selecting approved ${activeProject?.college_name || 'college'} links...`);

    const timer1 = setTimeout(() => {
      setSearchStep(`📄 Live fetching verified content from ${domain}...`);
    }, 900);

    const timer2 = setTimeout(() => {
      setSearchStep('✨ Synthesizing grounded answer with official citations...');
    }, 1800);

    try {
      const historyPayload = messages.slice(-4).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.chatCollegeProject(activeProjectId, text, historyPayload, true);

      clearTimeout(timer1);
      clearTimeout(timer2);
      setSearchStep('');

      const botMsg: ChatMessageItem = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        sources_count: res.sources_used_count,
        is_live_searched: res.is_live_searched,
        debug_trace: res.debug_trace,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setSearchStep('');
      console.error(err);

      const errorMsg: ChatMessageItem = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ I encountered an issue retrieving live data from ${domain}. Please try again or ask another question about courses and admissions.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSource = async (src: CollegeWebSource) => {
    if (!activeProjectId) return;
    try {
      await api.updateCollegeProjectSource(activeProjectId, src.id, { is_enabled: !src.is_enabled });
      setSources(prev => prev.map(s => s.id === src.id ? { ...s, is_enabled: !s.is_enabled } : s));
    } catch (err) {
      console.error("Failed to toggle source:", err);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!activeProjectId) return;
    if (!confirm("Are you sure you want to remove this URL from the approved allowlist?")) return;
    try {
      await api.deleteCollegeProjectSource(activeProjectId, id);
      setSources(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("Failed to delete source:", err);
    }
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim() || !activeProjectId) return;

    setTestLoading(true);
    try {
      const res = await api.testCollegeProjectSearch(activeProjectId, testQuery.trim(), testMaxSources);
      setTestResult(res);
    } catch (err) {
      console.error("Test search failed:", err);
    } finally {
      setTestLoading(false);
    }
  };

  const filteredSources = sources.filter(s => {
    const matchesCat = sourceCategory === 'All' || s.category.toLowerCase() === sourceCategory.toLowerCase();
    const matchesType = sourceTypeFilter === 'All' || s.source_type === sourceTypeFilter;
    const matchesSearch = !sourceSearch || 
      s.title.toLowerCase().includes(sourceSearch.toLowerCase()) || 
      s.url.toLowerCase().includes(sourceSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(sourceSearch.toLowerCase());
    return matchesCat && matchesType && matchesSearch;
  });

  const uniqueCategories = ['All', ...Array.from(new Set(sources.map(s => s.category).filter(Boolean)))];

  const suggestedPrompts = activeProject?.id === 'proj_poornima' ? [
    "What B.Tech courses does Poornima offer?",
    "Tell me about campus placements & top recruiters.",
    "What hostel facilities and dining are available?",
    "What is the B.Tech admission process & eligibility?",
    "What are the annual placement statistics and packages?",
    "Tell me about the IBM collaboration and certifications."
  ] : [
    `What undergraduate and postgraduate courses are offered?`,
    `What is the admission procedure and eligibility criteria?`,
    `Tell me about campus placements, packages, and recruiters.`,
    `What are the hostel and campus facility details?`,
    `What scholarships or financial assistance are available?`
  ];

  if (projectsLoading) {
    return (
      <div className="max-w-6xl mx-auto py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
        <div className="text-sm font-bold text-slate-800">Loading College Web Search Engine...</div>
        <p className="text-xs text-slate-500">Connecting to approved college sitemaps and sources...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-3 sm:py-6 px-2 sm:px-4 space-y-4 sm:space-y-6">
      {/* Top Banner & Mode Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-xl relative overflow-hidden border border-emerald-600/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5 relative z-10">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
                <Globe className="w-3.5 h-3.5 text-emerald-300" /> College Live Web Search
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] sm:text-xs font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Search Active
              </span>
              {activeProject && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 text-[10px] sm:text-xs font-mono">
                  {activeProject.base_domain} ({sources.length} URLs)
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                {activeProject ? activeProject.college_name : 'College Web Search Assistant'}
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              OpenAI dynamically selects top 1–3 verified sitemap links for <strong>{activeProject?.base_domain || 'college'}</strong>, live searches the web, and returns grounded answers with clickable source citations.
            </p>
          </div>

          {/* Project Switcher + Tab Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto shrink-0">
            {/* Project Switcher Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-emerald-500/30 min-w-0">
              <select
                value={activeProjectId}
                onChange={(e) => {
                  const pId = e.target.value;
                  setActiveProjectId(pId);
                  router.push(`/college-web-search?project_id=${pId}`);
                }}
                className="bg-transparent text-xs font-bold text-emerald-100 focus:outline-none px-2 py-1 cursor-pointer truncate w-full"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    🎓 {p.college_name} ({p.base_domain})
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowNewModal(true)}
                title="Add New College Sitemap"
                className="p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-1 text-xs font-bold shadow-sm shrink-0"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New College</span>
              </button>
            </div>

            {/* Tab Controls */}
            <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-900/60 p-1 rounded-2xl border border-emerald-500/30 backdrop-blur-md overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  activeTab === 'chat'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-emerald-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <Bot className="w-3.5 h-3.5" /> Chat
              </button>
              <Link
                href={`/college-voice-search?project_id=${activeProjectId || ''}`}
                className="flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-extrabold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all flex items-center justify-center gap-1 sm:gap-1.5 shadow-md shadow-teal-500/20 whitespace-nowrap"
                title="Switch to Realtime Spoken Voice Mode"
              >
                <Mic className="w-3.5 h-3.5 animate-pulse" /> Voice
              </Link>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-emerald-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> URLs ({sources.length})
              </button>
              <button
                onClick={() => setActiveTab('test')}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  activeTab === 'test'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-emerald-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> Debug
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD NEW COLLEGE SITEMAP */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg">
                <FolderPlus className="w-5 h-5 text-emerald-600" />
                <span>Add College via Sitemap URL</span>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter the college name and its official <code>sitemap.xml</code> URL. Our engine will automatically parse regular and nested sitemap indices to discover all official web pages.
            </p>

            {createError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">College / University Name</label>
                <input
                  type="text"
                  placeholder="e.g. Poornima University, Stanford, IIT Delhi"
                  value={newCollegeName}
                  onChange={(e) => setNewCollegeName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Sitemap XML URL</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCollegeName('Poornima University');
                      setNewSitemapUrl('https://www.poornima.org/sitemap.xml');
                    }}
                    className="text-[11px] text-emerald-600 hover:underline font-semibold"
                  >
                    Use poornima.org
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="https://examplecollege.edu/sitemap.xml"
                  value={newSitemapUrl}
                  onChange={(e) => setNewSitemapUrl(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProject || !newSitemapUrl.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {creatingProject ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Ingesting Sitemap...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Create &amp; Ingest Sitemap
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 1: LIVE SEARCH CHAT */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Main Chat Interface (3 cols) */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col h-[550px] sm:h-[700px] overflow-hidden">
            {/* Chat Messages Container */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50/40">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-1.5 sm:space-y-2 w-full`}
                >
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {m.role === 'user' ? 'You' : `${activeProject?.college_name || 'College'} Live AI`}
                    </span>
                    <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 sm:p-5 rounded-2xl max-w-full sm:max-w-2xl text-xs sm:text-sm leading-relaxed overflow-hidden ${
                      m.role === 'user'
                        ? 'bg-gradient-to-tr from-emerald-700 to-teal-700 text-white rounded-br-sm shadow-md'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <div className="overflow-x-auto">
                      <MarkdownContent
                        content={m.content}
                        isUser={m.role === 'user'}
                        className={m.role === 'user' ? 'text-white' : 'text-slate-800'}
                      />
                    </div>

                    {/* SOURCE TRANSPARENCY SECTION */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-emerald-600" />
                              Sources used: <span className="text-emerald-700 font-extrabold">{m.sources.length} pages</span>
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                            Live searched
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {m.sources.map((src, sIdx) => (
                            <a
                              key={sIdx}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 transition-all flex items-start justify-between gap-2 group text-left"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-800 truncate">
                                  {src.title}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                                  {src.url.replace(/^https?:\/\/(www\.)?/, '')}
                                </div>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0 mt-0.5 transition-colors" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Collapsible Debug Trace Accordion */}
                    {m.debug_trace && (
                      <div className="mt-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setExpandedDebugId(expandedDebugId === m.id ? null : m.id)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                        >
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>{expandedDebugId === m.id ? 'Hide Trace' : 'Show AI Search Decision & Trace'}</span>
                          {expandedDebugId === m.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {expandedDebugId === m.id && (
                          <div className="mt-2.5 p-3 bg-slate-900 text-emerald-300 rounded-xl text-xs font-mono space-y-2 border border-slate-700 overflow-x-auto">
                            <div className="flex justify-between border-b border-slate-800 pb-1.5 gap-2">
                              <span className="text-slate-400">Intent:</span>
                              <span className="text-white font-bold truncate">{m.debug_trace.detected_intent}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-1.5 gap-2">
                              <span className="text-slate-400">Query:</span>
                              <span className="text-emerald-400 truncate max-w-xs">{m.debug_trace.optimized_search_query}</span>
                            </div>
                            <div className="border-b border-slate-800 pb-1.5 space-y-1">
                              <span className="text-slate-400">AI Selection Reason:</span>
                              <p className="text-slate-300 font-sans text-[11px] leading-tight">
                                {m.debug_trace.ai_link_selection_reason || 'Relevance-ranked selection'}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-400">Selected URLs ({m.debug_trace.selected_sources.length}):</span>
                              <ul className="list-disc pl-4 space-y-0.5 mt-1 text-slate-300 text-[11px]">
                                {m.debug_trace.selected_sources.map((s, idx) => (
                                  <li key={idx} className="truncate">
                                    {s.title} ({s.url})
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800">
                              <span>Latency: {m.debug_trace.processing_time_ms} ms</span>
                              <span>Cache: {m.debug_trace.cache_hit ? 'HIT' : 'MISS'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* SEARCH PROGRESS STEP INDICATOR */}
              {loading && (
                <div className="flex items-center gap-2.5 p-3.5 sm:p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 text-xs font-semibold animate-pulse shadow-sm">
                  <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin shrink-0" />
                  <span>{searchStep || `Searching ${activeProject?.base_domain || 'college website'}...`}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts Pills */}
            <div className="px-3 sm:px-4 py-2 bg-white border-t border-slate-100 overflow-x-auto flex items-center gap-1.5 sm:gap-2 shrink-0 scrollbar-none pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Prompts:
              </span>
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  disabled={loading}
                  className="px-2.5 sm:px-3 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-[11px] sm:text-xs whitespace-nowrap transition-all font-medium disabled:opacity-50 shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="p-2.5 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={`Ask ${activeProject?.college_name || 'college'} courses, fees, hostels...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={loading}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm transition-all"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            </form>
          </div>

          {/* Right Sidebar: Project Info & Policies (1 col) */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>College Project Profile</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {activeProject?.status || 'READY'}
                </span>
              </div>
              
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="font-bold text-slate-900">{activeProject?.college_name}</div>
                <div className="truncate font-mono text-[11px] text-slate-500">{activeProject?.sitemap_url}</div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Discovered Sources:</span>
                  <strong className="text-slate-900">{sources.length} URLs</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Active Allowlist URLs:</span>
                  <strong className="text-emerald-700 font-bold">{sources.filter(s => s.is_enabled).length} URLs</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Max Sources / Query:</span>
                  <strong className="text-slate-900">{Math.max(activeProject?.max_sources_per_query || 5, 5)} pages</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cache Window:</span>
                  <strong className="text-slate-900">{((activeProject?.cache_ttl_seconds || 600) / 60)} mins</strong>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRebuildSources}
                  disabled={rebuilding}
                  className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${rebuilding ? 'animate-spin' : ''}`} />
                  <span>{rebuilding ? 'Rebuilding from Sitemap...' : 'Rebuild Sources from Sitemap'}</span>
                </button>
              </div>

              {rebuildResult && (
                <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-300 text-[11px] font-mono space-y-1">
                  <div className="text-white font-bold">{rebuildResult.message}</div>
                  <div className="text-[10px] text-slate-400">
                    Total: {rebuildResult.total_urls} | Added: +{rebuildResult.added_count} | Removed: -{rebuildResult.removed_count}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-tr from-slate-900 to-emerald-950 text-white rounded-2xl p-5 shadow-sm space-y-3 border border-emerald-800/40">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Search Pipeline</span>
              </div>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal pl-4">
                <li><strong>Intent Routing:</strong> Classifies user intent across courses, fees, admissions, or placements.</li>
                <li><strong>OpenAI Selection:</strong> Chooses top 1–3 official {activeProject?.base_domain || 'college'} links.</li>
                <li><strong>Live Fetching:</strong> Pulls real page text on the fly.</li>
                <li><strong>Grounded Answer:</strong> Synthesizes verified answer with clickable sources.</li>
              </ol>
            </div>

            <button
              onClick={() => setActiveTab('admin')}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Sliders className="w-4 h-4 text-slate-600" />
              <span>Manage {sources.length} Ingested URLs</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SITEMAP ALLOWLIST ADMIN */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          {/* Top Project Action Banner */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  {activeProject?.college_name} Sources Allowlist
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                  {activeProject?.base_domain}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Parsed from sitemap: <code>{activeProject?.sitemap_url}</code>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRebuildSources}
                disabled={rebuilding}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rebuilding ? 'animate-spin' : ''}`} />
                <span>{rebuilding ? 'Rebuilding Sources...' : 'Rebuild Sources'}</span>
              </button>
            </div>
          </div>

          {rebuildResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span><strong>{rebuildResult.message}</strong> (Total: {rebuildResult.total_urls} URLs, Added: +{rebuildResult.added_count}, Removed: -{rebuildResult.removed_count})</span>
              </div>
              <button onClick={() => setRebuildResult(null)} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sources Allowlist Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  Discovered URLs Allowlist ({filteredSources.length} / {sources.length})
                </h3>
                <p className="text-xs text-slate-500">Live search queries are strictly limited to active URLs from this college.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search URLs or titles..."
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48"
                  />
                </div>

                <select
                  value={sourceCategory}
                  onChange={(e) => setSourceCategory(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {uniqueCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={sourceTypeFilter}
                  onChange={(e) => setSourceTypeFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="All">All Types</option>
                  <option value="HTML">HTML Webpages</option>
                  <option value="PDF">PDF Documents</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-900 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-4">Page Title &amp; Category</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Official College URL</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredSources.map((src, idx) => (
                    <tr key={src.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{src.title}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          {src.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          src.source_type === 'PDF'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {src.source_type || 'HTML'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-emerald-800">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1 group"
                        >
                          <span className="truncate max-w-xs sm:max-w-sm">{src.url}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                        </a>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSource(src)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase transition-all ${
                            src.is_enabled
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {src.is_enabled ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteSource(src.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove from allowlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSources.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No sources match your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEVELOPER SEARCH DEBUG & TEST TOOL */}
      {activeTab === 'test' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              Live Search Intent &amp; Link Selection Inspector ({activeProject?.college_name})
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Test how OpenAI classifies query intent, executes relevance ranking across <strong>{activeProject?.base_domain}</strong> sitemap sources, and picks the top 1–3 links.
            </p>
          </div>

          <form onSubmit={handleRunTest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-9 space-y-1">
                <label className="text-xs font-bold text-slate-700">Test Query</label>
                <input
                  type="text"
                  placeholder={`e.g. What are the B.Tech branches and placement statistics?`}
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-xs font-bold text-slate-700">Max Sources</label>
                <select
                  value={testMaxSources}
                  onChange={(e) => setTestMaxSources(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={1}>1 Source</option>
                  <option value={2}>2 Sources</option>
                  <option value={3}>3 Sources</option>
                  <option value={4}>4 Sources</option>
                  <option value={5}>5 Sources (Default)</option>
                  <option value={6}>6 Sources (Comprehensive)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={testLoading || !testQuery.trim()}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {testLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating Query...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Run Search Test
                </>
              )}
            </button>
          </form>

          {/* Test Results Display */}
          {testResult && (
            <div className="p-5 rounded-2xl bg-slate-900 text-white font-mono text-xs space-y-4 border border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Detected Intent:</span>
                  <span className="text-emerald-400 font-bold text-sm">{testResult.detected_intent}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Optimized Search Query:</span>
                  <span className="text-white text-xs">{testResult.optimized_search_query}</span>
                </div>
              </div>

              <div>
                <span className="text-amber-400 font-bold block mb-2">
                  🏆 Top Selected Sources ({testResult.selected_sources?.length || 0}):
                </span>
                <div className="space-y-2">
                  {testResult.selected_sources?.map((s: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-800/80 rounded-xl border border-emerald-500/30">
                      <div className="flex items-center justify-between">
                        <strong className="text-white text-xs">{s.title}</strong>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          Score: {s.score}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-300 truncate mt-0.5">{s.url}</div>
                      <div className="text-[10px] text-slate-400 mt-1">Status: {s.fetch_status || 'OK'}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-bold block mb-2">
                  Evaluated Candidate Pool ({testResult.candidate_sources?.length || 0}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {testResult.candidate_sources?.map((c: any, idx: number) => (
                    <div key={idx} className="p-2 bg-slate-800/40 rounded-lg text-[11px] border border-slate-700 truncate">
                      <span className="text-slate-400">#{idx+1} [{c.category}]</span> <span className="text-slate-200 font-semibold">{c.title}</span> (Score: {c.score})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CollegeWebSearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto py-12 flex items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-700 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading College Web Search Engine...</span>
        </div>
      </div>
    }>
      <CollegeWebSearchContent />
    </Suspense>
  );
}
