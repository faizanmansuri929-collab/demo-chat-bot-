'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap, Award, Users, Phone, Send, Check, AlertTriangle, Info
} from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import { api } from '@/lib/api';
import {
  XYZ_QA, scoreLead, LEADS_STORE_KEY, LeadItem
} from '@/lib/demoData';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text?: string;
  markdown?: string;
  simulated?: boolean;
}

export default function XyzCollegePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      markdown: 'Welcome to **XYZ Group of Colleges**! I’m the admissions counselor. Ask about fees, hostel, REAP eligibility or branch comparisons — or request a callback on the right.'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Callback form state
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadProgram, setLeadProgram] = useState('');
  const [leadError, setLeadError] = useState('');
  const [leadSuccessMsg, setLeadSuccessMsg] = useState('');

  const sendMessage = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setInputVal('');

    setMessages(prev => [
      ...prev,
      { id: 'u-' + Date.now(), role: 'user', text: q }
    ]);

    setIsTyping(true);

    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.text || m.markdown || '' }));

    // Try live chat through lead-engine / web-search backend
    try {
      const res = await api.chatLeadEngine('proj_poornima', q, history);
      setIsTyping(false);
      if (res && res.answer) {
        setMessages(prev => [
          ...prev,
          {
            id: 'a-' + Date.now(),
            role: 'assistant',
            markdown: res.answer,
            simulated: !res.is_live_searched
          }
        ]);
        return;
      }
    } catch (err) {
      // Backend offline or error; fall back smoothly
    }

    await new Promise(r => setTimeout(r, 650));
    setIsTyping(false);

    const low = q.toLowerCase();
    let hit = XYZ_QA.find(item => item.keys.some(k => low.includes(k)));

    setMessages(prev => [
      ...prev,
      {
        id: 'a-' + Date.now(),
        role: 'assistant',
        markdown: hit ? hit.a : 'I would search **xyzcollege.edu.in** for that and answer with sources. Try the suggested questions, or request a callback and our team will get back to you.',
        simulated: true
      }
    ]);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadError('');
    setLeadSuccessMsg('');

    const name = leadName.trim();
    const email = leadEmail.trim();
    const phone = leadPhone.trim();

    if (!name) {
      setLeadError('Please enter your name.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setLeadError('Please enter a valid email address.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setLeadError('Please enter a valid phone number (at least 10 digits).');
      return;
    }

    const calculatedScore = scoreLead({ email, phone, program: leadProgram });
    let assignedCounsellor = '';

    // Send to backend API
    try {
      const backendRes = await api.captureLead({
        name,
        phone,
        email,
        course: 'B.Tech',
        branch: leadProgram || 'Computer Science (CSE)',
        city: 'Jaipur',
        chat_summary: `Direct callback enquiry for ${leadProgram || 'B.Tech'} from XYZ College Portal`,
        source: 'XYZ_COLLEGE_FORM'
      });
      if (backendRes && backendRes.assigned_counsellor) {
        assignedCounsellor = backendRes.assigned_counsellor;
      }
    } catch (err) {
      console.log('Backend lead capture offline, saving locally:', err);
    }

    const newLead: LeadItem = {
      id: 'l' + Date.now() + Math.floor(Math.random() * 999),
      name,
      email,
      phone,
      program: leadProgram || undefined,
      source: 'XYZ College Assistant',
      score: calculatedScore,
      status: 'Qualified',
      created: new Date().toISOString()
    };

    try {
      const raw = localStorage.getItem(LEADS_STORE_KEY);
      let store = { leads: [] as LeadItem[], sample: false };
      if (raw) store = JSON.parse(raw);
      store.leads.unshift(newLead);
      localStorage.setItem(LEADS_STORE_KEY, JSON.stringify(store));
    } catch (err) {}

    setLeadName('');
    setLeadEmail('');
    setLeadPhone('');
    setLeadProgram('');
    setLeadSuccessMsg(
      assignedCounsellor
        ? `Lead captured & saved in database! Assigned counsellor: ${assignedCounsellor} (Score ${calculatedScore}).`
        : `Lead captured (Score ${calculatedScore}) — check the Lead Engine to view qualification details.`
    );
  };

  return (
    <DashboardShell activeNav="xyz-college">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">XYZ College AI Assistant</h1>
              <span className="badge badge-blue">
                <Award className="w-3 h-3" /> REAP 1023
              </span>
              <span className="badge badge-teal">Grounded on xyzcollege.edu.in</span>
            </div>
            <p className="text-sm t3 mt-1">
              Autonomous admissions counselor — qualifications, branch comparisons and lead scoring.
            </p>
          </div>
          <Link href="/lead-engine" className="btn btn-secondary btn-sm">
            <Users className="w-3.5 h-3.5" /> Open Lead Engine
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 items-start">
          {/* Main Chat Column */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-4 py-3 border-b bd sf2 flex items-center gap-2.5">
              <div className="avatar avatar-bot">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none">XYZ Admissions Counselor</p>
                <p className="text-[10px] t3 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Admissions mode
                </p>
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-3" role="log" aria-live="polite">
              {messages.map((m) => {
                if (m.role === 'system') {
                  return (
                    <div key={m.id} className="notice notice-amber">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <div dangerouslySetInnerHTML={{ __html: m.markdown || '' }} />
                    </div>
                  );
                }

                if (m.role === 'user') {
                  return (
                    <div key={m.id} className="chat-msg user">
                      <div className="chat-bubble">{m.text}</div>
                    </div>
                  );
                }

                return (
                  <div key={m.id} className="chat-msg assistant">
                    <div className="avatar avatar-bot">
                      <GraduationCap className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      {m.simulated && (
                        <span className="sim-badge mb-1">
                          <Info className="w-2.5 h-2.5" /> Simulated demo
                        </span>
                      )}
                      <div
                        className="chat-bubble md"
                        dangerouslySetInnerHTML={{
                          __html: renderSimpleMarkdown(m.markdown || '')
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="chat-msg assistant">
                  <div className="avatar avatar-bot">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <div className="chat-bubble">
                    <span className="typing">
                      <span></span><span></span><span></span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Sample Queries */}
            <div className="px-4 pb-2 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => sendMessage('B.Tech CSE fee structure?')}
                className="sample-q !w-auto"
              >
                Fees
              </button>
              <button
                type="button"
                onClick={() => sendMessage('Hostel and mess charges?')}
                className="sample-q !w-auto"
              >
                Hostel
              </button>
              <button
                type="button"
                onClick={() => sendMessage('REAP code, cutoff and eligibility?')}
                className="sample-q !w-auto"
              >
                REAP
              </button>
              <button
                type="button"
                onClick={() => sendMessage('CSE vs IT — which to choose?')}
                className="sample-q !w-auto"
              >
                CSE vs IT
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(inputVal);
              }}
              className="p-3 border-t bd flex gap-2"
            >
              <label htmlFor="xyz-chat-input" className="sr-only">Ask the XYZ counselor</label>
              <input
                id="xyz-chat-input"
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="input"
                placeholder="Ask about admissions, fees, hostel…"
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn btn-primary shrink-0"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Sidebar Column: Callback Lead Form */}
          <aside className="space-y-4">
            <div className="card p-5">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <Phone className="w-4 h-4 text-teal-600" /> Request a callback
              </h2>
              <p className="field-hint mt-1">
                Leads captured here appear instantly in the Lead Engine with a score.
              </p>

              <form onSubmit={handleLeadSubmit} className="mt-4 space-y-3">
                <div>
                  <label htmlFor="xyz-lead-name" className="form-label">Full name</label>
                  <input
                    id="xyz-lead-name"
                    type="text"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="input mt-1"
                    placeholder="e.g. Ananya Sharma"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label htmlFor="xyz-lead-email" className="form-label">Email</label>
                  <input
                    id="xyz-lead-email"
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="input mt-1"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label htmlFor="xyz-lead-phone" className="form-label">Phone</label>
                  <input
                    id="xyz-lead-phone"
                    type="tel"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="input mt-1"
                    placeholder="+91 98XXXXXX21"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label htmlFor="xyz-lead-program" className="form-label">Program of interest</label>
                  <select
                    id="xyz-lead-program"
                    value={leadProgram}
                    onChange={(e) => setLeadProgram(e.target.value)}
                    className="select mt-1"
                  >
                    <option value="">Select…</option>
                    <option value="B.Tech CSE">B.Tech CSE</option>
                    <option value="B.Tech IT">B.Tech IT</option>
                    <option value="B.Tech ECE">B.Tech ECE</option>
                    <option value="BBA">BBA</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {leadError && (
                  <p className="text-xs font-semibold text-[var(--danger)]" role="alert">
                    {leadError}
                  </p>
                )}

                {leadSuccessMsg && (
                  <div className="notice notice-blue text-xs">
                    <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>{leadSuccessMsg}</span>
                  </div>
                )}

                <button type="submit" className="btn btn-primary w-full">
                  <Send className="w-4 h-4" /> Request callback
                </button>
              </form>
            </div>

            <div className="card p-5">
              <h2 className="font-bold text-sm">What this assistant does</h2>
              <ul className="mt-2 space-y-2 text-xs t2">
                <li className="flex gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  Qualifies admissions questions (REAP code, eligibility, cutoffs)
                </li>
                <li className="flex gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  Compares branches with grounded fee tables
                </li>
                <li className="flex gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  Captures and scores leads for the admissions team
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
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
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');

  html = html.replace(/(<li>.+<\/li>)+/g, '<ul>$&</ul>');

  html = html
    .split('\n\n')
    .map(p => {
      if (p.startsWith('<table>') || p.startsWith('<ul>') || p.startsWith('<blockquote>')) return p;
      return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');

  return html;
}
