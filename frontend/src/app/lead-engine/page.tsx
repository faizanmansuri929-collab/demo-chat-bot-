'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Users, UserCheck, Flame, Calendar, Clock,
  Search, X, Sparkles, Sliders, FileText,
  BarChart2, ShieldCheck, MessageSquare, Send,
  Bot, User, CheckCircle2, PhoneCall, RefreshCw,
  ExternalLink, ArrowRight, Zap, Check, ChevronRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { MarkdownContent } from '@/components/MarkdownContent';

/* ===================== DATA DEFINITIONS ===================== */
const NOW = new Date('2026-10-01T11:30:00');

interface ScoringSignal {
  p: number;
  g: string;
  l: string;
}

const W: Record<string, ScoringSignal> = {
  name: { p: 3, g: 'Profile', l: 'Name captured' },
  verified: { p: 7, g: 'Profile', l: 'Direct phone provided (No OTP)' },
  programme: { p: 5, g: 'Profile', l: 'Programme identified' },
  fees: { p: 8, g: 'Intent', l: 'Asked fees / scholarship' },
  process: { p: 8, g: 'Intent', l: 'Asked process / deadline / eligibility' },
  marks: { p: 8, g: 'Intent', l: 'Shared marks / stream' },
  timeline: { p: 8, g: 'Intent', l: 'Near timeline (2026/27 intake)' },
  visit: { p: 8, g: 'Intent', l: 'Asked hostel / campus visit / callback' },
  msgs6: { p: 5, g: 'Engagement', l: '6+ messages in conversation' },
  returning: { p: 5, g: 'Engagement', l: 'Returning visit' },
  booked: { p: 10, g: 'Engagement', l: 'Booked counselling / visit' },
  replied: { p: 5, g: 'Engagement', l: 'Replied to follow-up' },
  eligible: { p: 12, g: 'Fit', l: 'Marks meet programme eligibility' },
  region: { p: 8, g: 'Fit', l: 'From target region (Rajasthan)' }
};

interface Counsellor {
  id: string;
  name: string;
  group: string;
  phone: string;
  email: string;
  calendar: string;
  hours: string;
  maxOpen: number;
}

const COUNSELLORS: Counsellor[] = [
  { id: 'C1', name: 'Neha Mathur', group: 'Engineering & Computing', phone: '+91 90010 20001', email: 'neha.mathur@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 40 },
  { id: 'C2', name: 'Saurabh Gupta', group: 'Engineering & Computing', phone: '+91 90010 20002', email: 'saurabh.gupta@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 40 },
  { id: 'C3', name: 'Amit Joshi', group: 'Management & Commerce', phone: '+91 90010 20003', email: 'amit.joshi@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 10:00–6:00', maxOpen: 35 },
  { id: 'C4', name: 'Ritu Saxena', group: 'Design & Arts', phone: '+91 90010 20004', email: 'ritu.saxena@poornima.example', calendar: 'Outlook – connected', hours: 'Mon–Fri 9:30–5:30', maxOpen: 30 }
];

interface Programme {
  id: string;
  name: string;
  aliases: string;
  group: string;
  elig: string;
}

const PROGRAMMES: Programme[] = [
  { id: 'P01', name: 'B.Tech Computer Science', aliases: 'cse, computer science, btech cs', group: 'Engineering & Computing', elig: '10+2 PCM, min 60% in PCM' },
  { id: 'P02', name: 'B.Tech AI & Data Science', aliases: 'ai ds, aids, artificial intelligence', group: 'Engineering & Computing', elig: '10+2 PCM, min 60% in PCM' },
  { id: 'P03', name: 'BCA', aliases: 'bca, computer applications', group: 'Engineering & Computing', elig: '10+2 any stream with Maths, min 50%' },
  { id: 'P04', name: 'BBA', aliases: 'bba, business administration', group: 'Management & Commerce', elig: '10+2 any stream, min 50%' },
  { id: 'P05', name: 'MBA', aliases: 'mba, pgdm', group: 'Management & Commerce', elig: 'Graduation min 50%, CAT/MAT/CMAT or PU test' },
  { id: 'P06', name: 'B.Des', aliases: 'design, bdes, fashion, interior', group: 'Design & Arts', elig: '10+2 any stream, min 50% + design aptitude test' }
];

interface LeadItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  persona: string;
  rel: string;
  prog: string | null;
  city: string;
  state: string;
  channel: string;
  page: string;
  utm: string;
  academic: string;
  sig: string[];
  adj: { l: string; p: number }[];
  dq: string | null;
  status: string;
  c: string | null;
  created: string;
  last: string;
  slaDue: string | null;
  contacted: boolean;
  summary: string;
  score?: number;
  tier?: 'Hot' | 'Warm' | 'Cold' | 'DQ';
  breakdown?: { l: string; g: string; p: number }[];
  isReal?: boolean;
}

const INITIAL_DEMO_LEADS: LeadItem[] = [
  {
    id: 'L-1001', name: 'Priya Sharma', phone: '+91 98290 11001', email: 'priya.s@mail.example', persona: 'Student', rel: 'Self', prog: 'P01', city: 'Jaipur', state: 'Rajasthan', channel: 'Website', page: '/admissions/btech', utm: 'organic', academic: '12th PCM · RBSE · 82% · 2026',
    sig: ['name', 'verified', 'programme', 'fees', 'marks', 'timeline', 'msgs6', 'booked', 'eligible', 'region'], adj: [], dq: null, status: 'BOOKED', c: 'C1', created: '2026-09-30T22:46', last: '2026-10-01T09:20', slaDue: null, contacted: false,
    summary: 'Class 12 PCM student, 82%, wants B.Tech CSE for 2026 intake. Asked fee and scholarship. Booked campus visit for 3 Oct.'
  },
  {
    id: 'L-1002', name: 'Arjun Rathore', phone: '+91 94140 11002', email: '', persona: 'Student', rel: 'Self', prog: 'P02', city: 'Jodhpur', state: 'Rajasthan', channel: 'WhatsApp', page: '—', utm: 'whatsapp_click', academic: '12th PCM · CBSE · 76% · 2026',
    sig: ['name', 'verified', 'programme', 'fees', 'process', 'marks', 'timeline', 'visit', 'msgs6', 'returning', 'eligible', 'region'], adj: [], dq: null, status: 'QUALIFIED', c: 'C1', created: '2026-10-01T10:52', last: '2026-10-01T10:58', slaDue: '2026-10-01T11:28', contacted: false,
    summary: 'PCM 76%, second visit. Comparing B.Tech AI & DS hostel fees and placements, wants to apply this month. Asked for a callback.'
  },
  {
    id: 'L-1003', name: 'Rakesh Meena', phone: '+91 97830 11003', email: '', persona: 'Parent', rel: 'Father of Kavya Meena', prog: 'P04', city: 'Kota', state: 'Rajasthan', channel: 'Voice call', page: '—', utm: '—', academic: 'Daughter: 12th Commerce · RBSE · 71%',
    sig: ['name', 'verified', 'programme', 'fees', 'process', 'visit', 'eligible', 'region'], adj: [{ l: 'Counsellor: Connected – Interested', p: 10 }], dq: null, status: 'CONTACTED', c: 'C3', created: '2026-09-29T19:12', last: '2026-09-30T12:05', slaDue: null, contacted: true,
    summary: 'Father calling for daughter (Commerce 71%) for BBA. Concerned about girls\' hostel safety and instalments. Counsellor spoke, family interested.'
  },
  {
    id: 'L-1004', name: 'Sneha Agarwal', phone: '+91 98110 11004', email: 'sneha.ag@mail.example', persona: 'Student', rel: 'Self', prog: 'P05', city: 'New Delhi', state: 'Delhi', channel: 'Website', page: '/mba', utm: 'google_ads / mba_search', academic: 'B.Com · DU · 68% · CMAT 2026',
    sig: ['name', 'verified', 'programme', 'fees', 'process', 'timeline', 'msgs6', 'eligible'], adj: [], dq: null, status: 'QUALIFIED', c: 'C3', created: '2026-09-30T16:40', last: '2026-09-30T16:58', slaDue: null, contacted: false,
    summary: 'B.Com graduate (68%) with CMAT score, wants MBA 2026 batch. Asked about specialisations, fee and last date.'
  },
  {
    id: 'L-1005', name: 'Mohit Kumawat', phone: '+91 96600 11005', email: '', persona: 'Student', rel: 'Self', prog: 'P03', city: 'Ajmer', state: 'Rajasthan', channel: 'Website', page: '/bca', utm: 'organic', academic: 'Not shared',
    sig: ['name', 'verified', 'programme', 'fees', 'region'], adj: [], dq: null, status: 'NEW', c: null, created: '2026-09-30T21:15', last: '2026-09-30T21:19', slaDue: null, contacted: false,
    summary: 'Asked BCA fee only, short chat. No marks or timeline shared.'
  },
  {
    id: 'L-1006', name: 'Ananya Choudhary', phone: '+91 99280 11006', email: 'ananya.c@mail.example', persona: 'Student', rel: 'Self', prog: 'P06', city: 'Udaipur', state: 'Rajasthan', channel: 'Website', page: '/design', utm: 'instagram / bdes_reel', academic: '12th Arts · RBSE · 79% · 2026',
    sig: ['name', 'verified', 'programme', 'process', 'marks', 'visit', 'msgs6', 'booked', 'replied', 'eligible', 'region'], adj: [], dq: null, status: 'COUNSELLED', c: 'C4', created: '2026-09-26T20:30', last: '2026-09-29T15:40', slaDue: null, contacted: true,
    summary: 'Arts 79%, interested in B.Des Interior. Counselling done 29 Sep. Needs aptitude test date and portfolio guidance.'
  },
  {
    id: 'L-1007', name: 'Vikram Singh Shekhawat', phone: '+91 94130 11007', email: 'vikram.ss@mail.example', persona: 'Student', rel: 'Self', prog: 'P01', city: 'Sikar', state: 'Rajasthan', channel: 'WhatsApp', page: '—', utm: 'whatsapp_click', academic: '12th PCM · CBSE · 88% · 2026',
    sig: ['name', 'verified', 'programme', 'fees', 'marks', 'timeline', 'msgs6', 'booked', 'replied', 'eligible', 'region'], adj: [], dq: null, status: 'APPLIED', c: 'C1', created: '2026-09-24T18:05', last: '2026-09-28T13:10', slaDue: null, contacted: true,
    summary: 'PCM 88%, B.Tech CSE. Counselled 27 Sep, applied 28 Sep with merit scholarship. Follow-ups stopped.'
  }
];

const BOOKINGS_DATA = [
  { id: 'B-501', lead: 'L-1007', at: '2026-09-27T11:00', type: 'Online counselling', mode: 'Google Meet', c: 'C1', status: 'Completed' },
  { id: 'B-502', lead: 'L-1006', at: '2026-09-29T15:00', type: 'Campus visit', mode: 'Admission Cell, Block A', c: 'C4', status: 'Completed' },
  { id: 'B-503', lead: 'L-1011', at: '2026-09-30T15:00', type: 'Online counselling', mode: 'Google Meet', c: 'C2', status: 'No-show' },
  { id: 'B-504', lead: 'L-1013', at: '2026-10-01T16:00', type: 'Online counselling', mode: 'Google Meet', c: 'C3', status: 'Confirmed' },
  { id: 'B-505', lead: 'L-1001', at: '2026-10-03T11:00', type: 'Campus visit', mode: 'Admission Cell, Block A', c: 'C1', status: 'Confirmed' }
];

const FOLLOWUPS_DATA = [
  { id: 'F-9001', at: '2026-10-01T09:00', lead: 'L-1001', stage: 'Qualified, not booked', ch: 'WhatsApp', tpl: 'visit_offer_v1 – campus visit slots', status: 'Read · booked' },
  { id: 'F-9002', at: '2026-10-01T09:00', lead: 'L-1012', stage: 'Lead captured', ch: 'WhatsApp', tpl: 'thanks_brochure_v1 – B.Tech fee sheet', status: 'Delivered' },
  { id: 'F-9003', at: '2026-10-01T09:00', lead: 'L-1005', stage: 'Cold nurture', ch: 'WhatsApp', tpl: 'bca_placements_v1', status: 'Sent' },
  { id: 'F-9005', at: '2026-10-01T15:00', lead: 'L-1013', stage: 'Booked', ch: 'WhatsApp', tpl: 'reminder_1h_v1 – Meet link', status: 'Scheduled' }
];

export default function LeadEnginePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'chat' | 'bookings' | 'followups' | 'team' | 'settings' | 'data'>('overview');
  const [role, setRole] = useState<'admin' | 'C1' | 'C3'>('admin');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Dynamic leads list in state
  const [leadsList, setLeadsList] = useState<LeadItem[]>(() => {
    return INITIAL_DEMO_LEADS.map(l => {
      const breakdown = [
        ...l.sig.map(k => ({ l: W[k]?.l || k, g: W[k]?.g || 'Other', p: W[k]?.p || 0 })),
        ...l.adj.map(a => ({ l: a.l, g: 'Adjustment', p: a.p }))
      ];
      const score = Math.max(0, Math.min(100, breakdown.reduce((s, b) => s + b.p, 0)));
      const tier: 'Hot' | 'Warm' | 'Cold' | 'DQ' = l.dq ? 'DQ' : score >= 70 ? 'Hot' : score >= 40 ? 'Warm' : 'Cold';
      return { ...l, breakdown, score, tier, isReal: false };
    });
  });

  // Chat & Direct Lead Capture State (NO OTP)
  // Dynamic In-Session Lead & Memory Tracking
  const [sessionLead, setSessionLead] = useState<{
    marks?: string;
    course?: string;
    name?: string;
    phone?: string;
    score?: number;
    tier?: string;
  }>({});

  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; sources?: any[]; leadInfo?: any }>>([
    {
      id: 'm-init',
      role: 'assistant',
      text: "👋 **Hello! Welcome to Poornima University Admissions 2026-27.**\n\nWhich course or branch are you interested in (e.g., B.Tech CSE, MBA, BCA, B.Des)? Feel free to share your 12th percentage or mobile number so I can calculate your exact scholarship discount and send the official fee brochure directly to your WhatsApp!"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Quick Direct Contact Form (NO OTP)
  const [directName, setDirectName] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [directCourse, setDirectCourse] = useState('B.Tech Computer Science');
  const [directCity, setDirectCity] = useState('Jaipur');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState<{ name: string; phone: string; score: number; tier: string; counsellor: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Load real saved leads from database on mount
  useEffect(() => {
    loadDatabaseLeads();
  }, []);

  const loadDatabaseLeads = async () => {
    try {
      const data = await api.getLeadEngineLeads('proj_poornima');
      if (data && data.leads && data.leads.length > 0) {
        const realItems: LeadItem[] = data.leads.map((dl: any) => ({
          id: dl.id,
          name: dl.name,
          phone: dl.phone,
          email: dl.email || '',
          persona: 'Student',
          rel: 'Self',
          prog: 'P01',
          city: dl.city || 'Jaipur',
          state: dl.state || 'Rajasthan',
          channel: 'Live Web Chat',
          page: '/lead-engine',
          utm: 'live_admission_chat',
          academic: '12th PCM · Direct Capture',
          sig: ['name', 'verified', 'programme', 'fees', 'eligible', 'region'],
          adj: [],
          dq: null,
          status: dl.status || 'QUALIFIED',
          c: 'C1',
          created: dl.created_at,
          last: dl.created_at,
          slaDue: null,
          contacted: false,
          summary: dl.summary || `Live web enquiry for ${dl.course}`,
          score: dl.score || 75,
          tier: dl.tier || 'Hot',
          breakdown: [
            { l: 'Name captured', g: 'Profile', p: 3 },
            { l: 'Direct mobile number provided (No OTP)', g: 'Profile', p: 7 },
            { l: 'Programme identified', g: 'Profile', p: 5 },
            { l: 'Asked fees / scholarship', g: 'Intent', p: 8 },
            { l: 'Requested counselor contact', g: 'Intent', p: 8 },
            { l: 'Live Web Chat Lead Capture', g: 'Engagement', p: 15 },
            { l: 'From target admission region', g: 'Fit', p: 20 }
          ],
          isReal: true
        }));

        setLeadsList(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = realItems.filter(r => !existingIds.has(r.id));
          return [...uniqueNew, ...prev];
        });
      }
    } catch (err) {
      console.error('Failed to load database leads:', err);
    }
  };

  const getProgName = (id: string | null) => PROGRAMMES.find(p => p.id === id)?.name || id || '—';
  const getCounsellorName = (id: string | null) => COUNSELLORS.find(c => c.id === id)?.name || id || '—';
  const getLead = (id: string) => leadsList.find(l => l.id === id);

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const getTierTag = (tier?: string) => {
    switch (tier) {
      case 'Hot':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-orange-600 text-white shadow-xs">Hot</span>;
      case 'Warm':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-600 text-white shadow-xs">Warm</span>;
      case 'Cold':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-600 text-white shadow-xs">Cold</span>;
      case 'DQ':
      case 'Disqualified':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-500 text-white shadow-xs">Disqualified</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">{tier}</span>;
    }
  };

  // Handle Send Chat message via Official College Web Search + Auto In-Chat Lead Capture
  const handleSendChatMessage = async (overrideText?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = (overrideText || chatInput).trim();
    if (!textToSend || chatLoading) return;

    setChatInput('');
    const userMsgId = `user_${Date.now()}`;
    const newChatHistory = [...chatMessages, { id: userMsgId, role: 'user' as const, text: textToSend }];
    setChatMessages(newChatHistory);
    setChatLoading(true);

    // 1. In-Chat Lead Extraction & Session Memory Tracking
    const rawClean = textToSend.replace(/\+91/g, '').replace(/[\s\-\(\)\.]/g, '');
    const phoneMatch = textToSend.match(/\b[6-9]\d{9}\b/) || rawClean.match(/[6-9]\d{9}/);
    const pctMatch = textToSend.match(/(\b\d{1,2}(?:\.\d+)?\s*%)/) || textToSend.match(/(\b\d{2}\s*(?:percent|percentage|marks|pcm|grade)\b)/i);
    
    const lowerText = textToSend.toLowerCase();
    let detectedCourse = sessionLead.course;
    if (lowerText.includes('cse') || lowerText.includes('computer science') || lowerText.includes('btech cse')) detectedCourse = "B.Tech Computer Science & Engineering";
    else if (lowerText.includes('ai') || lowerText.includes('data science')) detectedCourse = "B.Tech AI & Data Science";
    else if (lowerText.includes('b.tech') || lowerText.includes('btech')) detectedCourse = "B.Tech";
    else if (lowerText.includes('mba')) detectedCourse = "MBA";
    else if (lowerText.includes('bca')) detectedCourse = "BCA";
    else if (lowerText.includes('bba')) detectedCourse = "BBA";
    else if (lowerText.includes('design') || lowerText.includes('b.des')) detectedCourse = "B.Des";

    let detectedName = sessionLead.name;
    const nameMatch = textToSend.match(/\b(?:my name is|mera nam|mera name|naam|name is|i am)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i);
    if (nameMatch) {
      const candidate = nameMatch[1].trim();
      if (!['interested', 'looking', 'asking', 'student', 'btech', 'mba', 'bca'].includes(candidate.toLowerCase())) {
        detectedName = candidate.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    }

    const updatedProfile = {
      ...sessionLead,
      marks: pctMatch ? pctMatch[0].trim() : sessionLead.marks,
      course: detectedCourse || sessionLead.course,
      name: detectedName || sessionLead.name,
      phone: phoneMatch ? phoneMatch[0] : sessionLead.phone
    };
    setSessionLead(updatedProfile);

    let autoCapturedLead: any = null;

    if (phoneMatch) {
      const capturedPhone = phoneMatch[0];
      const leadName = detectedName || "Prospective Student";
      const leadCourse = detectedCourse || "B.Tech Computer Science";

      try {
        const captureRes = await api.captureLead({
          name: leadName,
          phone: capturedPhone,
          course: leadCourse,
          academic: updatedProfile.marks ? `12th ${updatedProfile.marks}` : '12th PCM',
          city: "Jaipur",
          chat_summary: `Direct In-Chat Lead: ${leadName} (${capturedPhone}) enquired for ${leadCourse}. Marks: ${updatedProfile.marks || 'Not shared'}.`,
          project_id: 'proj_poornima'
        });

        autoCapturedLead = captureRes;

        // Add to main Leads Master list
        const newLeadItem: LeadItem = {
          id: captureRes.id,
          name: captureRes.name,
          phone: captureRes.phone,
          email: captureRes.email || '',
          persona: 'Student',
          rel: 'Self',
          prog: 'P01',
          city: captureRes.city,
          state: captureRes.state,
          channel: 'Live Web Chat',
          page: '/lead-engine',
          utm: 'in_chat_auto_capture',
          academic: updatedProfile.marks ? `12th Marks: ${updatedProfile.marks}` : '12th PCM · Direct In-Chat',
          sig: ['name', 'verified', 'programme', 'fees', 'eligible', 'region'],
          adj: [],
          dq: null,
          status: 'QUALIFIED',
          c: 'C1',
          created: captureRes.created_at,
          last: captureRes.created_at,
          slaDue: null,
          contacted: false,
          summary: captureRes.summary,
          score: captureRes.score,
          tier: captureRes.tier as any,
          breakdown: [
            { l: 'Name captured in chat', g: 'Profile', p: 3 },
            { l: 'Direct mobile number provided (No OTP)', g: 'Profile', p: 7 },
            { l: 'Programme identified', g: 'Profile', p: 5 },
            { l: '12th Marks / Percentage Shared', g: 'Intent', p: 8 },
            { l: 'Live Web Chat Lead Capture', g: 'Engagement', p: 15 },
            { l: 'From target admission region', g: 'Fit', p: 20 }
          ],
          isReal: true
        };

        setLeadsList(prev => [newLeadItem, ...prev]);
      } catch (err) {
        console.error('In-chat lead capture failed:', err);
      }
    }

    try {
      // 2. Call dedicated Lead Generator Chat API
      const historyFormatted = chatMessages
        .filter(m => m.id !== 'm-init')
        .map(m => ({ role: m.role, content: m.text }));

      const res = await api.chatLeadEngine('proj_poornima', textToSend, historyFormatted);
      
      setChatMessages(prev => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          role: 'assistant',
          text: res.answer,
          sources: res.sources,
          leadInfo: autoCapturedLead
        }
      ]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const fallbackText = "B.Tech tuition fee at Poornima University is approximately ₹1.21 Lakhs - ₹1.65 Lakhs per year. Merit scholarships up to 80% are available based on 12th PCM / CUET marks. Hostels are available on campus.";
      setChatMessages(prev => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          role: 'assistant',
          text: fallbackText,
          leadInfo: autoCapturedLead
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Filter leads based on role, tier, and search query
  const visibleLeads = leadsList.filter(l => role === 'admin' || l.c === role);
  const filteredLeads = visibleLeads.filter(l => {
    const matchesTier = tierFilter === 'All' || l.tier === tierFilter;
    const matchesSearch = !searchQuery ||
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      getProgName(l.prog).toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  }).sort((a, b) => {
    // Put Real Live Chat leads at the very top
    if (a.isReal && !b.isReal) return -1;
    if (!a.isReal && b.isReal) return 1;
    const order: Record<string, number> = { Hot: 0, Warm: 1, Cold: 2, DQ: 3 };
    return (order[a.tier || 'Cold'] - order[b.tier || 'Cold']) || ((b.score || 0) - (a.score || 0));
  });

  const openLeads = visibleLeads.filter(l => !['APPLIED', 'ENROLLED', 'LOST', 'DISQUALIFIED'].includes(l.status));
  const hotLeadsCount = openLeads.filter(l => l.tier === 'Hot').length;
  const qualLeadsCount = visibleLeads.filter(l => !['NEW', 'UNVERIFIED', 'DISQUALIFIED'].includes(l.status)).length;
  const todayBookings = BOOKINGS_DATA.filter(b => b.at.startsWith('2026-10-01') && (role === 'admin' || b.c === role));
  const appliedCount = visibleLeads.filter(l => ['APPLIED', 'ENROLLED'].includes(l.status)).length;

  const callFirstList = openLeads
    .filter(l => (l.tier === 'Hot' || l.tier === 'Warm') && !l.contacted && l.status !== 'BOOKED')
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const selectedLead = selectedLeadId ? getLead(selectedLeadId) : null;

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col md:flex-row text-[#1B2433] font-sans">
      {/* SIDEBAR NAVIGATION (Brand: #0B2545) */}
      <aside className="w-full md:w-64 bg-[#0B2545] text-[#D5DCE6] flex flex-col justify-between shrink-0 p-4 sm:p-5 border-r border-[#15345B]">
        <div className="space-y-6">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-white font-extrabold text-lg tracking-tight">
              <div className="w-8 h-8 rounded-xl bg-[#F2B54A] flex items-center justify-center text-[#0B2545] font-black shadow-md shadow-[#F2B54A]/20">
                <Users className="w-4 h-4 text-[#0B2545]" />
              </div>
              <span>UniAI Lead Engine</span>
            </div>
            <p className="text-xs text-[#F2B54A] font-semibold mt-1">Poornima University · Module 1</p>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#153866] text-white border-l-4 border-[#F2B54A] shadow-sm font-extrabold'
                  : 'text-[#D5DCE6] hover:bg-[#153866] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <BarChart2 className="w-4 h-4" /> Overview
              </span>
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'leads'
                  ? 'bg-[#153866] text-white border-l-4 border-[#F2B54A] shadow-sm font-extrabold'
                  : 'text-[#D5DCE6] hover:bg-[#153866] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4" /> Leads Master (Table)
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono bg-[#071930] rounded-full text-[#F2B54A]">
                {visibleLeads.length}
              </span>
            </button>

            {/* LIVE WEB CHAT & DIRECT LEAD CAPTURE TAB */}
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-[#F2B54A] to-[#E5A536] text-[#0B2545] shadow-md font-extrabold'
                  : 'text-[#F2B54A] hover:bg-[#153866] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" /> AI Chat &amp; Capture
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-black uppercase rounded-md bg-[#0B2545] text-[#F2B54A]">
                LIVE
              </span>
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'bookings'
                  ? 'bg-[#153866] text-white border-l-4 border-[#F2B54A] shadow-sm font-extrabold'
                  : 'text-[#D5DCE6] hover:bg-[#153866] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4" /> Bookings
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono bg-[#071930] rounded-full text-[#F2B54A]">
                {BOOKINGS_DATA.filter(b => role === 'admin' || b.c === role).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('followups')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'followups'
                  ? 'bg-[#153866] text-white border-l-4 border-[#F2B54A] shadow-sm font-extrabold'
                  : 'text-[#D5DCE6] hover:bg-[#153866] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Clock className="w-4 h-4" /> Follow-up Queue
              </span>
            </button>

            <button
              onClick={() => setActiveTab('team')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'team'
                  ? 'bg-[#153866] text-white border-l-4 border-[#F2B54A] shadow-sm font-extrabold'
                  : 'text-[#D5DCE6] hover:bg-[#153866] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4" /> Counsellors
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#153866] text-white border-l-4 border-[#F2B54A] shadow-sm font-extrabold'
                  : 'text-[#D5DCE6] hover:bg-[#153866] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4" /> Scoring Settings
              </span>
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'data'
                  ? 'bg-[#153866] text-white border-l-4 border-[#F2B54A] shadow-sm font-extrabold'
                  : 'text-[#D5DCE6] hover:bg-[#153866] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" /> Data Spec
              </span>
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-[#15345B] text-[11px] text-[#A1ADBC] space-y-1">
          <p className="font-semibold text-white">MaxBrain UniAI Platform</p>
          <p>Theme: Navy · SQLite DB</p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA (Background: #F4F6F9) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto bg-[#F4F6F9]">
        {/* TOP BAR: Title & Role Switcher */}
        <header className="bg-white border-b border-[#E3E8EF] px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
          <div>
            <h1 className="text-xl font-extrabold text-[#1B2433] tracking-tight capitalize">
              {activeTab === 'overview' && 'Executive Admission Overview'}
              {activeTab === 'leads' && 'Leads Master Table (Live CRM Database)'}
              {activeTab === 'chat' && 'AI Admission Web Chat & Direct Lead Capture'}
              {activeTab === 'bookings' && 'Counselling & Campus Visit Bookings'}
              {activeTab === 'followups' && 'Automated Multi-Channel Follow-up Cadence'}
              {activeTab === 'team' && 'Counsellor Performance & Capacity'}
              {activeTab === 'settings' && '100-Point Scoring Engine & Rules Config'}
              {activeTab === 'data' && 'Technical Specification & Dataset'}
            </h1>
            <p className="text-xs text-[#5A6578] mt-0.5">
              Domain-grounded web search data &bull; Direct 10-digit phone save (No OTP)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[#3A4556]">View as Role:</label>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as any);
                setTierFilter('All');
              }}
              className="bg-[#F7F9FB] border border-[#D5DCE6] text-xs font-bold text-[#1B2433] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0B2545] cursor-pointer shadow-xs"
            >
              <option value="admin">🏛️ Admission Head (Admin View)</option>
              <option value="C1">👩‍💼 Counsellor – Neha Mathur (Engineering)</option>
              <option value="C3">👨‍💼 Counsellor – Amit Joshi (Management)</option>
            </select>
          </div>
        </header>

        {/* VIEW CONTENTS */}
        <main className="p-6 space-y-6 max-w-7xl">
          {/* TAB: LIVE WEB SEARCH CHAT & DIRECT CONVERSATIONAL LEAD CAPTURE */}
          {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto w-full space-y-4">
              {/* Feature Highlights Banner */}
              <div className="p-4 bg-[#0B2545] text-white rounded-3xl border border-[#16365C] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#F2B54A]/20 border border-[#F2B54A]/40 flex items-center justify-center text-[#F2B54A] shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      Conversational Lead Capture Active
                      <span className="px-2 py-0.5 rounded-full bg-[#F2B54A] text-[#0B2545] text-[10px] font-mono font-black">
                        100% In-Chat · No OTP
                      </span>
                    </h3>
                    <p className="text-[#D5DCE6] text-[11px] mt-0.5">
                      Type your question with your name &amp; 10-digit number. The AI directly answers from official <code>poornima.org</code> data and automatically saves the scored lead to the database.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('leads')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#F2B54A] hover:bg-[#E5A536] text-[#0B2545] font-extrabold text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Users className="w-3.5 h-3.5 text-[#0B2545]" />
                  <span>View Leads Master</span>
                </button>
              </div>

              {/* Chat Container */}
              <div className="bg-white rounded-3xl border border-[#E3E8EF] shadow-md flex flex-col h-[640px] overflow-hidden">
                {/* Chat Header (Brand: #0B2545) */}
                <div className="p-4 bg-[#0B2545] text-white flex items-center justify-between border-b border-[#15345B]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#F2B54A] flex items-center justify-center text-[#0B2545] shadow-sm font-black">
                      <Bot className="w-5 h-5 text-[#0B2545]" />
                    </div>
                    <div>
                      <h2 className="text-xs font-extrabold text-white flex items-center gap-2">
                        Poornima Admission Web Search AI
                        <span className="w-2 h-2 rounded-full bg-[#4ADE9B] animate-pulse" />
                      </h2>
                      <p className="text-[10px] text-[#D5DCE6] font-medium">
                        Live Official Website Grounding · Direct System Database Capture
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChatMessages([chatMessages[0]])}
                      className="px-2.5 py-1 rounded-lg bg-[#153866] hover:bg-[#1E4880] text-[11px] text-[#D5DCE6] font-bold transition-colors"
                    >
                      Clear Chat
                    </button>
                  </div>
                </div>

                {/* Active In-Session Lead Memory & State Tracker */}
                <div className="px-4 py-2.5 bg-[#0B2545] border-b border-[#15345B] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-[#D5DCE6] text-[11px]">
                    <span className="font-extrabold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#F2B54A]" />
                      Session Memory:
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 ${
                      sessionLead.marks
                        ? 'bg-[#4ADE9B]/20 text-[#4ADE9B] border border-[#4ADE9B]/40 shadow-2xs'
                        : 'bg-white/10 text-[#A1ADBC]'
                    }`}>
                      {sessionLead.marks ? `✓ 12th Marks: ${sessionLead.marks}` : '12th Marks: Pending'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 ${
                      sessionLead.course
                        ? 'bg-[#F2B54A]/20 text-[#F2B54A] border border-[#F2B54A]/40 shadow-2xs'
                        : 'bg-white/10 text-[#A1ADBC]'
                    }`}>
                      {sessionLead.course ? `✓ Branch: ${sessionLead.course}` : 'Branch: Exploring'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 ${
                      sessionLead.phone
                        ? 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 shadow-2xs'
                        : 'bg-white/10 text-[#A1ADBC]'
                    }`}>
                      {sessionLead.phone ? `✓ Mobile: ${sessionLead.phone}` : 'Mobile: Pending'}
                    </span>
                  </div>
                  {sessionLead.name && (
                    <span className="text-[11px] font-extrabold text-[#F2B54A] bg-[#153866] px-2.5 py-0.5 rounded-lg border border-[#F2B54A]/30">
                      👤 {sessionLead.name}
                    </span>
                  )}
                </div>

                {/* Messages Feed (Background: #F4F6F9) */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F4F6F9] text-sm">
                  {chatMessages.map((m, mIdx) => (
                    <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}>
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="text-[11px] font-bold text-[#6B7586] uppercase tracking-wider">
                          {m.role === 'user' ? 'Student' : 'Poornima Admission Desk'}
                        </span>
                      </div>
                      <div className={`p-4 sm:p-5 rounded-2xl max-w-2xl leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-[#0B2545] text-white rounded-br-sm shadow-sm'
                          : 'bg-white border border-[#E3E8EF] text-[#1B2433] rounded-bl-sm shadow-xs'
                      }`}>
                        {m.role === 'user' ? (
                          <p className="whitespace-pre-wrap font-medium text-white text-[14.5px] sm:text-[15px] leading-relaxed">{m.text}</p>
                        ) : (
                          <div className="space-y-3">
                            <MarkdownContent content={m.text} isUser={false} />

                            {/* In-Chat Auto Captured Lead Card (Shown only when lead is captured in CRM) */}
                            {m.leadInfo && (
                              <div className="mt-3.5 p-4 rounded-2xl bg-[#EAF7EF] border-2 border-[#4ADE9B] space-y-2.5 text-xs text-[#1B2433] shadow-sm animate-in fade-in">
                                <div className="flex items-center justify-between border-b border-[#BDE5CE] pb-2">
                                  <div className="flex items-center gap-1.5 font-black text-[#1E7E4E]">
                                    <CheckCircle2 className="w-4 h-4 text-[#1E7E4E]" />
                                    <span>Lead Captured in Admission CRM Database!</span>
                                  </div>
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0B2545] text-[#F2B54A]">
                                    {m.leadInfo.score}/100 · {m.leadInfo.tier} Lead 🔥
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  <div>Student: <strong className="text-[#1B2433]">{m.leadInfo.name}</strong></div>
                                  <div>Mobile: <strong className="font-mono text-[#1B2433]">{m.leadInfo.phone}</strong></div>
                                  <div>Course: <strong className="text-[#1B2433]">{m.leadInfo.course || 'B.Tech CSE'}</strong></div>
                                  <div>Assigned: <strong className="text-[#0B2545]">{m.leadInfo.assigned_counsellor}</strong></div>
                                </div>
                                <div className="pt-1 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedLeadId(m.leadInfo.id);
                                      setActiveTab('leads');
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#153866] text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-xs"
                                  >
                                    <span>Open in Leads Master</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                  <a
                                    href={`https://wa.me/91${m.leadInfo.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${m.leadInfo.name}, thank you for contacting Poornima University Admissions. We have received your enquiry for ${m.leadInfo.course || 'B.Tech'}.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-sm"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>WhatsApp Counsellor</span>
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Official Citations */}
                            {m.sources && m.sources.length > 0 && (
                              <div className="pt-2 border-t border-[#E3E8EF] flex flex-wrap gap-1.5">
                                {m.sources.map((s: any, sIdx: number) => (
                                  <a
                                    key={sIdx}
                                    href={s.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 rounded-md bg-[#F7F9FB] border border-[#D5DCE6] text-[#0B2545] text-[10px] font-bold flex items-center gap-1 hover:bg-white"
                                  >
                                    <span>{s.title || 'Official Source'}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex items-center gap-2 text-[#0B2545] font-bold text-xs bg-white border border-[#D5DCE6] p-3 rounded-2xl max-w-xs animate-pulse shadow-xs">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F2B54A]" />
                      <span>Searching official college website...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Test Prompt Chips */}
                <div className="px-4 py-2.5 bg-[#F7F9FB] border-t border-[#E3E8EF] flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
                  <span className="font-bold text-[#6B7586] shrink-0 flex items-center gap-1.5 text-xs">
                    <Zap className="w-3.5 h-3.5 text-[#F2B54A]" /> Quick Options:
                  </span>
                  {(
                    sessionLead.course && !sessionLead.marks
                      ? [
                          "📊 My 12th is 75%, calculate my scholarship",
                          "📊 My 12th is 60%, calculate my scholarship",
                          `💰 2026 Fee Structure for ${sessionLead.course}`,
                          "🏛️ Schedule Campus Tour"
                        ]
                      : sessionLead.marks && !sessionLead.course
                      ? [
                          "🎓 B.Tech Computer Science & Engineering",
                          "🎓 B.Tech AI & Data Science",
                          "🎓 MBA Programme",
                          "🎓 BCA Programme"
                        ]
                      : sessionLead.marks && sessionLead.course && !sessionLead.phone
                      ? [
                          "📲 My number is 9829011001, send brochure on WhatsApp",
                          "💰 Calculate exact fee after scholarship",
                          "👩‍💼 Connect to Senior Counsellor",
                          "🏛️ Schedule Campus Visit"
                        ]
                      : [
                          "Fees for B.Tech Computer Science?",
                          "What are the MBA placements and packages?",
                          "Hostel fees & campus facilities?",
                          "Do you offer merit scholarships on 12th marks?"
                        ]
                  ).map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={chatLoading}
                      onClick={() => handleSendChatMessage(chip)}
                      className="px-3 py-1.5 rounded-full bg-white hover:bg-[#F2B54A]/10 border border-[#D5DCE6] hover:border-[#0B2545] text-[#1B2433] hover:text-[#0B2545] whitespace-nowrap font-semibold transition-all shrink-0 shadow-2xs text-xs"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Chat Input Bar */}
                <form onSubmit={(e) => handleSendChatMessage(undefined, e)} className="p-3.5 bg-white border-t border-[#E3E8EF] flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your question or share your name & 10-digit number (e.g., 'I am Rohit, 9829011001')..."
                    className="flex-1 px-4 py-2.5 bg-[#F7F9FB] border border-[#D5DCE6] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2545] text-[#1B2433]"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="px-5 py-2.5 bg-[#0B2545] hover:bg-[#153866] disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 6 Key KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-2xl font-black text-slate-900">{visibleLeads.length}</div>
                  <div className="text-xs font-bold text-slate-500 mt-1">Total Leads (7d)</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-2xl font-black text-emerald-700">{qualLeadsCount}</div>
                  <div className="text-xs font-bold text-slate-500 mt-1">Qualified Leads</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-orange-200 bg-orange-50/50 shadow-xs">
                  <div className="text-2xl font-black text-orange-600 flex items-center gap-1">
                    <Flame className="w-5 h-5 fill-orange-600" /> {hotLeadsCount}
                  </div>
                  <div className="text-xs font-bold text-orange-900 mt-1">Open Hot Leads</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-2xl font-black text-teal-700">{todayBookings.length}</div>
                  <div className="text-xs font-bold text-slate-500 mt-1">Bookings Today</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-2xl font-black text-slate-900">
                    {visibleLeads.filter(l => l.isReal).length}
                  </div>
                  <div className="text-xs font-bold text-teal-700 mt-1">Live Chat Captures</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/40 shadow-xs">
                  <div className="text-2xl font-black text-blue-700">{appliedCount}</div>
                  <div className="text-xs font-bold text-blue-900 mt-1">Applications Won</div>
                </div>
              </div>

              {/* Funnel & Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Admission Funnel */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-extrabold text-slate-900">Admission Funnel (Last 7 Days)</h2>
                    <span className="text-[11px] text-slate-500 font-semibold">Stage progression</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { name: 'Conversations', count: role === 'admin' ? visibleLeads.length + 12 : visibleLeads.length + 6 },
                      { name: 'Leads Captured', count: visibleLeads.length },
                      { name: 'Direct Phone Verified', count: visibleLeads.length },
                      { name: 'Qualified (Score ≥ 40)', count: qualLeadsCount },
                      { name: 'Booked Counselling / Visit', count: visibleLeads.filter(l => l.sig.includes('booked')).length },
                      { name: 'Counselled', count: visibleLeads.filter(l => ['COUNSELLED', 'APPLIED', 'ENROLLED'].includes(l.status)).length },
                      { name: 'Applied / Enrolled', count: appliedCount }
                    ].map((st, idx) => {
                      const maxVal = role === 'admin' ? visibleLeads.length + 12 : visibleLeads.length + 6;
                      const pct = Math.max(4, Math.round((st.count / maxVal) * 100));
                      return (
                        <div key={idx} className="flex items-center gap-3 text-xs">
                          <span className="w-36 font-bold text-slate-700 truncate">{st.name}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                            <div className="bg-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono font-bold text-slate-900 w-8 text-right">{st.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tier & Source Breakdown */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 mb-3">Leads by Tier</h2>
                    <div className="space-y-2">
                      {[
                        { tier: 'Hot', count: visibleLeads.filter(l => l.tier === 'Hot').length, color: 'bg-orange-600' },
                        { tier: 'Warm', count: visibleLeads.filter(l => l.tier === 'Warm').length, color: 'bg-amber-600' },
                        { tier: 'Cold', count: visibleLeads.filter(l => l.tier === 'Cold').length, color: 'bg-blue-600' }
                      ].map((tb, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-xs">
                          <span className="w-28 font-bold text-slate-700">{tb.tier}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div className={`${tb.color} h-full rounded-full`} style={{ width: `${(tb.count / visibleLeads.length) * 100}%` }} />
                          </div>
                          <span className="font-mono font-bold text-slate-900 w-6 text-right">{tb.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <h2 className="text-sm font-extrabold text-slate-900 mb-3">Leads by Channel Source</h2>
                    <div className="space-y-2">
                      {['Live Web Chat', 'Website', 'WhatsApp', 'Voice call'].map((src, idx) => {
                        const cnt = visibleLeads.filter(l => l.channel === src).length;
                        return (
                          <div key={idx} className="flex items-center gap-3 text-xs">
                            <span className="w-28 font-bold text-slate-700">{src}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                              <div className="bg-teal-700 h-full rounded-full" style={{ width: `${(cnt / visibleLeads.length) * 100}%` }} />
                            </div>
                            <span className="font-mono font-bold text-slate-900 w-6 text-right">{cnt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Call These First Queue */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-600 fill-orange-600" />
                      <span>Call These First</span>
                    </h2>
                    <p className="text-xs text-slate-500">High priority Hot and Warm leads not yet contacted (Sorted by 100-pt score)</p>
                  </div>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                    {callFirstList.length} Actionable Leads
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200">
                        <th className="p-3.5">Source</th>
                        <th className="p-3.5">Tier</th>
                        <th className="p-3.5">Score</th>
                        <th className="p-3.5">Student / Contact</th>
                        <th className="p-3.5">Programme Interest</th>
                        <th className="p-3.5">AI Summary</th>
                        <th className="p-3.5">Assigned Counsellor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {callFirstList.map(lead => (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="hover:bg-teal-50/50 cursor-pointer transition-colors"
                        >
                          <td className="p-3.5">
                            {lead.isReal ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[10px] border border-emerald-300">
                                🟢 REAL CHAT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                                DEMO
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">{getTierTag(lead.tier)}</td>
                          <td className="p-3.5 font-mono font-black text-slate-900 text-sm">{lead.score}</td>
                          <td className="p-3.5">
                            <div className="font-extrabold text-slate-900">{lead.name}</div>
                            <div className="font-mono text-slate-500 text-[11px]">{lead.phone}</div>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800">{getProgName(lead.prog)}</td>
                          <td className="p-3.5 text-slate-600 max-w-xs truncate">{lead.summary}</td>
                          <td className="p-3.5 font-semibold text-slate-700">{getCounsellorName(lead.c)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LEADS MASTER TABLE */}
          {activeTab === 'leads' && (
            <div className="space-y-4">
              {/* Filter Chips & Search Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {['All', 'Hot', 'Warm', 'Cold'].map(t => {
                    const count = t === 'All' ? visibleLeads.length : visibleLeads.filter(l => l.tier === t).length;
                    return (
                      <button
                        key={t}
                        onClick={() => setTierFilter(t)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                          tierFilter === t
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {t} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, phone, course, city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Leads Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200">
                        <th className="p-3.5">Source Type</th>
                        <th className="p-3.5">Tier</th>
                        <th className="p-3.5">Score</th>
                        <th className="p-3.5">Student / Contact</th>
                        <th className="p-3.5">Direct Mobile (No OTP)</th>
                        <th className="p-3.5">Programme</th>
                        <th className="p-3.5">City</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Assigned Counsellor</th>
                        <th className="p-3.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeads.map(lead => (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="hover:bg-teal-50/50 cursor-pointer transition-colors"
                        >
                          <td className="p-3.5">
                            {lead.isReal ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-black text-[10px] border border-emerald-300 flex items-center gap-1 w-max">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                REAL CHAT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                                DEMO
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">{getTierTag(lead.tier)}</td>
                          <td className="p-3.5 font-mono font-black text-slate-900 text-sm">{lead.score}</td>
                          <td className="p-3.5">
                            <div className="font-extrabold text-slate-900">{lead.name}</div>
                            <div className="text-[11px] text-slate-500">{lead.channel}</div>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-slate-800">
                            {lead.phone}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800">{getProgName(lead.prog)}</td>
                          <td className="p-3.5 text-slate-600">{lead.city}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                              {lead.status}
                            </span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-700">{getCounsellorName(lead.c)}</td>
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLeadId(lead.id);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-[11px] border border-teal-200 flex items-center gap-1"
                            >
                              <span>Inspect</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BOOKINGS */}
          {activeTab === 'bookings' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Counselling &amp; Campus Visit Bookings</h2>
                  <p className="text-xs text-slate-500">Scheduled Google Meet video sessions and in-person campus tours</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200">
                      <th className="p-3.5">Booking ID</th>
                      <th className="p-3.5">Date &amp; Time</th>
                      <th className="p-3.5">Student Lead</th>
                      <th className="p-3.5">Booking Type</th>
                      <th className="p-3.5">Meeting Mode / Place</th>
                      <th className="p-3.5">Assigned Counsellor</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {BOOKINGS_DATA.filter(b => role === 'admin' || b.c === role).map(bk => (
                      <tr key={bk.id} onClick={() => setSelectedLeadId(bk.lead)} className="hover:bg-teal-50/50 cursor-pointer">
                        <td className="p-3.5 font-mono font-bold text-slate-500">{bk.id}</td>
                        <td className="p-3.5 font-mono font-bold text-teal-800">{formatDateTime(bk.at)}</td>
                        <td className="p-3.5 font-extrabold text-slate-900">{getLead(bk.lead)?.name}</td>
                        <td className="p-3.5 text-slate-700 font-semibold">{bk.type}</td>
                        <td className="p-3.5 text-slate-600">{bk.mode}</td>
                        <td className="p-3.5 font-semibold text-slate-800">{getCounsellorName(bk.c)}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            bk.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' :
                            bk.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {bk.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: FOLLOW-UP QUEUE */}
          {activeTab === 'followups' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Multi-Channel Follow-up Cadence (Queue)</h2>
                  <p className="text-xs text-slate-500">Automated WhatsApp, SMS, AI voice calls and counsellor task reminders</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200">
                      <th className="p-3.5">Job ID</th>
                      <th className="p-3.5">Scheduled Time</th>
                      <th className="p-3.5">Target Lead</th>
                      <th className="p-3.5">Funnel Stage</th>
                      <th className="p-3.5">Channel</th>
                      <th className="p-3.5">Template / Nudge Purpose</th>
                      <th className="p-3.5">Execution Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {FOLLOWUPS_DATA.filter(f => role === 'admin' || getLead(f.lead)?.c === role).map(fu => (
                      <tr key={fu.id} onClick={() => setSelectedLeadId(fu.lead)} className="hover:bg-teal-50/50 cursor-pointer">
                        <td className="p-3.5 font-mono font-bold text-slate-500">{fu.id}</td>
                        <td className="p-3.5 font-mono font-bold text-slate-800">{formatDateTime(fu.at)}</td>
                        <td className="p-3.5 font-extrabold text-slate-900">{getLead(fu.lead)?.name}</td>
                        <td className="p-3.5 font-semibold text-slate-700">{fu.stage}</td>
                        <td className="p-3.5 font-bold text-teal-800">{fu.ch}</td>
                        <td className="p-3.5 text-slate-600 max-w-sm truncate">{fu.tpl}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            fu.status.includes('Scheduled') ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                            fu.status.includes('Read') ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {fu.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: COUNSELLORS */}
          {activeTab === 'team' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Admission Counsellor Roster &amp; Capacity</h2>
                  <p className="text-xs text-slate-500">Round-robin programme groups, SLA compliance rate, and calendar sync</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200">
                      <th className="p-3.5">Counsellor</th>
                      <th className="p-3.5">Programme Group</th>
                      <th className="p-3.5">Open Leads / Max</th>
                      <th className="p-3.5">Hot Leads</th>
                      <th className="p-3.5">Calendar Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {COUNSELLORS.map(c => {
                      const mine = leadsList.filter(l => l.c === c.id);
                      const myOpen = mine.filter(l => !['APPLIED', 'ENROLLED', 'LOST', 'DISQUALIFIED'].includes(l.status));
                      const myHot = myOpen.filter(l => l.tier === 'Hot');
                      return (
                        <tr key={c.id}>
                          <td className="p-3.5">
                            <div className="font-extrabold text-slate-900">{c.name}</div>
                            <div className="font-mono text-slate-500 text-[11px]">{c.phone}</div>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800">{c.group}</td>
                          <td className="p-3.5 font-mono font-bold text-slate-900">{myOpen.length} / {c.maxOpen}</td>
                          <td className="p-3.5 font-mono font-extrabold text-orange-600">{myHot.length}</td>
                          <td className="p-3.5 text-emerald-700 font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {c.calendar}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h2 className="text-sm font-extrabold text-slate-900">100-Point Scoring Weights Config</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200">
                        <th className="p-2.5">Signal</th>
                        <th className="p-2.5">Category Group</th>
                        <th className="p-2.5 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(W).map(([key, item]) => (
                        <tr key={key}>
                          <td className="p-2.5 font-semibold text-slate-800">{item.l}</td>
                          <td className="p-2.5 text-slate-500">{item.g}</td>
                          <td className="p-2.5 font-mono font-extrabold text-teal-700 text-right">+{item.p}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h2 className="text-sm font-extrabold text-slate-900">Thresholds &amp; Operational Rules</h2>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <dt className="text-slate-500 font-semibold">Hot Tier Gate</dt>
                    <dd className="font-extrabold text-orange-600 text-base mt-0.5">Score ≥ 70</dd>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <dt className="text-slate-500 font-semibold">Warm Tier Gate</dt>
                    <dd className="font-extrabold text-amber-600 text-base mt-0.5">Score 40 – 69</dd>
                  </div>
                </dl>

                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-xs space-y-1 text-teal-950">
                  <div className="font-extrabold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-700" /> Direct Capture Rule:
                  </div>
                  <p className="leading-relaxed">
                    Leads are saved directly upon sharing mobile number (No OTP barrier). Score is calculated automatically and assigned in round-robin.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SPEC */}
          {activeTab === 'data' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 text-xs text-slate-800">
              <h2 className="text-sm font-black text-slate-900">Lead Engine Technical Integration Guide</h2>
              <p className="text-slate-600 leading-relaxed">
                Leads are stored in SQLite database under table <code>admission_leads</code>. The AI Chat uses <code>generate_college_web_search_answer</code> with zero external RAG dependencies, querying official college sitemap sources directly.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* SLIDE-OVER LEAD DETAIL DRAWER */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-950/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">{selectedLead.id}</span>
                    {getTierTag(selectedLead.tier)}
                    {selectedLead.isReal && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[10px]">
                        🟢 REAL CHAT
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1">{selectedLead.name}</h2>
                  <p className="text-xs text-slate-500">{getProgName(selectedLead.prog)} &bull; {selectedLead.city}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLeadId(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* AI Summary */}
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs space-y-1 text-teal-950">
                <div className="font-extrabold flex items-center gap-1.5 text-teal-900">
                  <Sparkles className="w-3.5 h-3.5 text-teal-700" /> AI Admission Context Summary:
                </div>
                <p className="leading-relaxed">{selectedLead.summary}</p>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-900">100-Point Score Breakdown</h3>
                  <span className="font-mono font-black text-slate-900 text-sm">{selectedLead.score} / 100</span>
                </div>
                <div className="space-y-1.5">
                  {selectedLead.breakdown?.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl">
                      <span className="text-slate-700 font-medium">{b.l}</span>
                      <span className="font-mono font-bold text-teal-700">+{b.p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Facts */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <h3 className="font-extrabold text-slate-900">Contact Details</h3>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>Mobile: <strong className="font-mono">{selectedLead.phone}</strong></div>
                  <div>Channel: <strong>{selectedLead.channel}</strong></div>
                  <div>City: <strong>{selectedLead.city}</strong></div>
                  <div>Status: <strong>{selectedLead.status}</strong></div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center gap-3">
              <a
                href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>WhatsApp Student</span>
              </a>
              <a
                href={`tel:${selectedLead.phone}`}
                className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Counsellor</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
