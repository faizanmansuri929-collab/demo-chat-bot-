'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Users, UserCheck, Flame, Calendar, Clock,
  Search, X, Sparkles, Sliders, FileText,
  BarChart2, ShieldCheck, MessageSquare, Send,
  Bot, CheckCircle2, PhoneCall, RefreshCw,
  ExternalLink, ArrowRight, Zap, ChevronRight,
  Database, Trash2, Download, Plus, Filter,
  Phone, Mail, Check, AlertCircle, Building2
} from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import { MarkdownContent } from '@/components/MarkdownContent';
import { api } from '@/lib/api';

/* ===================== SCORING & COUNSELLOR CONSTANTS ===================== */
interface ScoringSignal {
  p: number;
  g: string;
  l: string;
}

const SCORING_WEIGHTS: Record<string, ScoringSignal> = {
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
  branch: 'CSE' | 'Civil' | 'Electronic' | 'Mechanical' | 'Other';
  group: string;
  specialization: string;
  phone: string;
  email: string;
  calendar: string;
  hours: string;
  maxOpen: number;
}

const COUNSELLORS: Counsellor[] = [
  // --- 1. COMPUTER SCIENCE & ENGINEERING (CSE) - 5 COUNSELLORS ---
  { id: 'C_CSE_1', name: 'Neha Mathur', branch: 'CSE', group: 'B.Tech Computer Science (CSE)', specialization: 'Core CSE & Cloud Admissions', phone: '+91 90010 20001', email: 'neha.mathur@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 40 },
  { id: 'C_CSE_2', name: 'Saurabh Gupta', branch: 'CSE', group: 'B.Tech Computer Science (CSE)', specialization: 'AI, Data Science & ML Focus', phone: '+91 90010 20002', email: 'saurabh.gupta@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 40 },
  { id: 'C_CSE_3', name: 'Priya Nair', branch: 'CSE', group: 'B.Tech Computer Science (CSE)', specialization: 'Cyber Security & Networks', phone: '+91 90010 20003', email: 'priya.nair@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 35 },
  { id: 'C_CSE_4', name: 'Rohan Verma', branch: 'CSE', group: 'B.Tech Computer Science (CSE)', specialization: 'Data Analytics & Big Data', phone: '+91 90010 20004', email: 'rohan.verma@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 35 },
  { id: 'C_CSE_5', name: 'Ananya Sen', branch: 'CSE', group: 'B.Tech Computer Science (CSE)', specialization: 'Full-Stack Software Systems', phone: '+91 90010 20005', email: 'ananya.sen@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 35 },

  // --- 2. CIVIL ENGINEERING - 5 COUNSELLORS ---
  { id: 'C_CIV_1', name: 'Rajesh Sharma', branch: 'Civil', group: 'B.Tech Civil Engineering', specialization: 'Structural & Concrete Technology', phone: '+91 90010 20011', email: 'rajesh.sharma@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 40 },
  { id: 'C_CIV_2', name: 'Manoj Kumar', branch: 'Civil', group: 'B.Tech Civil Engineering', specialization: 'Highway & Transportation Systems', phone: '+91 90010 20012', email: 'manoj.kumar@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 35 },
  { id: 'C_CIV_3', name: 'Deepak Meena', branch: 'Civil', group: 'B.Tech Civil Engineering', specialization: 'Geotechnical & Construction Site', phone: '+91 90010 20013', email: 'deepak.meena@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 35 },
  { id: 'C_CIV_4', name: 'Sunita Kaswan', branch: 'Civil', group: 'B.Tech Civil Engineering', specialization: 'Urban Infrastructure & Smart City', phone: '+91 90010 20014', email: 'sunita.kaswan@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 30 },
  { id: 'C_CIV_5', name: 'Pooja Choudhary', branch: 'Civil', group: 'B.Tech Civil Engineering', specialization: 'Environmental & Water Resources', phone: '+91 90010 20015', email: 'pooja.choudhary@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 30 },

  // --- 3. ELECTRONICS ENGINEERING (ECE) - 5 COUNSELLORS ---
  { id: 'C_ECE_1', name: 'Vikram Joshi', branch: 'Electronic', group: 'B.Tech Electronics (ECE)', specialization: 'VLSI Design & Microchips', phone: '+91 90010 20021', email: 'vikram.joshi@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 40 },
  { id: 'C_ECE_2', name: 'Sunita Rao', branch: 'Electronic', group: 'B.Tech Electronics (ECE)', specialization: 'Embedded Systems & IoT Devices', phone: '+91 90010 20022', email: 'sunita.rao@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 40 },
  { id: 'C_ECE_3', name: 'Abhishek Rathore', branch: 'Electronic', group: 'B.Tech Electronics (ECE)', specialization: '5G Telecom & Wireless Systems', phone: '+91 90010 20023', email: 'abhishek.rathore@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 35 },
  { id: 'C_ECE_4', name: 'Meenakshi Sen', branch: 'Electronic', group: 'B.Tech Electronics (ECE)', specialization: 'Robotics & Signal Hardware', phone: '+91 90010 20024', email: 'meenakshi.sen@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 35 },
  { id: 'C_ECE_5', name: 'Karan Singhania', branch: 'Electronic', group: 'B.Tech Electronics (ECE)', specialization: 'Circuit Design & Hardware Labs', phone: '+91 90010 20025', email: 'karan.singhania@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 30 },

  // --- 4. MECHANICAL ENGINEERING - 5 COUNSELLORS ---
  { id: 'C_MECH_1', name: 'Ajay Meena', branch: 'Mechanical', group: 'B.Tech Mechanical Engg', specialization: 'Automobile & Electric Vehicles (EV)', phone: '+91 90010 20031', email: 'ajay.meena@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 40 },
  { id: 'C_MECH_2', name: 'Sandeep Verma', branch: 'Mechanical', group: 'B.Tech Mechanical Engg', specialization: 'Robotics & Automation Industry', phone: '+91 90010 20032', email: 'sandeep.verma@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 35 },
  { id: 'C_MECH_3', name: 'Harish Pareek', branch: 'Mechanical', group: 'B.Tech Mechanical Engg', specialization: 'CAD / CAM & Product Prototyping', phone: '+91 90010 20033', email: 'harish.pareek@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 35 },
  { id: 'C_MECH_4', name: 'Divya Rathore', branch: 'Mechanical', group: 'B.Tech Mechanical Engg', specialization: 'Thermal Power & Aerodynamics', phone: '+91 90010 20034', email: 'divya.rathore@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 30 },
  { id: 'C_MECH_5', name: 'Naveen Choudhary', branch: 'Mechanical', group: 'B.Tech Mechanical Engg', specialization: 'Manufacturing & CNC Machine Labs', phone: '+91 90010 20035', email: 'naveen.choudhary@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 9:30–5:30', maxOpen: 30 },

  // --- 5. MANAGEMENT & DESIGN ---
  { id: 'C3', name: 'Amit Joshi', branch: 'Other', group: 'Management & Commerce', specialization: 'MBA & BBA Admissions', phone: '+91 90010 20003', email: 'amit.joshi@poornima.example', calendar: 'Google – connected', hours: 'Mon–Sat 10:00–6:00', maxOpen: 35 },
  { id: 'C4', name: 'Ritu Saxena', branch: 'Other', group: 'Design & Arts', specialization: 'B.Des & Fashion Aptitude', phone: '+91 90010 20004', email: 'ritu.saxena@poornima.example', calendar: 'Outlook – connected', hours: 'Mon–Fri 9:30–5:30', maxOpen: 30 }
];

interface Programme {
  id: string;
  name: string;
  branch: string;
  group: string;
  elig: string;
}

const PROGRAMMES: Programme[] = [
  { id: 'P01', name: 'B.Tech Computer Science (CSE)', branch: 'Computer Science (CSE)', group: 'Engineering - CSE', elig: '10+2 PCM, min 60% in PCM' },
  { id: 'P02', name: 'B.Tech Civil Engineering', branch: 'Civil Engineering', group: 'Engineering - Civil', elig: '10+2 PCM, min 50% in PCM' },
  { id: 'P03', name: 'B.Tech Electronics (ECE)', branch: 'Electronics Engineering (ECE)', group: 'Engineering - Electronics', elig: '10+2 PCM, min 55% in PCM' },
  { id: 'P04', name: 'B.Tech Mechanical Engineering', branch: 'Mechanical Engineering', group: 'Engineering - Mechanical', elig: '10+2 PCM, min 50% in PCM' },
  { id: 'P05', name: 'BCA', branch: 'Computer Applications', group: 'Computing', elig: '10+2 any stream with Maths, min 50%' },
  { id: 'P06', name: 'BBA', branch: 'Business Administration', group: 'Management', elig: '10+2 any stream, min 50%' },
  { id: 'P07', name: 'MBA', branch: 'Management', group: 'Management', elig: 'Graduation min 50%, CAT/MAT/CMAT or PU test' },
  { id: 'P08', name: 'B.Des', branch: 'Design & Arts', group: 'Design & Arts', elig: '10+2 any stream, min 50% + design aptitude test' }
];

export interface LeadItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  course: string;
  branch: string;
  city: string;
  state: string;
  channel: string;
  academic: string;
  status: 'New' | 'Qualified' | 'Contacted' | 'Converted';
  counsellorId?: string;
  counsellorName?: string;
  created: string;
  summary: string;
  score: number;
  tier: 'Hot' | 'Warm' | 'Cold';
  breakdown?: { l: string; g: string; p: number }[];
  isReal: boolean;
}

const SAMPLE_LEADS_DATA: LeadItem[] = [
  {
    id: 'L-1001',
    name: 'Priya Sharma',
    phone: '+91 98290 11001',
    email: 'priya.s@example.com',
    course: 'B.Tech',
    branch: 'Computer Science (CSE)',
    city: 'Jaipur',
    state: 'Rajasthan',
    channel: 'Live Web Chat',
    academic: '12th PCM · 82%',
    status: 'Qualified',
    counsellorId: 'C_CSE_1',
    counsellorName: 'Neha Mathur (B.Tech CSE)',
    created: '2026-10-12T10:30',
    summary: '12th PCM 82%, enquired for B.Tech CSE 2026 intake and hostel fees.',
    score: 86,
    tier: 'Hot',
    breakdown: [
      { l: 'Name captured', g: 'Profile', p: 3 },
      { l: 'Direct phone provided (No OTP)', g: 'Profile', p: 7 },
      { l: 'Programme identified', g: 'Profile', p: 5 },
      { l: 'Asked fees / scholarship', g: 'Intent', p: 8 },
      { l: 'Shared marks / stream', g: 'Intent', p: 8 },
      { l: 'Marks meet programme eligibility', g: 'Fit', p: 12 },
      { l: 'From target region (Rajasthan)', g: 'Fit', p: 8 },
      { l: 'Live Web Chat Lead Capture', g: 'Engagement', p: 15 },
      { l: 'Booked counselling / visit', g: 'Engagement', p: 10 }
    ],
    isReal: false
  },
  {
    id: 'L-1002',
    name: 'Arjun Rathore',
    phone: '+91 94140 11002',
    email: 'arjun.r@example.com',
    course: 'B.Tech',
    branch: 'Computer Science (CSE)',
    city: 'Jodhpur',
    state: 'Rajasthan',
    channel: 'Live Web Chat',
    academic: '12th PCM · 76%',
    status: 'Qualified',
    counsellorId: 'C_CSE_2',
    counsellorName: 'Saurabh Gupta (B.Tech CSE)',
    created: '2026-10-11T14:20',
    summary: 'Enquired about B.Tech AI & Data Science labs and merit scholarships.',
    score: 78,
    tier: 'Hot',
    breakdown: [
      { l: 'Name captured', g: 'Profile', p: 3 },
      { l: 'Direct phone provided (No OTP)', g: 'Profile', p: 7 },
      { l: 'Programme identified', g: 'Profile', p: 5 },
      { l: 'Asked fees / scholarship', g: 'Intent', p: 8 },
      { l: 'Shared marks / stream', g: 'Intent', p: 8 },
      { l: 'Marks meet programme eligibility', g: 'Fit', p: 12 },
      { l: 'From target region (Rajasthan)', g: 'Fit', p: 8 },
      { l: 'Live Web Chat Lead Capture', g: 'Engagement', p: 15 }
    ],
    isReal: false
  },
  {
    id: 'L-1003',
    name: 'Suresh Verma',
    phone: '+91 94140 22001',
    email: 'suresh.v@example.com',
    course: 'B.Tech',
    branch: 'Civil Engineering',
    city: 'Kota',
    state: 'Rajasthan',
    channel: 'Live Web Chat',
    academic: '12th PCM · 74%',
    status: 'Qualified',
    counsellorId: 'C_CIV_1',
    counsellorName: 'Rajesh Sharma (B.Tech Civil)',
    created: '2026-10-09T16:45',
    summary: '12th PCM 74%, interested in Civil Engineering and concrete structure labs.',
    score: 72,
    tier: 'Hot',
    breakdown: [
      { l: 'Name captured', g: 'Profile', p: 3 },
      { l: 'Direct phone provided (No OTP)', g: 'Profile', p: 7 },
      { l: 'Programme identified', g: 'Profile', p: 5 },
      { l: 'Asked fees / scholarship', g: 'Intent', p: 8 },
      { l: 'Marks meet programme eligibility', g: 'Fit', p: 12 },
      { l: 'From target region (Rajasthan)', g: 'Fit', p: 8 },
      { l: 'Live Web Chat Lead Capture', g: 'Engagement', p: 15 }
    ],
    isReal: false
  },
  {
    id: 'L-1004',
    name: 'Ankit Soni',
    phone: '+91 98280 33001',
    email: 'ankit.s@example.com',
    course: 'B.Tech',
    branch: 'Electronics Engineering (ECE)',
    city: 'Alwar',
    state: 'Rajasthan',
    channel: 'Live Web Chat',
    academic: '12th PCM · 80%',
    status: 'Qualified',
    counsellorId: 'C_ECE_1',
    counsellorName: 'Vikram Joshi (B.Tech Electronic)',
    created: '2026-10-07T11:15',
    summary: 'Interested in VLSI design, semiconductor chips, and IoT labs.',
    score: 74,
    tier: 'Hot',
    breakdown: [
      { l: 'Name captured', g: 'Profile', p: 3 },
      { l: 'Direct phone provided (No OTP)', g: 'Profile', p: 7 },
      { l: 'Programme identified', g: 'Profile', p: 5 },
      { l: 'Marks meet programme eligibility', g: 'Fit', p: 12 },
      { l: 'From target region (Rajasthan)', g: 'Fit', p: 8 },
      { l: 'Live Web Chat Lead Capture', g: 'Engagement', p: 15 }
    ],
    isReal: false
  },
  {
    id: 'L-1005',
    name: 'Rahul Jangid',
    phone: '+91 97840 44001',
    email: 'rahul.j@example.com',
    course: 'B.Tech',
    branch: 'Mechanical Engineering',
    city: 'Bikaner',
    state: 'Rajasthan',
    channel: 'Live Web Chat',
    academic: '12th PCM · 78%',
    status: 'Contacted',
    counsellorId: 'C_MECH_1',
    counsellorName: 'Ajay Meena (B.Tech Mechanical)',
    created: '2026-10-05T09:20',
    summary: 'PCM 78%, enquired for EV & Automobile lab facilities and campus placement.',
    score: 68,
    tier: 'Warm',
    breakdown: [
      { l: 'Name captured', g: 'Profile', p: 3 },
      { l: 'Direct phone provided (No OTP)', g: 'Profile', p: 7 },
      { l: 'Programme identified', g: 'Profile', p: 5 },
      { l: 'Marks meet programme eligibility', g: 'Fit', p: 12 },
      { l: 'From target region (Rajasthan)', g: 'Fit', p: 8 },
      { l: 'Live Web Chat Lead Capture', g: 'Engagement', p: 15 }
    ],
    isReal: false
  }
];

const BOOKINGS_DATA = [
  { id: 'B-501', leadName: 'Priya Sharma', at: '2026-10-14 11:00 AM', type: 'Online Counselling', mode: 'Google Meet', counsellor: 'Neha Mathur (CSE)', status: 'Confirmed' },
  { id: 'B-502', leadName: 'Arjun Rathore', at: '2026-10-14 02:30 PM', type: 'Campus Visit', mode: 'Admission Cell, Block A', counsellor: 'Saurabh Gupta (CSE)', status: 'Confirmed' },
  { id: 'B-503', leadName: 'Suresh Verma', at: '2026-10-15 11:30 AM', type: 'Lab Tour & Counselling', mode: 'Civil Engg Block', counsellor: 'Rajesh Sharma (Civil)', status: 'Confirmed' },
  { id: 'B-504', leadName: 'Ankit Soni', at: '2026-10-15 03:00 PM', type: 'Online Counselling', mode: 'Google Meet', counsellor: 'Vikram Joshi (ECE)', status: 'Scheduled' },
  { id: 'B-505', leadName: 'Rahul Jangid', at: '2026-10-16 10:00 AM', type: 'Campus Visit', mode: 'Mechanical Workshop', counsellor: 'Ajay Meena (Mech)', status: 'Confirmed' }
];

const FOLLOWUPS_DATA = [
  { id: 'F-9001', leadName: 'Priya Sharma', at: 'Today 09:00 AM', stage: 'Qualified, not booked', ch: 'WhatsApp', tpl: 'visit_offer_v1 – Campus visit slots', status: 'Read · booked' },
  { id: 'F-9002', leadName: 'Arjun Rathore', at: 'Today 11:30 AM', stage: 'Lead captured', ch: 'WhatsApp', tpl: 'thanks_brochure_v1 – B.Tech fee sheet', status: 'Delivered' },
  { id: 'F-9003', leadName: 'Suresh Verma', at: 'Today 02:00 PM', stage: 'Civil Enquiry', ch: 'WhatsApp', tpl: 'civil_labs_v1 – Structural labs guide', status: 'Sent' },
  { id: 'F-9004', leadName: 'Ankit Soni', at: 'Tomorrow 10:00 AM', stage: 'ECE Enquiry', ch: 'WhatsApp', tpl: 'ece_placements_v1 – VLSI placements', status: 'Scheduled' }
];

export default function LeadEnginePage() {
  const [activeTab, setActiveTab] = useState<'leads' | 'chat' | 'overview' | 'counsellors' | 'bookings' | 'followups' | 'scoring'>('leads');
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [isSample, setIsSample] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState<'All' | 'Hot' | 'Warm' | 'Cold' | 'Real'>('All');
  const [isSyncing, setIsSyncing] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);

  // Counsellors branch filter
  const [counsellorBranchFilter, setCounsellorBranchFilter] = useState<'all' | 'CSE' | 'Civil' | 'Electronic' | 'Mechanical'>('all');

  // AI Chat & In-Session Memory Tracking
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; sources?: any[]; leadInfo?: any }>>([
    {
      id: 'm-init',
      role: 'assistant',
      text: "👋 **Hello! Welcome to Poornima University Admissions 2026-27.**\n\nWhich engineering branch are you interested in — **Computer Science (CSE)**, **Civil**, **Electronic (ECE)**, or **Mechanical**? Feel free to share your 12th percentage or mobile number so I can calculate your exact scholarship discount and assign you directly to that branch's dedicated admission counsellor!"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionLead, setSessionLead] = useState<{
    marks?: string;
    course?: string;
    branch?: string;
    name?: string;
    phone?: string;
    assignedCounsellor?: string;
  }>({});

  // Direct Lead Modal Form
  const [isDirectLeadModalOpen, setIsDirectLeadModalOpen] = useState(false);
  const [directName, setDirectName] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [directCourse, setDirectCourse] = useState('B.Tech');
  const [directBranch, setDirectBranch] = useState('Computer Science (CSE)');
  const [directCity, setDirectCity] = useState('Jaipur');
  const [directAcademic, setDirectAcademic] = useState('12th PCM · 75%');
  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Load leads on mount
  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setIsSyncing(true);
    try {
      const res = await api.getLeadEngineLeads('proj_poornima');
      if (res && Array.isArray(res.leads) && res.leads.length > 0) {
        const mapped: LeadItem[] = res.leads.map((l: any) => {
          const br = l.branch || (l.course?.includes('B.Tech') ? 'Computer Science (CSE)' : l.course) || 'Computer Science (CSE)';
          let cId = 'C_CSE_1';
          let cName = 'Neha Mathur (B.Tech CSE)';
          const brLower = br.toLowerCase();
          if (brLower.includes('civil')) { cId = 'C_CIV_1'; cName = 'Rajesh Sharma (B.Tech Civil)'; }
          else if (brLower.includes('electronic') || brLower.includes('ece')) { cId = 'C_ECE_1'; cName = 'Vikram Joshi (B.Tech Electronic)'; }
          else if (brLower.includes('mechanical') || brLower.includes('mech')) { cId = 'C_MECH_1'; cName = 'Ajay Meena (B.Tech Mechanical)'; }

          const leadScore = typeof l.score === 'number' ? l.score : 70;
          const leadTier: 'Hot' | 'Warm' | 'Cold' = leadScore >= 70 ? 'Hot' : (leadScore >= 40 ? 'Warm' : 'Cold');

          return {
            id: l.id || 'L-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
            name: l.name || 'Prospective Student',
            phone: l.phone || '',
            email: l.email || '',
            course: l.course || 'B.Tech',
            branch: br,
            city: l.city || 'Jaipur',
            state: l.state || 'Rajasthan',
            channel: l.source === 'REAL_CHAT' || l.source === 'Live Web Chat' ? 'Live Web Chat' : 'Direct Entry',
            academic: l.academic || '12th PCM · Direct Capture',
            status: (l.status === 'QUALIFIED' ? 'Qualified' : (l.status === 'CONVERTED' ? 'Converted' : 'New')) as LeadItem['status'],
            counsellorId: cId,
            counsellorName: l.assigned_counsellor || cName,
            created: l.created_at || new Date().toISOString(),
            summary: l.summary || `Direct student enquiry for ${l.course || 'B.Tech'} (${br}).`,
            score: leadScore,
            tier: leadTier,
            breakdown: [
              { l: 'Name captured', g: 'Profile', p: 3 },
              { l: 'Direct phone provided (No OTP)', g: 'Profile', p: 7 },
              { l: 'Programme identified', g: 'Profile', p: 5 },
              { l: 'Asked fees / scholarship', g: 'Intent', p: 8 },
              { l: 'Requested counselor contact', g: 'Intent', p: 8 },
              { l: 'Live Web Chat Lead Capture', g: 'Engagement', p: 15 },
              { l: 'From target admission region', g: 'Fit', p: 20 }
            ],
            isReal: l.source === 'REAL_CHAT' || l.source === 'Live Web Chat'
          };
        });
        setLeads(mapped);
        setIsSample(false);
        setBackendConnected(true);
        setIsSyncing(false);
        return;
      }
    } catch (e) {
      setBackendConnected(false);
    }
    // Fallback to sample leads if backend is empty
    setLeads(SAMPLE_LEADS_DATA);
    setIsSample(true);
    setIsSyncing(false);
  };

  const loadSampleData = () => {
    setLeads(SAMPLE_LEADS_DATA);
    setIsSample(true);
  };

  const clearAllLeads = () => {
    if (!leads.length) return;
    if (window.confirm('Clear all leads from the active view?')) {
      setLeads([]);
      setIsSample(false);
    }
  };

  const updateLeadStatus = (id: string, newStatus: LeadItem['status']) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  // Direct Lead Modal Submit
  const handleDirectLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPhone.trim()) return;
    setIsSubmittingDirect(true);

    try {
      const res = await api.captureLead({
        name: directName.trim() || 'Prospective Student',
        phone: directPhone.trim(),
        course: directCourse,
        branch: directBranch,
        city: directCity,
        academic: directAcademic,
        chat_summary: `Direct Quick Capture: ${directName || 'Student'} (${directPhone}) enquired for ${directCourse} - ${directBranch} from ${directCity}.`,
        project_id: 'proj_poornima'
      });

      const newLead: LeadItem = {
        id: res.id,
        name: res.name,
        phone: res.phone,
        email: res.email || '',
        course: res.course,
        branch: res.branch || directBranch,
        city: res.city,
        state: res.state,
        channel: 'Direct Entry',
        academic: directAcademic,
        status: 'Qualified',
        counsellorName: res.assigned_counsellor,
        created: res.created_at,
        summary: res.summary,
        score: res.score,
        tier: res.tier as any,
        breakdown: [
          { l: 'Name captured', g: 'Profile', p: 3 },
          { l: 'Direct phone provided (No OTP)', g: 'Profile', p: 7 },
          { l: 'Programme identified', g: 'Profile', p: 5 },
          { l: 'Asked fees / scholarship', g: 'Intent', p: 8 },
          { l: 'Direct Lead Capture Conversion', g: 'Engagement', p: 10 },
          { l: 'From target admission region', g: 'Fit', p: 8 }
        ],
        isReal: true
      };

      setLeads(prev => [newLead, ...prev]);
      setIsDirectLeadModalOpen(false);
      setDirectName('');
      setDirectPhone('');
    } catch (err: any) {
      alert(`Could not capture lead: ${err?.message || 'Server error'}`);
    } finally {
      setIsSubmittingDirect(false);
    }
  };

  // AI Chat & In-Session Lead Extraction
  const handleSendChatMessage = async (overrideText?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = (overrideText || chatInput).trim();
    if (!textToSend || chatLoading) return;

    setChatInput('');
    const userMsgId = `user_${Date.now()}`;
    const newChatHistory = [...chatMessages, { id: userMsgId, role: 'user' as const, text: textToSend }];
    setChatMessages(newChatHistory);
    setChatLoading(true);

    // In-chat detection
    const rawClean = textToSend.replace(/\+91/g, '').replace(/[\s\-\(\)\.]/g, '');
    const phoneMatch = textToSend.match(/\b[6-9]\d{9}\b/) || rawClean.match(/[6-9]\d{9}/);
    const pctMatch = textToSend.match(/(\b\d{1,2}(?:\.\d+)?\s*%)/) || textToSend.match(/(\b\d{2}\s*(?:percent|percentage|marks|pcm)\b)/i);
    const lowerText = textToSend.toLowerCase();

    let detectedCourse = sessionLead.course || 'B.Tech';
    let detectedBranch = sessionLead.branch;

    if (lowerText.includes('mechanical') || lowerText.includes('mech')) {
      detectedBranch = 'Mechanical Engineering';
    } else if (lowerText.includes('civil')) {
      detectedBranch = 'Civil Engineering';
    } else if (lowerText.includes('electronic') || lowerText.includes('ece')) {
      detectedBranch = 'Electronics Engineering (ECE)';
    } else if (lowerText.includes('cse') || lowerText.includes('computer science') || lowerText.includes('data science') || lowerText.includes('ai')) {
      detectedBranch = 'Computer Science (CSE)';
    }

    let detectedName = sessionLead.name;
    const nameMatch = textToSend.match(/\b(?:my name is|mera nam|mera name|naam|name is|i am)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i);
    if (nameMatch) {
      const candidate = nameMatch[1].trim();
      if (!['interested', 'looking', 'asking', 'student', 'btech', 'civil', 'mechanical'].includes(candidate.toLowerCase())) {
        detectedName = candidate.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    }

    let assignedCounsellorName = 'Neha Mathur (B.Tech CSE)';
    if (detectedBranch === 'Civil Engineering') assignedCounsellorName = 'Rajesh Sharma (B.Tech Civil)';
    else if (detectedBranch === 'Electronics Engineering (ECE)') assignedCounsellorName = 'Vikram Joshi (B.Tech Electronic)';
    else if (detectedBranch === 'Mechanical Engineering') assignedCounsellorName = 'Ajay Meena (B.Tech Mechanical)';

    const updatedProfile = {
      ...sessionLead,
      marks: pctMatch ? pctMatch[0].trim() : sessionLead.marks,
      course: detectedCourse,
      branch: detectedBranch || sessionLead.branch,
      name: detectedName || sessionLead.name,
      phone: phoneMatch ? phoneMatch[0] : sessionLead.phone,
      assignedCounsellor: assignedCounsellorName
    };
    setSessionLead(updatedProfile);

    let autoCapturedLead: any = null;

    if (phoneMatch) {
      const capturedPhone = phoneMatch[0];
      const leadName = updatedProfile.name || 'Prospective Student';
      const leadBranch = updatedProfile.branch || 'Computer Science (CSE)';

      try {
        const captureRes = await api.captureLead({
          name: leadName,
          phone: capturedPhone,
          course: detectedCourse,
          branch: leadBranch,
          academic: updatedProfile.marks ? `12th ${updatedProfile.marks}` : '12th PCM',
          city: 'Jaipur',
          chat_summary: `Direct In-Chat Lead: ${leadName} (${capturedPhone}) enquired for ${detectedCourse} - ${leadBranch}. Assigned to ${assignedCounsellorName}.`,
          project_id: 'proj_poornima'
        });

        autoCapturedLead = captureRes;

        const newLeadItem: LeadItem = {
          id: captureRes.id,
          name: captureRes.name,
          phone: captureRes.phone,
          email: captureRes.email || '',
          course: captureRes.course,
          branch: leadBranch,
          city: captureRes.city,
          state: captureRes.state,
          channel: 'Live Web Chat',
          academic: updatedProfile.marks ? `12th Marks: ${updatedProfile.marks}` : '12th PCM · Direct In-Chat',
          status: 'Qualified',
          counsellorName: assignedCounsellorName,
          created: captureRes.created_at,
          summary: captureRes.summary,
          score: captureRes.score,
          tier: captureRes.tier as any,
          breakdown: [
            { l: 'Name captured in chat', g: 'Profile', p: 3 },
            { l: 'Direct mobile number provided (No OTP)', g: 'Profile', p: 7 },
            { l: 'Branch & Programme identified', g: 'Profile', p: 5 },
            { l: '12th Marks / Percentage Shared', g: 'Intent', p: 8 },
            { l: 'Live Web Chat Lead Capture', g: 'Engagement', p: 15 },
            { l: 'From target admission region', g: 'Fit', p: 20 }
          ],
          isReal: true
        };

        setLeads(prev => [newLeadItem, ...prev]);
      } catch (err) {
        console.error('In-chat lead capture failed:', err);
      }
    }

    try {
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
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          role: 'assistant',
          text: 'B.Tech tuition fee at Poornima University is approximately ₹1.21 Lakhs – ₹1.65 Lakhs per year. Merit scholarships up to 80% are available based on 12th PCM / CUET marks. Official fee sheet is available.',
          leadInfo: autoCapturedLead
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const exportCsv = () => {
    if (!leads.length) return;
    const head = ['Lead ID', 'Name', 'Email', 'Phone', 'Course', 'Branch', 'City', 'Score', 'Tier', 'Status', 'Assigned Counsellor', 'Captured Date'];
    const rows = leads.map(l => [
      l.id,
      l.name,
      l.email,
      l.phone,
      l.course,
      l.branch,
      l.city,
      l.score,
      l.tier,
      l.status,
      l.counsellorName || '',
      l.created
    ]);
    const csv = [head, ...rows]
      .map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `omniagent-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const scoreColor = (s: number) => {
    return s >= 75 ? 'var(--success)' : s >= 60 ? 'var(--amber)' : 'var(--text-3)';
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '—';
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesStatus = !statusFilter || l.status === statusFilter;
    const matchesTier = tierFilter === 'All'
      ? true
      : tierFilter === 'Real'
      ? l.isReal
      : l.tier === tierFilter;

    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || (
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.phone.toLowerCase().includes(q) ||
      l.branch.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q)
    );
    return matchesStatus && matchesTier && matchesSearch;
  });

  const totalCount = leads.length;
  const newCount = leads.filter(l => l.status === 'New').length;
  const qualifiedCount = leads.filter(l => l.status === 'Qualified').length;
  const convertedCount = leads.filter(l => l.status === 'Converted').length;

  return (
    <DashboardShell activeNav="lead-engine">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Lead Engine</h1>
              <span className="badge badge-teal">
                <Users className="w-3 h-3" /> CRM
              </span>
              {backendConnected && (
                <span className="badge badge-emerald text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Backend Sync
                </span>
              )}
            </div>
            <p className="text-sm t3 mt-1">
              Every lead your assistants capture — tracked, scored and exportable.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <button
              type="button"
              onClick={() => setIsDirectLeadModalOpen(true)}
              className="btn btn-secondary btn-sm"
              title="Add a lead manually without OTP"
            >
              <Plus className="w-3.5 h-3.5" /> Direct Capture
            </button>
            <button
              type="button"
              onClick={loadLeads}
              disabled={isSyncing}
              className="btn btn-secondary btn-sm"
              title="Sync leads from FastAPI backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
              {isSyncing ? 'Syncing…' : 'Sync backend'}
            </button>
            <button
              type="button"
              onClick={loadSampleData}
              className="btn btn-secondary btn-sm"
            >
              <Database className="w-3.5 h-3.5" /> Load sample data
            </button>
            <button
              type="button"
              onClick={clearAllLeads}
              className="btn btn-danger btn-sm"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear all
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="btn btn-primary btn-sm"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* 4 Primary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-4">
            <p className="text-[11px] t3 font-bold uppercase tracking-wide">Total leads</p>
            <p className="text-2xl font-extrabold mt-1">{totalCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] t3 font-bold uppercase tracking-wide">New</p>
            <p className="text-2xl font-extrabold mt-1">{newCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] t3 font-bold uppercase tracking-wide">Qualified</p>
            <p className="text-2xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">{qualifiedCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] t3 font-bold uppercase tracking-wide">Converted</p>
            <p className="text-2xl font-extrabold mt-1">{convertedCount}</p>
          </div>
        </div>

        {/* Tabs Navigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b bd no-scrollbar text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'leads'
                ? 'bg-[var(--surface-3)] text-[var(--text-1)] font-bold shadow-xs'
                : 't3 hover:text-[var(--text-1)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Leads Master ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-xs'
                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> AI Chat &amp; Capture
            <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-extrabold">LIVE</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[var(--surface-3)] text-[var(--text-1)] font-bold shadow-xs'
                : 't3 hover:text-[var(--text-1)]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> Admission Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('counsellors')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'counsellors'
                ? 'bg-[var(--surface-3)] text-[var(--text-1)] font-bold shadow-xs'
                : 't3 hover:text-[var(--text-1)]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> 4 Branches &amp; Counsellors ({COUNSELLORS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bookings'
                ? 'bg-[var(--surface-3)] text-[var(--text-1)] font-bold shadow-xs'
                : 't3 hover:text-[var(--text-1)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Bookings ({BOOKINGS_DATA.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('followups')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'followups'
                ? 'bg-[var(--surface-3)] text-[var(--text-1)] font-bold shadow-xs'
                : 't3 hover:text-[var(--text-1)]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Follow-ups ({FOLLOWUPS_DATA.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scoring')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'scoring'
                ? 'bg-[var(--surface-3)] text-[var(--text-1)] font-bold shadow-xs'
                : 't3 hover:text-[var(--text-1)]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> 100-Pt Scoring Rules
          </button>
        </div>

        {/* TAB 1: LEADS MASTER TABLE */}
        {activeTab === 'leads' && (
          <div className="card overflow-hidden">
            {/* Filter toolbar */}
            <div className="p-4 border-b bd sf2 flex flex-col sm:flex-row gap-2 sm:items-center justify-between flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none t3">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input !pl-9 !text-xs !py-1.5"
                    placeholder="Search name, email, phone, city…"
                    aria-label="Search leads"
                  />
                </div>

                {/* Tier Filter Pills */}
                <div className="flex items-center gap-1 sf3 p-1 rounded-xl border bd">
                  {(['All', 'Hot', 'Warm', 'Cold', 'Real'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTierFilter(t)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                        tierFilter === t
                          ? 'bg-[var(--surface-1)] text-[var(--text-1)] font-bold shadow-xs'
                          : 't3 hover:text-[var(--text-1)]'
                      }`}
                    >
                      {t === 'Hot' ? '🔥 Hot' : t === 'Real' ? '🟢 Real Chat' : t}
                    </button>
                  ))}
                </div>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select !w-auto !text-xs !py-1.5"
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="New">New</option>
                <option value="Qualified">Qualified</option>
                <option value="Contacted">Contacted</option>
                <option value="Converted">Converted</option>
              </select>
            </div>

            {/* Leads Table */}
            <div className="overflow-x-auto">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>VISITOR</th>
                    <th>CONTACT</th>
                    <th>SOURCE</th>
                    <th>SCORE</th>
                    <th>STATUS</th>
                    <th>CAPTURED</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLead(l)}
                      className="cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                    >
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="avatar avatar-user !w-7 !h-7 !rounded-lg text-[10px] font-extrabold shrink-0">
                            {(l.name || '?')
                              .split(' ')
                              .map(w => w[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-xs">{l.name}</p>
                              {l.isReal && (
                                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold text-[9px] border border-emerald-300 dark:border-emerald-800">
                                  LIVE
                                </span>
                              )}
                              {l.tier === 'Hot' && (
                                <span className="text-[10px]" title="Hot Priority">🔥</span>
                              )}
                            </div>
                            <p className="text-[10px] t3 truncate max-w-[200px]">
                              {l.course} ({l.branch}) · {l.city}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-xs truncate max-w-[160px]">{l.email || '—'}</p>
                        <p className="text-[10px] t3 font-mono">{l.phone || '—'}</p>
                      </td>
                      <td className="t3 text-xs">{l.channel || 'Live Web Chat'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="score-bar">
                            <span
                              style={{
                                width: `${l.score || 0}%`,
                                background: scoreColor(l.score || 0)
                              }}
                            ></span>
                          </div>
                          <span className="text-xs font-bold font-mono">{l.score || 0}</span>
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          value={l.status}
                          onChange={(e) => updateLeadStatus(l.id, e.target.value as any)}
                          className="select !w-auto !py-1 !px-2 !text-xs cursor-pointer"
                          aria-label={`Status for ${l.name}`}
                        >
                          <option value="New">New</option>
                          <option value="Qualified">Qualified</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Converted">Converted</option>
                        </select>
                      </td>
                      <td className="t3 text-xs whitespace-nowrap">{formatDate(l.created)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedLead(l)}
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-3)] text-blue-600 dark:text-blue-400"
                            title="Inspect Lead Details"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteLead(l.id)}
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-3)] t3 hover:text-[var(--danger)]"
                            aria-label={`Delete lead ${l.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredLeads.length === 0 && (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl sf3 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6 t3" />
                </div>
                <p className="font-bold text-sm">No leads found</p>
                <p className="text-xs t3 max-w-sm mx-auto">
                  Try clearing the search query or load sample leads to preview.
                </p>
                <button
                  type="button"
                  onClick={loadSampleData}
                  className="btn btn-secondary btn-sm mx-auto"
                >
                  <Database className="w-3.5 h-3.5" /> Load sample data
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI CHAT & IN-SESSION LEAD CAPTURE */}
        {activeTab === 'chat' && (
          <div className="grid lg:grid-cols-12 gap-5">
            {/* Left: Chat Window */}
            <div className="lg:col-span-8 card flex flex-col h-[650px] overflow-hidden">
              {/* Chat Top Banner */}
              <div className="p-3.5 border-b bd sf2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-none">Poornima Admission Web Search AI</h3>
                    <p className="text-[10px] t3 mt-0.5">Live Official Website Grounding · Direct System Database Capture</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setChatMessages([chatMessages[0]])}
                  className="btn btn-secondary btn-sm !py-1 !text-[11px]"
                >
                  Clear Chat
                </button>
              </div>

              {/* In-Session Memory Pill Bar */}
              <div className="px-3.5 py-2 border-b bd sf3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold t2 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Memory:
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                    sessionLead.course ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800' : 'sf t3'
                  }`}>
                    {sessionLead.course ? `✓ ${sessionLead.course}` : 'Course: Exploring'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                    sessionLead.branch ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold' : 'sf t3'
                  }`}>
                    {sessionLead.branch ? `✓ ${sessionLead.branch}` : 'Branch: Pending'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                    sessionLead.marks ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' : 'sf t3'
                  }`}>
                    {sessionLead.marks ? `✓ 12th Marks: ${sessionLead.marks}` : '12th Marks: Pending'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                    sessionLead.phone ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-mono font-bold' : 'sf t3'
                  }`}>
                    {sessionLead.phone ? `✓ Mobile: ${sessionLead.phone}` : 'Mobile: Pending'}
                  </span>
                </div>
                {sessionLead.assignedCounsellor && (
                  <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300">
                    🎯 {sessionLead.assignedCounsellor}
                  </span>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {chatMessages.map((m) => (
                  <div key={m.id} className={`chat-msg ${m.role === 'user' ? 'user' : 'assistant'}`}>
                    {m.role === 'assistant' && (
                      <div className="avatar avatar-bot">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="min-w-0 max-w-2xl">
                      <div className="chat-bubble md">
                        <MarkdownContent content={m.text} isUser={m.role === 'user'} />
                      </div>

                      {/* In-chat captured lead card */}
                      {m.leadInfo && (
                        <div className="mt-2 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs text-emerald-950 dark:text-emerald-100 space-y-1.5">
                          <div className="flex items-center justify-between font-bold border-b border-emerald-200 dark:border-emerald-900 pb-1.5">
                            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" /> Lead Captured in Database!
                            </span>
                            <span className="badge badge-emerald text-[10px]">
                              Score: {m.leadInfo.score}/100 · {m.leadInfo.tier} Lead 🔥
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                            <div>Student: <strong>{m.leadInfo.name}</strong></div>
                            <div>Mobile: <strong className="font-mono">{m.leadInfo.phone}</strong></div>
                            <div>Branch: <strong>{m.leadInfo.branch || m.leadInfo.course}</strong></div>
                            <div>Counsellor: <strong>{m.leadInfo.assigned_counsellor}</strong></div>
                          </div>
                          <div className="pt-1.5 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const leadMatch = leads.find(l => l.id === m.leadInfo.id);
                                if (leadMatch) setSelectedLead(leadMatch);
                                setActiveTab('leads');
                              }}
                              className="btn btn-secondary btn-sm !py-1 !text-[10px]"
                            >
                              Open in Leads Table <ArrowRight className="w-3 h-3 ml-1" />
                            </button>
                            <a
                              href={`https://wa.me/91${m.leadInfo.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${m.leadInfo.name}, thank you for contacting Poornima University Admissions.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-primary btn-sm !py-1 !text-[10px]"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp Counsellor
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Sources */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                          <span className="text-[10px] t3 font-semibold">Sources:</span>
                          {m.sources.map((s: any, idx: number) => (
                            <a
                              key={idx}
                              href={s.url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="source-pill !text-[10px]"
                            >
                              {(s.title || s.url || 'Official page').slice(0, 30)}
                              <ExternalLink className="w-2.5 h-2.5 ml-1 inline" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="chat-msg assistant">
                    <div className="avatar avatar-bot">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="chat-bubble flex items-center gap-2 text-xs t3">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Searching official college website…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="px-3 py-2 border-t bd sf3 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                <span className="t3 shrink-0 flex items-center gap-1 font-bold">
                  <Zap className="w-3 h-3 text-amber-500" /> Quick:
                </span>
                {[
                  '💻 B.Tech Computer Science (CSE)',
                  '🏗️ B.Tech Civil Engineering',
                  '⚡ B.Tech Electronics (ECE)',
                  '⚙️ B.Tech Mechanical Engineering',
                  'My 12th is 75%, calculate my scholarship',
                  'My number is 9829011001, connect with counsellor'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={chatLoading}
                    onClick={() => handleSendChatMessage(chip)}
                    className="px-2.5 py-1 rounded-full sf border bd hover:border-blue-500 text-[11px] whitespace-nowrap font-medium transition-all shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={(e) => handleSendChatMessage(undefined, e)} className="p-3 border-t bd flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask fees, eligibility, or share 10-digit number (e.g., 'Rohit, 9829011001')…"
                  className="input !text-xs !py-2 w-full"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="btn btn-primary btn-sm !py-2 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Right: Lead Capture Explainer & Quick Form */}
            <div className="lg:col-span-4 space-y-4">
              <div className="card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-600/10 text-teal-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs">100% In-Chat Lead Capture</h3>
                    <p className="text-[11px] t3">No OTP, No Barrier</p>
                  </div>
                </div>
                <p className="text-xs t3 leading-relaxed">
                  As prospective students chat about courses, the AI extracts their <strong>course preference</strong>, <strong>12th marks</strong>, and <strong>10-digit mobile number</strong>, assigns the lead to a branch counsellor, and scores it 0–100.
                </p>
                <div className="p-2.5 rounded-xl sf3 border bd text-[11px] space-y-1">
                  <div className="font-bold text-xs t2">Core Rule:</div>
                  <p className="t3">
                    Students sharing valid phone numbers immediately transition to <strong>Qualified Hot Lead</strong> status.
                  </p>
                </div>
              </div>

              {/* Direct Quick Capture Card */}
              <div className="card p-4 space-y-3">
                <h3 className="font-bold text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" /> Quick Direct Lead Entry
                </h3>
                <p className="text-[11px] t3">Add an offline or phone inquiry directly into the CRM database:</p>
                <button
                  type="button"
                  onClick={() => setIsDirectLeadModalOpen(true)}
                  className="btn btn-primary btn-sm w-full"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Open Direct Lead Form
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADMISSION OVERVIEW (KPIS, FUNNEL & CALL FIRST) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Funnel & Tier Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Funnel */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between border-b bd pb-3">
                  <h3 className="font-bold text-sm">Admission Conversion Funnel</h3>
                  <span className="text-[11px] t3 font-semibold">Stage Progression</span>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Total Web Inquiries', count: totalCount + 24 },
                    { name: 'Leads Captured', count: totalCount },
                    { name: 'Phone Verified (No OTP)', count: totalCount },
                    { name: 'Qualified (Score ≥ 40)', count: qualifiedCount },
                    { name: 'Counselling Booked', count: BOOKINGS_DATA.length },
                    { name: 'Enrolled / Won', count: convertedCount }
                  ].map((st, idx) => {
                    const maxVal = totalCount + 24;
                    const pct = Math.max(8, Math.round((st.count / (maxVal || 1)) * 100));
                    return (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <span className="w-36 font-semibold t2 truncate">{st.name}</span>
                        <div className="flex-1 bg-[var(--surface-3)] rounded-full h-3.5 overflow-hidden">
                          <div className="bg-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono font-bold w-8 text-right">{st.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tier & Channel Breakdown */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between border-b bd pb-3">
                  <h3 className="font-bold text-sm">Leads by Temperature &amp; Channel</h3>
                  <span className="text-[11px] t3 font-semibold">Priority Distribution</span>
                </div>
                <div className="space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider t3">Temperature Tier</p>
                  <div className="space-y-2">
                    {[
                      { tier: '🔥 Hot (Score ≥ 70)', count: leads.filter(l => l.tier === 'Hot').length, color: 'bg-red-500' },
                      { tier: '⚡ Warm (Score 40–69)', count: leads.filter(l => l.tier === 'Warm').length, color: 'bg-amber-500' },
                      { tier: '❄️ Cold (Score < 40)', count: leads.filter(l => l.tier === 'Cold').length, color: 'bg-blue-500' }
                    ].map((tb, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <span className="w-36 font-medium t2">{tb.tier}</span>
                        <div className="flex-1 bg-[var(--surface-3)] rounded-full h-2.5 overflow-hidden">
                          <div className={`${tb.color} h-full rounded-full`} style={{ width: `${(tb.count / (totalCount || 1)) * 100}%` }} />
                        </div>
                        <span className="font-mono font-bold w-6 text-right">{tb.count}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] font-bold uppercase tracking-wider t3 pt-2">Channel Source</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b bd">
                      <span className="t2">Live Web Chat</span>
                      <span className="font-mono font-bold">{leads.filter(l => l.channel === 'Live Web Chat').length}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b bd">
                      <span className="t2">Direct Entry</span>
                      <span className="font-mono font-bold">{leads.filter(l => l.channel !== 'Live Web Chat').length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* "Call These First" Hot Actionable Queue */}
            <div className="card overflow-hidden">
              <div className="p-4 border-b bd sf2 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-red-500 fill-red-500" /> Call These First (Hot Priority Queue)
                  </h3>
                  <p className="text-xs t3">High score Hot/Warm leads requiring immediate counsellor phone outreach</p>
                </div>
                <span className="badge badge-emerald text-xs">
                  {leads.filter(l => l.tier === 'Hot').length} Actionable Leads
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>VISITOR</th>
                      <th>CONTACT</th>
                      <th>PROGRAMME</th>
                      <th>SCORE</th>
                      <th>COUNSELLOR</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.filter(l => l.tier === 'Hot').slice(0, 5).map(l => (
                      <tr key={l.id} onClick={() => setSelectedLead(l)} className="cursor-pointer hover:bg-[var(--surface-2)]">
                        <td className="font-bold text-xs">{l.name}</td>
                        <td className="font-mono text-xs">{l.phone}</td>
                        <td className="text-xs">{l.course} ({l.branch})</td>
                        <td className="font-mono font-bold text-xs text-red-500">{l.score}</td>
                        <td className="text-xs t3">{l.counsellorName}</td>
                        <td>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLead(l);
                            }}
                            className="btn btn-secondary btn-sm !py-1 !text-[11px]"
                          >
                            Inspect <ChevronRight className="w-3 h-3 ml-1" />
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

        {/* TAB 4: 4 BRANCHES & COUNSELLOR ROSTER */}
        {activeTab === 'counsellors' && (
          <div className="space-y-5">
            {/* 4 Branch Capacity Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[
                { branch: 'CSE', icon: '💻', title: 'Computer Science (CSE)', sub: 'Core CSE, AI & ML, Cyber, Cloud', color: 'badge-blue' },
                { branch: 'Civil', icon: '🏗️', title: 'Civil Engineering', sub: 'Structures, Highway, Smart Cities', color: 'badge-amber' },
                { branch: 'Electronic', icon: '⚡', title: 'Electronics (ECE)', sub: 'VLSI Chips, Embedded IoT, 5G', color: 'badge-teal' },
                { branch: 'Mechanical', icon: '⚙️', title: 'Mechanical Engineering', sub: 'EV & Auto, Robotics, CAD/CAM', color: 'badge-emerald' }
              ].map((bCard) => {
                const branchLeads = leads.filter(l => (l.branch || '').toLowerCase().includes(bCard.branch.toLowerCase()));
                const branchCounsellors = COUNSELLORS.filter(c => c.branch === bCard.branch);
                const isSelected = counsellorBranchFilter === bCard.branch;

                return (
                  <div
                    key={bCard.branch}
                    onClick={() => setCounsellorBranchFilter(isSelected ? 'all' : (bCard.branch as any))}
                    className={`card p-4 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{bCard.icon}</span>
                      <span className="badge badge-slate text-[10px] font-bold">5 Counsellors</span>
                    </div>
                    <h4 className="font-bold text-sm mt-2">{bCard.title}</h4>
                    <p className="text-[11px] t3 mt-0.5">{bCard.sub}</p>
                    <div className="mt-3 pt-2.5 border-t bd flex justify-between text-xs font-semibold">
                      <span className="t3">Active Leads:</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">{branchLeads.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Counsellor Roster Table */}
            <div className="card overflow-hidden">
              <div className="p-4 border-b bd sf2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-teal-600" /> Counsellor Roster &amp; Branch Assignment
                  </h3>
                  <p className="text-xs t3">20 Demo Counsellors mapped round-robin across all 4 engineering branches</p>
                </div>
                <div className="flex gap-1 sf3 p-1 rounded-xl border bd flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={() => setCounsellorBranchFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${counsellorBranchFilter === 'all' ? 'bg-[var(--surface-1)] text-[var(--text-1)] font-bold' : 't3'}`}
                  >
                    All ({COUNSELLORS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCounsellorBranchFilter('CSE')}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${counsellorBranchFilter === 'CSE' ? 'bg-[var(--surface-1)] text-[var(--text-1)] font-bold' : 't3'}`}
                  >
                    💻 CSE (5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCounsellorBranchFilter('Civil')}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${counsellorBranchFilter === 'Civil' ? 'bg-[var(--surface-1)] text-[var(--text-1)] font-bold' : 't3'}`}
                  >
                    🏗️ Civil (5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCounsellorBranchFilter('Electronic')}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${counsellorBranchFilter === 'Electronic' ? 'bg-[var(--surface-1)] text-[var(--text-1)] font-bold' : 't3'}`}
                  >
                    ⚡ ECE (5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCounsellorBranchFilter('Mechanical')}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${counsellorBranchFilter === 'Mechanical' ? 'bg-[var(--surface-1)] text-[var(--text-1)] font-bold' : 't3'}`}
                  >
                    ⚙️ Mech (5)
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>COUNSELLOR</th>
                      <th>BRANCH &amp; DOMAIN FOCUS</th>
                      <th>CAPACITY</th>
                      <th>HOURS</th>
                      <th>CALENDAR</th>
                      <th>CONTACT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COUNSELLORS.filter(c => counsellorBranchFilter === 'all' || c.branch === counsellorBranchFilter).map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="avatar avatar-user !w-7 !h-7 !rounded-lg text-[10px] font-bold">
                              {c.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-bold text-xs">{c.name}</p>
                              <p className="font-mono text-[10px] t3">{c.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-slate text-[10px] font-bold mr-1.5">{c.branch}</span>
                          <span className="text-xs t2">{c.specialization}</span>
                        </td>
                        <td className="font-mono text-xs">{c.maxOpen} max leads</td>
                        <td className="text-xs t3">{c.hours}</td>
                        <td>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {c.calendar}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${c.name}, here is a student admission inquiry.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-md hover:bg-[var(--surface-3)] text-emerald-600"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`tel:${c.phone}`}
                              className="p-1 rounded-md hover:bg-[var(--surface-3)] t3"
                              title="Call"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b bd sf2">
              <h3 className="font-bold text-sm">Counselling &amp; Campus Visit Bookings</h3>
              <p className="text-xs t3">Scheduled Google Meet sessions and campus tour bookings</p>
            </div>
            <div className="overflow-x-auto">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>BOOKING ID</th>
                    <th>STUDENT</th>
                    <th>DATE &amp; TIME</th>
                    <th>TYPE</th>
                    <th>VENUE / LINK</th>
                    <th>COUNSELLOR</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {BOOKINGS_DATA.map((b) => (
                    <tr key={b.id}>
                      <td className="font-mono text-xs t3 font-semibold">{b.id}</td>
                      <td className="font-bold text-xs">{b.leadName}</td>
                      <td className="font-mono text-xs text-blue-600 dark:text-blue-400">{b.at}</td>
                      <td className="text-xs">{b.type}</td>
                      <td className="text-xs t3">{b.mode}</td>
                      <td className="text-xs font-semibold">{b.counsellor}</td>
                      <td>
                        <span className="badge badge-emerald text-[10px] font-bold">{b.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: FOLLOW-UPS */}
        {activeTab === 'followups' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b bd sf2">
              <h3 className="font-bold text-sm">Multi-Channel Follow-up Cadence</h3>
              <p className="text-xs t3">Automated WhatsApp and SMS nudges sent to leads</p>
            </div>
            <div className="overflow-x-auto">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>JOB ID</th>
                    <th>STUDENT</th>
                    <th>SCHEDULED</th>
                    <th>STAGE</th>
                    <th>CHANNEL</th>
                    <th>TEMPLATE / PURPOSE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {FOLLOWUPS_DATA.map((f) => (
                    <tr key={f.id}>
                      <td className="font-mono text-xs t3">{f.id}</td>
                      <td className="font-bold text-xs">{f.leadName}</td>
                      <td className="font-mono text-xs">{f.at}</td>
                      <td className="text-xs">{f.stage}</td>
                      <td className="font-bold text-xs text-teal-600">{f.ch}</td>
                      <td className="text-xs t3 max-w-sm truncate">{f.tpl}</td>
                      <td>
                        <span className="badge badge-blue text-[10px]">{f.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: 100-PT SCORING RULES */}
        {activeTab === 'scoring' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5 space-y-3.5">
              <h3 className="font-bold text-sm">100-Point Dynamic Scoring Signals</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bd t3 font-bold">
                      <th className="py-2">Signal</th>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {Object.entries(SCORING_WEIGHTS).map(([k, s]) => (
                      <tr key={k}>
                        <td className="py-2 font-semibold">{s.l}</td>
                        <td className="py-2 t3">{s.g}</td>
                        <td className="py-2 font-mono font-bold text-teal-600 text-right">+{s.p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-5 space-y-4">
              <h3 className="font-bold text-sm">Priority Gates &amp; Direct Capture</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl sf3 border bd space-y-1">
                  <div className="t3 font-semibold">Hot Tier Gate</div>
                  <div className="text-xl font-extrabold text-red-500">Score ≥ 70</div>
                  <p className="text-[10px] t3">Assigned immediately for 15-min SLA call</p>
                </div>
                <div className="p-3.5 rounded-xl sf3 border bd space-y-1">
                  <div className="t3 font-semibold">Warm Tier Gate</div>
                  <div className="text-xl font-extrabold text-amber-500">Score 40–69</div>
                  <p className="text-[10px] t3">Nurtured via WhatsApp automated brochure</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 text-xs space-y-1 text-teal-950 dark:text-teal-200">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" /> Direct Capture Rule:
                </div>
                <p className="leading-relaxed text-[11px]">
                  Leads are saved directly upon sharing mobile number (No OTP barrier). Score is calculated automatically and assigned in round-robin to specialized branch counsellors.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE-OVER LEAD DETAIL INSPECT MODAL */}
        {selectedLead && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-[var(--surface-1)] text-[var(--text-1)] h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l bd animate-in slide-in-from-right duration-200">
              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between border-b bd pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold t3">{selectedLead.id}</span>
                      <span className={`badge text-[10px] font-bold ${
                        selectedLead.tier === 'Hot' ? 'badge-danger' : selectedLead.tier === 'Warm' ? 'badge-amber' : 'badge-slate'
                      }`}>
                        {selectedLead.tier} Tier
                      </span>
                      {selectedLead.isReal && (
                        <span className="badge badge-emerald text-[10px]">REAL CHAT</span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold mt-1.5">{selectedLead.name}</h2>
                    <p className="text-xs t3 mt-0.5">{selectedLead.course} ({selectedLead.branch}) · {selectedLead.city}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="p-1.5 rounded-xl hover:bg-[var(--surface-3)] t3"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* AI Summary Card */}
                <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 text-xs space-y-1 text-teal-950 dark:text-teal-200">
                  <div className="font-bold flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                    <Sparkles className="w-3.5 h-3.5" /> AI Admission Context Summary:
                  </div>
                  <p className="leading-relaxed text-[11px]">{selectedLead.summary}</p>
                </div>

                {/* 100-Point Score Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold">100-Point Score Breakdown</h3>
                    <span className="font-mono font-bold text-sm text-teal-600 dark:text-teal-400">
                      {selectedLead.score} / 100
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {(selectedLead.breakdown || []).map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg sf3 border bd">
                        <span className="t2 font-medium">{b.l}</span>
                        <span className="font-mono font-bold text-teal-600 dark:text-teal-400">+{b.p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Facts */}
                <div className="p-4 rounded-xl sf3 border bd space-y-2.5 text-xs">
                  <h3 className="font-bold">Contact &amp; Assignment Facts</h3>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>Mobile: <strong className="font-mono">{selectedLead.phone || '—'}</strong></div>
                    <div>Email: <strong>{selectedLead.email || '—'}</strong></div>
                    <div>Channel: <strong>{selectedLead.channel}</strong></div>
                    <div>Status: <strong>{selectedLead.status}</strong></div>
                    <div>Branch: <strong>{selectedLead.branch}</strong></div>
                    <div>Counsellor: <strong className="text-teal-600">{selectedLead.counsellorName || 'Neha Mathur'}</strong></div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Contact Buttons */}
              <div className="p-4 border-t bd sf2 flex items-center gap-2.5">
                <a
                  href={`https://wa.me/91${(selectedLead.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${selectedLead.name}, thank you for contacting Poornima University Admissions.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm flex-1 !py-2.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp Student
                </a>
                <a
                  href={`tel:${selectedLead.phone}`}
                  className="btn btn-secondary btn-sm flex-1 !py-2.5"
                >
                  <PhoneCall className="w-3.5 h-3.5 mr-1" /> Call Counsellor
                </a>
              </div>
            </div>
          </div>
        )}

        {/* DIRECT QUICK LEAD CAPTURE MODAL */}
        {isDirectLeadModalOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-[var(--surface-1)] text-[var(--text-1)] rounded-2xl shadow-2xl border bd p-5 space-y-4">
              <div className="flex items-center justify-between border-b bd pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Direct Quick Lead Capture</h3>
                    <p className="text-[10px] t3">No OTP required · Auto score &amp; assignment</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDirectLeadModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-[var(--surface-3)] t3"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleDirectLeadSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Student Full Name</label>
                  <input
                    type="text"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    placeholder="e.g. Aman Sharma"
                    className="input w-full !text-xs !py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Mobile Number (10 Digits) *</label>
                  <input
                    type="tel"
                    required
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    placeholder="e.g. 9829011001"
                    className="input w-full !text-xs !py-2 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">Course</label>
                    <select
                      value={directCourse}
                      onChange={(e) => setDirectCourse(e.target.value)}
                      className="select w-full !text-xs !py-2"
                    >
                      <option value="B.Tech">B.Tech</option>
                      <option value="BCA">BCA</option>
                      <option value="BBA">BBA</option>
                      <option value="MBA">MBA</option>
                      <option value="B.Des">B.Des</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Branch</label>
                    <select
                      value={directBranch}
                      onChange={(e) => setDirectBranch(e.target.value)}
                      className="select w-full !text-xs !py-2"
                    >
                      <option value="Computer Science (CSE)">CSE</option>
                      <option value="Civil Engineering">Civil</option>
                      <option value="Electronics Engineering (ECE)">ECE</option>
                      <option value="Mechanical Engineering">Mechanical</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">City</label>
                    <input
                      type="text"
                      value={directCity}
                      onChange={(e) => setDirectCity(e.target.value)}
                      className="input w-full !text-xs !py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Academic Marks</label>
                    <input
                      type="text"
                      value={directAcademic}
                      onChange={(e) => setDirectAcademic(e.target.value)}
                      className="input w-full !text-xs !py-2"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDirectLeadModalOpen(false)}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDirect || !directPhone.trim()}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    {isSubmittingDirect ? 'Capturing…' : 'Save Lead Directly'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
