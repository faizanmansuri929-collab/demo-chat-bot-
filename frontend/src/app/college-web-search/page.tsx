'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe, FolderPlus, Bot, Mic, FileText, Send,
  RefreshCw, ExternalLink, AlertTriangle, Info, Search, CheckCircle2, Loader2
} from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import NewWebsiteModal from '@/components/NewWebsiteModal';
import { api, CollegeWebSource } from '@/lib/api';
import { WebProject, genericSamples } from '@/lib/demoData';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text?: string;
  markdown?: string;
  sources?: string[];
  simulated?: boolean;
}

export default function CollegeWebSearchPage() {
  const [projects, setProjects] = useState<Record<string, WebProject>>({});
  const [currentKey, setCurrentKey] = useState<string>('proj_poornima');
  const [activeTab, setActiveTab] = useState<'chat' | 'sources'>('chat');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRefreshingUrls, setIsRefreshingUrls] = useState(false);
  const [backendActive, setBackendActive] = useState(true);
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceCategory, setSourceCategory] = useState('All');
  const [detailedSources, setDetailedSources] = useState<CollegeWebSource[]>([]);

  // Default fallback project if none loaded yet
  const defaultProject: WebProject = {
    key: 'proj_poornima',
    name: 'Poornima University & Colleges',
    domain: 'poornima.org',
    url: 'https://www.poornima.org/sitemap.xml',
    desc: 'The assistant dynamically selects the most relevant pages from the sitemap, reads live web content, and returns grounded answers with clickable citations.',
    urls: [],
    samples: [
      {
        q: 'What is the B.Tech CSE fee structure?',
        keys: ['fee', 'btech', 'cse', 'cost', 'tuition'],
        a: 'The annual fee for B.Tech in Computer Engineering at Poornima is INR 121,306.'
      },
      {
        q: 'Hostel AC and non-AC room charges?',
        keys: ['hostel', 'mess', 'room', 'ac'],
        a: 'Hostel fees range from INR 115,000 for Non-Air Cooled to INR 135,000 for AC rooms.'
      }
    ]
  };

  const project = projects[currentKey] || defaultProject;

  // 1. Load all real sitemap projects from backend on mount
  useEffect(() => {
    let active = true;

    async function loadBackendData() {
      try {
        const health = await api.checkHealth();
        if (active) {
          setBackendActive(Boolean(health));
        }

        const backendProjects = await api.listCollegeProjects();
        if (active && Array.isArray(backendProjects) && backendProjects.length > 0) {
          const map: Record<string, WebProject> = {};
          
          backendProjects.forEach((bp) => {
            map[bp.id] = {
              key: bp.id,
              name: bp.college_name,
              domain: bp.base_domain,
              url: bp.sitemap_url,
              desc: `Dynamic assistant for ${bp.college_name} — live sitemap search on ${bp.base_domain} (${bp.total_urls || 0} pages indexed).`,
              urls: [],
              samples: genericSamples(bp.college_name, bp.base_domain)
            };
          });

          setProjects(map);

          // Select first project or keep poornima if available
          if (!map[currentKey]) {
            const hasPoornima = backendProjects.find((p) => p.id === 'proj_poornima');
            setCurrentKey(hasPoornima ? 'proj_poornima' : backendProjects[0].id);
          }
        }
      } catch (err) {
        if (active) {
          setBackendActive(false);
          setProjects({ proj_poornima: defaultProject });
        }
      }
    }

    loadBackendData();
    return () => { active = false; };
  }, []);

  // 2. Fetch real discovered sitemap URLs whenever currentKey changes
  useEffect(() => {
    let active = true;

    async function fetchSources() {
      if (!currentKey) return;
      try {
        const srcs = await api.getCollegeProjectSources(currentKey);
        if (active && Array.isArray(srcs)) {
          setDetailedSources(srcs);
          setProjects((prev) => {
            if (!prev[currentKey]) return prev;
            return {
              ...prev,
              [currentKey]: {
                ...prev[currentKey],
                urls: srcs.map((s) => s.url)
              }
            };
          });
        }
      } catch (e) {
        if (active) setDetailedSources([]);
      }
    }

    fetchSources();
    return () => { active = false; };
  }, [currentKey]);

  // 3. Reset welcome message when project changes
  useEffect(() => {
    setMessages([
      {
        id: 'intro-' + currentKey,
        role: 'assistant',
        markdown: `Namaste! I am the dynamic web search assistant for **${project.name}**.\n\nI dynamically search the live pages and sitemap of **${project.domain}** in real time. Ask about admissions, courses, fees, eligibility, or hostels!`
      }
    ]);
  }, [currentKey, project.name, project.domain]);

  const handleSwitchProject = (key: string) => {
    setCurrentKey(key);
  };

  const handleProjectAdded = (newProj: WebProject) => {
    setProjects((prev) => ({
      ...prev,
      [newProj.key]: newProj
    }));
    setCurrentKey(newProj.key);
  };

  const sendMessage = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setInputVal('');

    setMessages((prev) => [
      ...prev,
      { id: 'u-' + Date.now(), role: 'user', text: q }
    ]);

    setIsTyping(true);

    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.text || m.markdown || '' }));

    // Execute dynamic backend live web search on project sitemap
    try {
      const res = await api.chatCollegeProject(currentKey, q, history, true);
      setIsTyping(false);
      if (res && res.answer) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'a-' + Date.now(),
            role: 'assistant',
            markdown: res.answer,
            sources: res.sources?.map((s) => s.url) || [project.domain],
            simulated: !res.is_live_searched
          }
        ]);
        return;
      }
    } catch (err: any) {
      console.error('Chat error:', err);
    }

    // Graceful fallback if backend call throws
    setIsTyping(false);
    const low = q.toLowerCase();
    let hit = (project.samples || []).find((s) => s.keys.some((k) => low.includes(k)));

    setMessages((prev) => [
      ...prev,
      {
        id: 'a-' + Date.now(),
        role: 'assistant',
        markdown: hit
          ? hit.a
          : `I attempted a dynamic search across **${project.domain}** for "${q}". Please check if the backend is running and the sitemap URLs are indexed.`,
        simulated: true,
        sources: [project.domain]
      }
    ]);
  };

  const handleRefreshUrls = async () => {
    setIsRefreshingUrls(true);
    try {
      // Rebuild & refresh sources from sitemap
      await api.rebuildCollegeProjectSources(currentKey);
      const srcs = await api.getCollegeProjectSources(currentKey);
      if (Array.isArray(srcs)) {
        setDetailedSources(srcs);
        setProjects((prev) => ({
          ...prev,
          [currentKey]: {
            ...prev[currentKey],
            urls: srcs.map((s) => s.url)
          }
        }));
      }
    } catch (e) {
      console.warn('Rebuild failed:', e);
    }
    setIsRefreshingUrls(false);
  };

  // Filter sources
  const filteredSources = detailedSources.filter((s) => {
    const matchesCat = sourceCategory === 'All' || s.category === sourceCategory;
    const q = sourceSearch.toLowerCase().trim();
    const matchesSearch = !q || s.title?.toLowerCase().includes(q) || s.url?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const categories = Array.from(new Set(detailedSources.map((s) => s.category).filter(Boolean)));

  return (
    <DashboardShell activeNav="college-web-search">
      <div className="space-y-4">
        {/* Emerald Header Banner */}
        <div className="rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-900 to-[#0A1B33] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge !bg-emerald-500/20 !text-emerald-200 !border-emerald-400/30">
                  <Globe className="w-3 h-3" /> Live Dynamic Web Search
                </span>
                <span className="badge !bg-emerald-400/15 !text-emerald-300 !border-emerald-400/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {detailedSources.length} Sitemap URLs Active
                </span>
                <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-600 text-slate-300">
                  {project.domain}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {project.name}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
                {project.desc}
              </p>
            </div>

            {/* Project Switcher & Add Website */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-emerald-500/40 min-w-0 shadow-lg">
                <select
                  value={currentKey}
                  onChange={(e) => handleSwitchProject(e.target.value)}
                  className="bg-transparent text-xs font-bold text-emerald-100 focus:outline-none px-2 py-1 cursor-pointer max-w-[14rem]"
                  aria-label="Switch sitemap project"
                >
                  {Object.values(projects).map((p) => (
                    <option key={p.key} value={p.key} className="bg-slate-900 text-white">
                      {p.name} ({p.domain})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  title="Add another website or sitemap"
                  className="p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-1 text-xs font-bold shrink-0"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Website</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`btn btn-sm ${activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Bot className="w-3.5 h-3.5" /> Live Search Chat
          </button>
          <Link href="/college-voice-search" className="btn btn-sm btn-secondary">
            <Mic className="w-3.5 h-3.5" /> Voice Assistant Mode
          </Link>
          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`btn btn-sm ${activeTab === 'sources' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FileText className="w-3.5 h-3.5" /> Discovered Sitemap URLs ({detailedSources.length})
          </button>
        </div>

        {/* TAB 1: Chat */}
        {activeTab === 'chat' && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b bd sf2 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="avatar avatar-bot">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-none">{project.name} Web Assistant</p>
                  <p className="text-[10px] t3 mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected to {project.domain} ({detailedSources.length} verified pages)
                  </p>
                </div>
              </div>

              {/* Sample Quick Questions */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-md py-1">
                {(project.samples || []).map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(s.q)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg border bd sf hover:border-emerald-500 transition-colors whitespace-nowrap text-[var(--text-2)]"
                  >
                    {s.q}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="h-[460px] overflow-y-auto p-4 space-y-3.5 sf" role="log">
              {messages.map((m) => (
                <div key={m.id} className={`chat-msg ${m.role === 'user' ? 'user' : 'assistant'}`}>
                  {m.role === 'assistant' && (
                    <div className="avatar avatar-bot">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="min-w-0 max-w-[85%]">
                    {m.simulated && (
                      <span className="sim-badge mb-1">
                        <Info className="w-2.5 h-2.5" /> Demo Example
                      </span>
                    )}
                    <div
                      className="chat-bubble md text-xs sm:text-sm"
                      dangerouslySetInnerHTML={{
                        __html: renderSimpleMarkdown(m.markdown || m.text || '')
                      }}
                    />
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] t3 font-semibold">Sources:</span>
                        {m.sources.map((s, idx) => (
                          <a
                            key={idx}
                            href={s.startsWith('http') ? s : `https://${s}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="source-pill"
                          >
                            {s.replace(/^https?:\/\//, '').slice(0, 36)}…
                            <ExternalLink className="w-2.5 h-2.5 ml-1 inline" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="chat-msg assistant">
                  <div className="avatar avatar-bot">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="chat-bubble">
                    <span className="typing">
                      <span></span><span></span><span></span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(inputVal);
              }}
              className="p-3 border-t bd sf2 flex gap-2"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="input !text-xs !py-2 w-full"
                placeholder={`Ask anything about ${project.name} (e.g. fees, courses, placements, cutoff)…`}
                disabled={isTyping}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isTyping}
                className="btn btn-primary btn-sm !py-2 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: Discovered URLs */}
        {activeTab === 'sources' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b bd sf2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Discovered Sitemap Inventory: {project.name}
                  <span className="badge badge-emerald text-xs">{detailedSources.length} Pages</span>
                </h3>
                <p className="text-xs t3 mt-0.5">
                  The AI search engine dynamically selects from these approved sitemap URLs when answering questions.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleRefreshUrls}
                  disabled={isRefreshingUrls}
                  className="btn btn-secondary btn-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingUrls ? 'animate-spin' : ''}`} />
                  {isRefreshingUrls ? 'Re-crawling…' : 'Re-crawl Sitemap'}
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="px-4 py-2.5 border-b bd bg-[var(--surface)] flex flex-col sm:flex-row gap-2 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 t3" />
                <input
                  type="text"
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  placeholder="Filter discovered pages…"
                  className="input !pl-8 !py-1.5 !text-xs w-full"
                />
              </div>

              {categories.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-1">
                  <button
                    type="button"
                    onClick={() => setSourceCategory('All')}
                    className={`text-xs px-2.5 py-1 rounded-lg border bd font-semibold ${
                      sourceCategory === 'All' ? 'bg-[var(--primary)] text-white' : 'sf2 t3 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    All ({detailedSources.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSourceCategory(cat!)}
                      className={`text-xs px-2.5 py-1 rounded-lg border bd font-semibold whitespace-nowrap ${
                        sourceCategory === cat ? 'bg-[var(--primary)] text-white' : 'sf2 t3 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sources List */}
            <div className="max-h-[480px] overflow-y-auto p-4 divide-y bd">
              {filteredSources.length > 0 ? (
                filteredSources.map((s, idx) => (
                  <div key={s.id || idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-1)] truncate">
                          {s.title || s.url}
                        </span>
                        {s.category && (
                          <span className="badge badge-slate text-[10px] !py-0 !px-1.5">
                            {s.category}
                          </span>
                        )}
                      </div>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--primary)] hover:underline truncate block text-[11px] font-mono"
                      >
                        {s.url}
                      </a>
                    </div>
                    <span className="badge badge-emerald text-[10px] shrink-0">
                      Approved Source
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center t3 text-xs">
                  {detailedSources.length === 0
                    ? 'No sitemap URLs discovered yet. Click Re-crawl Sitemap or verify the sitemap URL.'
                    : 'No pages matched your search filter.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <NewWebsiteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectAdded={handleProjectAdded}
      />
    </DashboardShell>
  );
}

function renderSimpleMarkdown(content: string): string {
  if (!content) return '';

  let html = content
    .replace(/\|(.+)\|\n\|[-|\s]+\|\n((?:\|.+\|\n?)+)/g, (match, header, rows) => {
      const headers = header.split('|').filter((h: string) => h.trim() !== '');
      const headerHtml = `<tr>${headers.map((h: string) => `<th>${h.trim()}</th>`).join('')}</tr>`;
      const rowsHtml = rows
        .trim()
        .split('\n')
        .map((r: string) => {
          const cols = r.split('|').filter((c: string) => c.trim() !== '');
          return `<tr>${cols.map((c: string) => `<td>${c.trim()}</td>`).join('')}</tr>`;
        })
        .join('');
      return `<table><thead>${headerHtml}</thead><tbody>${rowsHtml}</tbody></table>`;
    })
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-[var(--surface-3)] font-mono text-[11px]">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');

  html = html.replace(/(<li>.+<\/li>)+/g, '<ul>$&</ul>');

  html = html
    .split('\n\n')
    .map((p) => {
      if (p.startsWith('<table>') || p.startsWith('<ul>') || p.startsWith('<blockquote>')) return p;
      return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');

  return html;
}
