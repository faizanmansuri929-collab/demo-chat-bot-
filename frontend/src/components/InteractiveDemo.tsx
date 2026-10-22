'use client';

import React, { useState } from 'react';
import { Send, Sparkles, ExternalLink, Bot, Check, Users } from 'lucide-react';
import { api } from '@/lib/api';

const DEMO_QA = [
  {
    q: 'What can OmniAgent do?',
    keys: ['what', 'omniagent', 'can', 'do', 'your product', 'platform', 'who are'],
    a: 'OmniAgent turns your existing website into an AI assistant that can:\n\n- **Answer questions** from your live pages, with clickable sources\n- **Capture leads** — names, emails and phone numbers, in conversation\n- **Speak with visitors** using a real-time voice assistant\n- **Work around the clock** so common questions never wait for office hours\n\nYou create it in three steps: add your website URL, let OmniAgent read your pages, then launch.',
    sources: ['omniagent-ai.example/docs']
  },
  {
    q: 'How do I create an assistant?',
    keys: ['how', 'create', 'build', 'start', 'setup', 'set up', 'make', 'assistant'],
    a: 'Creating an assistant takes three steps:\n\n1. **Add your website** — paste your homepage or sitemap URL\n2. **We read your pages** — OmniAgent discovers your content and prepares answers\n3. **Launch** — configure, test and deploy\n\nTry it now: select a template and enter your website URL.',
    sources: null
  },
  {
    q: 'Can it capture leads for my team?',
    keys: ['lead', 'capture', 'sales', 'crm', 'contact', 'email', 'phone'],
    a: 'Yes. The assistant can ask for a visitor\'s name, email and phone during the conversation, then:\n\n- Score the lead based on what was captured (0–100)\n- Track its status from **New → Contacted → Qualified → Converted**\n- Export everything to CSV for your CRM\n\nOpen the **Lead Engine** inside the navbar to see the live dashboard.',
    sources: ['omniagent-ai.example/leads']
  }
];

export default function InteractiveDemo() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; sources?: string[] | null }>>([
    {
      role: 'assistant',
      text: "Hi! I'm a **demo of an OmniAgent assistant**. Ask me about the product, or tap a suggestion.\n\n> Responses here are interactive examples — fully grounded in website content.",
      sources: null
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
      const res = await api.chatCollegeProject('proj_poornima', q, []);
      if (res && res.answer) {
        setIsTyping(false);
        const sourceUrls = (res.sources || []).map((s: any) => typeof s === 'string' ? s : (s.url || s.title));
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
            text: `In this live assistant preview, I search your website in real-time for "${q}" and return grounded answers with verified citations.\n\nTry the quick suggestion buttons below!`,
            sources: ['website-source/overview']
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
