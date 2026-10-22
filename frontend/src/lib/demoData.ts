// Grounded demo dataset and local state handlers matching index_reference.html 1:1

export interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}

export interface SolutionItem {
  key: string;
  icon: string;
  title: string;
  sub: string;
  points: string[];
}

export interface BenefitItem {
  icon: string;
  title: string;
  desc: string;
}

export const FEATURES: FeatureItem[] = [
  { icon: 'Globe', title: 'Website-to-Chatbot Creation', desc: 'Paste your URL or sitemap and get a working assistant — no manual uploads, no code.' },
  { icon: 'Brain', title: 'AI Knowledge Assistant', desc: 'Finds relevant answers from your website content and explains them in natural language.' },
  { icon: 'Search', title: 'Live Search with Sources', desc: 'Answers stay grounded in your live pages, with clickable citations visitors can verify.' },
  { icon: 'Mic', title: 'Real-Time Voice Assistant', desc: 'Visitors speak naturally and hear spoken answers — with language options for your audience.' },
  { icon: 'Users', title: 'Lead Generation & Management', desc: 'Capture names, emails and phones in conversation, then track them in a built-in dashboard.' },
  { icon: 'LayoutTemplate', title: 'Sector-Specific Templates', desc: 'Start from templates tailored to education, healthcare, SaaS, manufacturing and business.' },
  { icon: 'LifeBuoy', title: 'Automated Customer Support', desc: 'Handle common questions instantly, around the clock, and route complex queries to your team.' },
  { icon: 'Activity', title: 'Analytics & Monitoring', desc: 'See what visitors ask, which pages get cited, and where your leads come from.' }
];

export const SOLUTIONS: SolutionItem[] = [
  {
    key: 'college',
    icon: 'GraduationCap',
    title: 'Education',
    sub: 'Colleges, universities & institutes',
    points: [
      'Admissions, fees & eligibility questions',
      'Branch and course comparisons',
      'Hostel, exams & campus information'
    ]
  },
  {
    key: 'hospital',
    icon: 'Stethoscope',
    title: 'Healthcare',
    sub: 'Hospitals & clinics',
    points: [
      'Departments, doctors & timings',
      'Appointment and visitor guidance',
      'Insurance and billing FAQs'
    ]
  },
  {
    key: 'saas',
    icon: 'Monitor',
    title: 'SaaS & Software',
    sub: 'Product & dev-tool companies',
    points: [
      'Product and pricing questions',
      'Onboarding and troubleshooting docs',
      'Feature discovery for prospects'
    ]
  },
  {
    key: 'manufacturing',
    icon: 'Factory',
    title: 'Manufacturing',
    sub: 'Industrial & B2B companies',
    points: [
      'Product specs & catalog queries',
      'Distributor and dealer information',
      'Compliance and documentation FAQs'
    ]
  },
  {
    key: 'general',
    icon: 'Building2',
    title: 'General Business',
    sub: 'Any website, any industry',
    points: [
      'Company and services overview',
      'Contact and location questions',
      'Custom knowledge from any sitemap'
    ]
  }
];

export const BENEFITS: BenefitItem[] = [
  { icon: 'Zap', title: 'Faster responses', desc: 'Visitors get answers immediately instead of waiting on email or office hours — the assistant works 24/7.' },
  { icon: 'Target', title: 'Better lead capture', desc: 'Conversations feel natural, so visitors are more willing to share details that flow into your lead dashboard.' },
  { icon: 'Search', title: 'Easier knowledge discovery', desc: 'Deep-linked pages and long sitemaps become simple answers, with sources.' },
  { icon: 'Headphones', title: 'Automated support', desc: 'Repetitive questions are answered automatically, freeing your team for conversations that need a human.' }
];

export interface DemoQA {
  q: string;
  keys: string[];
  a: string;
  sources: string[] | null;
}

export const DEMO_QA: DemoQA[] = [
  {
    q: 'What can OmniAgent do?',
    keys: ['what', 'omniagent', 'can', 'do', 'your product', 'platform', 'who are'],
    a: `OmniAgent turns your existing website into an AI assistant that can:\n\n- **Answer questions** from your live pages, with clickable sources\n- **Capture leads** — names, emails and phone numbers, in conversation\n- **Speak with visitors** using a real-time voice assistant\n- **Work around the clock** so common questions never wait for office hours\n\nYou create it in three steps: add your website URL, let OmniAgent read your pages, then launch.`,
    sources: ['omniagent-ai.example/docs']
  },
  {
    q: 'How do I create an assistant?',
    keys: ['how', 'create', 'build', 'start', 'setup', 'set up', 'make', 'assistant'],
    a: `Creating an assistant takes three steps:\n\n1. **Add your website** — paste your homepage or sitemap URL\n2. **We read your pages** — OmniAgent discovers your content and prepares answers\n3. **Launch** — configure, test and deploy\n\nTry it now: click **Get started** at the top of this page.`,
    sources: null
  },
  {
    q: 'Can it capture leads for my team?',
    keys: ['lead', 'capture', 'sales', 'crm', 'contact', 'email', 'phone'],
    a: `Yes. The assistant can ask for a visitor's name, email and phone during the conversation, then:\n\n- Score the lead based on what was captured\n- Track its status from **New → Contacted → Qualified → Converted**\n- Export everything to CSV for your CRM\n\nOpen the **Lead Engine** inside the product to see the dashboard.`,
    sources: ['omniagent-ai.example/leads']
  }
];

export const DEMO_FALLBACK = {
  a: `In this **simulated demo** I only answer a few example questions — try the suggestion chips below.\n\nIn the full product, I would search your website in real time and answer with clickable sources.`,
  sources: null
};

export function matchDemo(text: string): { a: string; sources: string[] | null } {
  const t = text.toLowerCase();
  let best: DemoQA | null = null;
  let score = 0;
  DEMO_QA.forEach(item => {
    const s = item.keys.filter(k => t.includes(k)).length;
    if (s > score) {
      score = s;
      best = item;
    }
  });
  return score > 0 && best ? best : DEMO_FALLBACK;
}

// Voice Mode Definitions & Answers
export const VOICE_MODE_DESCRIPTIONS = {
  crowd_filter: 'Proximity gate + calibrated VAD: background crowd murmurs are silenced.',
  push_to_talk: 'Hold the orb to talk — release to send. Best for noisy environments.',
  hands_free: 'Continuous listening with automatic endpointing. Best for quiet rooms.'
};

export const VOICE_ANSWERS = [
  {
    keys: ['fee', 'b.tech', 'cse', 'payment'],
    a: `**B.Tech CSE** fee breakdown (example data):\n\n| Component | Per year |\n|---|---|\n| Tuition | ₹96,000 |\n| Development | ₹12,000 |\n| Exam | ₹3,500 |\n| **Total** | **₹1,11,500** |\n\n> Simulated example answer — connect the backend for live, grounded results.`
  },
  {
    keys: ['hostel', 'mess', 'room', 'ac'],
    a: `Hostel options (example data):\n\n| Room | Fee per year |\n|---|---|\n| Non-AC twin | ₹68,000 |\n| AC twin | ₹92,000 |\n| Mess (optional) | ₹42,000 |`
  },
  {
    keys: ['reap', 'cutoff', 'eligibility', 'pcm'],
    a: `REAP guidance (example data):\n\n- **REAP code:** 1023\n- Eligibility: 12th with Physics, Chemistry, Mathematics\n- Cutoffs vary by branch and year — official numbers are published each counselling round`
  }
];

export function matchVoiceAnswer(q: string, domain: string = 'poornima.org') {
  const t = q.toLowerCase();
  let best: (typeof VOICE_ANSWERS)[0] | null = null;
  let score = 0;
  VOICE_ANSWERS.forEach(a => {
    const s = a.keys.filter(k => t.includes(k)).length;
    if (s > score) {
      score = s;
      best = a;
    }
  });
  return best || {
    a: `I would search **${domain}** for that and answer with sources. This simulated demo only covers the sample questions.`
  };
}

// Web Search Projects
export interface WebProject {
  key: string;
  name: string;
  domain: string;
  url: string;
  desc: string;
  urls: string[];
  samples: Array<{ q: string; keys: string[]; a: string }>;
}

export const INITIAL_PROJECTS: Record<string, WebProject> = {
  poornima: {
    key: 'poornima',
    name: 'Poornima University',
    domain: 'poornima.org',
    url: 'https://www.poornima.org/sitemap.xml',
    desc: "The assistant selects the most relevant pages from the website's sitemap, searches live, and returns grounded answers with clickable sources.",
    urls: [
      'https://www.poornima.org/',
      'https://www.poornima.org/admissions',
      'https://www.poornima.org/btech-cse',
      'https://www.poornima.org/fees',
      'https://www.poornima.org/hostel-life',
      'https://www.poornima.org/placements',
      'https://www.poornima.org/scholarships',
      'https://www.poornima.org/contact'
    ],
    samples: [
      {
        q: 'B.Tech CSE fee structure?',
        keys: ['fee', 'btech', 'cse', 'payment', 'cost'],
        a: `**B.Tech (CSE)** fee structure (example data):\n\n| Component | Per year |\n|---|---|\n| Tuition | ₹96,000 |\n| Development | ₹12,000 |\n| Exam | ₹3,500 |\n| **Total** | **₹1,11,500** |`
      },
      {
        q: 'Hostel and mess charges?',
        keys: ['hostel', 'mess', 'room', 'stay'],
        a: `Hostel options (example data):\n\n| Room | Per year |\n|---|---|\n| Non-AC twin | ₹68,000 |\n| AC twin | ₹92,000 |\n| Mess (optional) | ₹42,000 |`
      }
    ]
  },
  allen: {
    key: 'allen',
    name: 'Allen Career Institute',
    domain: 'allen.in',
    url: 'https://www.allen.ac.in/',
    desc: 'The assistant searches allen.ac.in live and returns grounded answers with clickable sources.',
    urls: [
      'https://www.allen.ac.in/',
      'https://www.allen.ac.in/courses',
      'https://www.allen.ac.in/jee',
      'https://www.allen.ac.in/neet',
      'https://www.allen.ac.in/scholarships'
    ],
    samples: [
      {
        q: 'Classroom course fees for JEE?',
        keys: ['fee', 'jee', 'course', 'classroom', 'cost'],
        a: `**JEE classroom courses** (example data):\n\n| Course | Duration | Fee |\n|---|---|---|\n| Leader (XII + JEE) | 1 year | ₹1,20,000 |\n| Achiever (XI + JEE) | 2 years | ₹2,10,000 |`
      },
      {
        q: 'Scholarship criteria?',
        keys: ['scholarship', 'criteria', 'discount', 'asat'],
        a: `Scholarship guidance (example data):\n\n- **ASAT** performance-based scholarships\n- Board-exam merit scholarships\n- Sibling and defence-personnel concessions`
      }
    ]
  },
  xyz: {
    key: 'xyz',
    name: 'XYZ Group of Colleges',
    domain: 'xyzcollege.edu.in',
    url: 'https://www.xyzcollege.edu.in/',
    desc: 'The assistant searches xyzcollege.edu.in live and returns grounded answers with clickable sources.',
    urls: [
      'https://www.xyzcollege.edu.in/',
      'https://www.xyzcollege.edu.in/admissions',
      'https://www.xyzcollege.edu.in/btech',
      'https://www.xyzcollege.edu.in/hostel',
      'https://www.xyzcollege.edu.in/reap'
    ],
    samples: [
      {
        q: 'REAP code and cutoff?',
        keys: ['reap', 'code', 'cutoff', 'rank'],
        a: `**REAP 1023** guidance (example data):\n\n- Code: 1023\n- Cutoffs vary by branch and counselling round\n- Eligibility: 12th with PCM`
      },
      {
        q: 'B.Tech CSE vs IT — which to choose?',
        keys: ['cse', 'it', 'compare', 'branch', 'difference'],
        a: `CSE vs IT at XYZ (example data):\n\n| Aspect | CSE | IT |\n|---|---|---|\n| Focus | Core CS, algorithms | Networking, systems |\n| Fee/yr | ₹96,000 | ₹88,000 |\n| Seats | 120 | 60 |`
      }
    ]
  }
};

export function genericSamples(name: string, domain: string) {
  return [
    {
      q: 'What services do you offer?',
      keys: ['service', 'offer', 'about', 'what'],
      a: `I would search **${domain}** and summarize your services here with sources. (Simulated example — connect the backend for live answers.)`
    },
    {
      q: 'How can I contact you?',
      keys: ['contact', 'phone', 'email', 'call'],
      a: `Contact details would be pulled live from **${domain}** and shown here with a source link. (Simulated example.)`
    }
  ];
}

// XYZ College Q&A
export const XYZ_QA = [
  {
    keys: ['fee', 'btech', 'cse', 'cost', 'payment'],
    a: `**B.Tech CSE** fees at XYZ (example data):\n\n| Component | Per year |\n|---|---|\n| Tuition | ₹84,000 |\n| Development | ₹10,000 |\n| **Total** | **₹94,000** |\n\nREAP counselling applicable — code **1023**.`
  },
  {
    keys: ['hostel', 'mess', 'room', 'stay'],
    a: `Hostel & mess at XYZ (example data):\n\n| Facility | Per year |\n|---|---|\n| Non-AC twin | ₹58,000 |\n| AC twin | ₹82,000 |\n| Mess | ₹38,000 |`
  },
  {
    keys: ['reap', 'cutoff', 'eligibility', 'pcm', 'rank'],
    a: `**REAP 1023** guidance (example data):\n\n- Eligibility: 12th with Physics, Chemistry, Maths\n- Apply via REAP counselling using code 1023\n- Cutoffs vary by branch and round — check the latest counselling bulletin`
  },
  {
    keys: ['cse', 'it', 'compare', 'branch', 'difference', 'vs'],
    a: `CSE vs IT at XYZ (example data):\n\n| Aspect | CSE | IT |\n|---|---|---|\n| Focus | Core CS, algorithms | Networking, systems |\n| Fee/yr | ₹94,000 | ₹86,000 |\n| Seats | 120 | 60 |`
  }
];

export function scoreLead({ email, phone, program }: { email?: string; phone?: string; program?: string }) {
  let s = 50;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) s += 20;
  if (String(phone || '').replace(/\D/g, '').length >= 10) s += 20;
  if (program) s += 10;
  return Math.min(100, s);
}

// Lead Engine Models & Store
export interface LeadItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  score: number;
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted';
  program?: string;
  created: string;
}

export const SAMPLE_LEADS: Omit<LeadItem, 'id' | 'created'>[] = [
  { name: 'Rahul Sharma', email: 'rahul.s@example.com', phone: '+91 9811122334', source: 'XYZ College Assistant', score: 92, status: 'Qualified', program: 'B.Tech CSE' },
  { name: 'Priya Mehta', email: 'priya.m@example.com', phone: '+91 9822233445', source: 'Voice Assistant', score: 74, status: 'Contacted', program: 'B.Tech ECE' },
  { name: 'Aman Kumar', email: 'aman.k@example.com', phone: '+91 9833344556', source: 'Web Search', score: 58, status: 'New', program: 'BBA' },
  { name: 'Sneha Gupta', email: 'sneha.gupta@example.com', phone: '+91 9844455667', source: 'XYZ College Assistant', score: 88, status: 'Qualified', program: 'B.Tech IT' },
  { name: 'Vikram Joshi', email: 'vikram.j@example.com', phone: '+91 9855566778', source: 'Web Search', score: 45, status: 'New', program: '' }
];

export const WIZARD_SAVE_KEY = 'omniagent_wizard_config_v1';
export const LEADS_STORE_KEY = 'omniagent_leads_v1';

export function normalizeUrl(v: string) {
  let url = (v || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
  return url;
}

export function isValidUrl(v: string) {
  try {
    const u = new URL(normalizeUrl(v));
    return !!u.hostname && u.hostname.includes('.');
  } catch (e) {
    return false;
  }
}
