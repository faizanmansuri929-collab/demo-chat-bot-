'use client';

import React, { useState } from 'react';
import { Send, Sparkles, ExternalLink, Bot, Check, Users } from 'lucide-react';
import { api } from '@/lib/api';

const DEMO_QA = [
  {
    q: 'What can OmniAgent do?',
    keys: ['what', 'omniagent', 'can', 'do', 'your product', 'platform', 'who are', 'features'],
    a: '**OmniAgent AI** is a universal website-to-AI agent platform that transforms any public website into an intelligent, multi-modal assistant.\n\n- 🎙️ **Realtime WebRTC Voice**: Speak naturally with visitors using ultra-low latency voice (Push-to-Talk & Hands-free).\n- 🔍 **Live Grounded Web Search**: Directly reads your live website sitemap with 10-minute caching and zero-hallucination citations.\n- 🎯 **Lead Engine & CRM**: Captures prospective leads (Name, Email, Phone, Interest) and auto-scores them (0–100).\n- 🧠 **ChromaDB Vector RAG**: Deep crawling with tenant-isolated vector search and hybrid BM25 ranking.\n- ⚡ **Instant FAQ Matching**: Deterministic sub-millisecond keyword/regex responses at $0 LLM cost.\n- 🛒 **eCommerce Scraper**: Automated catalog extraction (like Instamart) with price tracking and Excel/CSV export.\n- 🔌 **Embeddable Widget**: Add one `<script>` tag to embed the assistant on any website.',
    sources: ['omniagent.ai/features', 'omniagent.ai/docs']
  },
  {
    q: 'How do I create an assistant?',
    keys: ['how', 'create', 'build', 'start', 'setup', 'set up', 'make', 'assistant'],
    a: 'Creating an assistant takes three simple steps:\n\n1. **Add your website** — paste your homepage or XML sitemap link in the wizard\n2. **Automated Deep Crawl** — OmniAgent discovers your content, extracts structured entities, and builds a grounded knowledge base\n3. **Launch & Embed** — configure voice/text personas, test in the playground, and deploy using a single `<script>` tag on your website!',
    sources: ['omniagent.ai/get-started', 'omniagent.ai/create']
  },
  {
    q: 'Can it capture leads for my team?',
    keys: ['lead', 'capture', 'sales', 'crm', 'contact', 'email', 'phone', 'scoring'],
    a: 'Yes! OmniAgent includes a full-featured **Lead Engine & CRM**:\n\n- **In-Conversation Capture**: Seamlessly asks for name, email, phone number, and interest\n- **Automated Lead Scoring (0–100)**: Calculates quality based on verified contact fields and high-intent queries\n- **Pipeline Tracking**: Moves leads across stages: **New ➔ Contacted ➔ Qualified ➔ Converted**\n- **Counselor / Team Assignment**: Automatically routes leads to specific team members\n- **CSV / Excel Export**: One-click export directly to your CRM',
    sources: ['omniagent.ai/lead-engine', 'omniagent.ai/crm']
  },
  {
    q: 'How does Realtime Voice work?',
    keys: ['voice', 'webrtc', 'mic', 'spacebar', 'push to talk', 'audio', 'sound', 'speech'],
    a: 'OmniAgent features an enterprise-grade **Realtime Voice Assistant**:\n\n- ⚡ **Ultra-Low Latency**: Powered by OpenAI Realtime WebRTC and browser native Web Speech API\n- 🎙️ **Dual Modes**: Push-to-Talk (hold Spacebar to speak) and Hands-free voice detection\n- 📊 **Audio & Screen Sync**: Speaks a concise natural summary aloud while rendering complete Markdown tables on the screen\n- 🌐 **Bilingual**: Seamlessly understands and speaks natural Indian English and Hindi/Hinglish',
    sources: ['omniagent.ai/voice', 'omniagent.ai/webrtc']
  }
];

export default function InteractiveDemo() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; sources?: string[] | null }>>([
    {
      role: 'assistant',
      text: "👋 **Hello! Welcome to the OmniAgent AI Interactive Demo.**\n\nI can show you how OmniAgent transforms any public website into a multi-modal AI assistant with:\n- 🎙️ **Realtime WebRTC Voice Assistant** (Push-to-Talk & Hands-free)\n- 🔍 **Live Grounded Web Search** with verified citations\n- 🎯 **Lead Engine & CRM** to capture & score visitors\n- 📦 **eCommerce Product Scraper** & catalog export\n\nAsk me anything about OmniAgent, or try a suggested question below!",
      sources: ['omniagent.ai/overview', 'omniagent.ai/features']
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend !== undefined ? textToSend : inputValue).trim();
    if (!q) return;

    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    if (textToSend === undefined) setInputValue('');
    setIsTyping(true);

    try {
      const historyTurns = messages.map(m => ({ role: m.role, content: m.text }));
      const res = await api.chatPlatformDemo(q, historyTurns);
      if (res && res.answer) {
        setIsTyping(false);
        const sourceUrls = (res.sources || []).map((s: any) => typeof s === 'string' ? s : (s.url || s.title || String(s)));
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: res.answer,
            sources: sourceUrls.length ? sourceUrls : null
          }
        ]);
        return;
      }
    } catch (e) {
      // Offline fallback
    }

    setTimeout(() => {
      setIsTyping(false);
      const low = q.toLowerCase();
      let hit = DEMO_QA.find((item) => item.keys.some((k) => low.includes(k)));
      if (hit) {
        setMessages((prev) => [...prev, { role: 'assistant', text: hit.a, sources: hit.sources }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `OmniAgent AI connects directly to your website and answers questions grounded strictly in your content with citations.\n\nYou can ask about features, how to build an assistant, voice capabilities, lead engine, or try the quick buttons below!`,
            sources: ['omniagent.ai/features', 'omniagent.ai/docs']
          }
        ]);
      }
    }, 600);
  };

  return (
    <div className="card max-w-3xl mx-auto overflow-hidden shadow-lg border border-[var(--border)]">
      <div className="px-4 py-3 border-b border-[var(--border)] sf2 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
          <Bot className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-none">OmniAgent Interactive Demo</p>
          <p className="text-[10px] t3 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Online &bull; Live Grounded Assistant
          </p>
        </div>
        <span className="badge badge-emerald ml-auto text-[10px]">
          <Sparkles className="w-2.5 h-2.5" /> Interactive
        </span>
      </div>

      {/* Chat messages */}
      <div className="h-72 sm:h-80 overflow-y-auto p-4 space-y-3.5 bg-[var(--surface)] text-left">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm max-w-[85%] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-xs shadow-sm'
                  : 'sf2 border border-[var(--border)] rounded-bl-xs text-[var(--text-1)]'
              }`}
            >
              <div className="whitespace-pre-line">{m.text}</div>
              {m.sources && m.sources.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-2 pt-1.5 border-t border-[var(--border)]">
                  {m.sources.map((s, sIdx) => (
                    <span key={sIdx} className="source-chip text-[10px]">
                      <ExternalLink className="w-2.5 h-2.5" />
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2.5 items-center">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="sf2 border border-[var(--border)] rounded-2xl px-3 py-2 text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested prompts */}
      <div className="px-4 py-2 border-t border-[var(--border)] sf2 flex gap-2 flex-wrap items-center">
        <span className="text-[11px] font-bold t3 uppercase">Try asking:</span>
        {DEMO_QA.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(item.q)}
            className="px-2.5 py-1 rounded-lg sf border border-[var(--border)] text-[11px] t2 hover:border-blue-500 hover:text-blue-600 transition-colors"
          >
            {item.q}
          </button>
        ))}
      </div>

      {/* Input row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-[var(--border)] sf flex gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask anything about OmniAgent..."
          className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border)] sf focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
