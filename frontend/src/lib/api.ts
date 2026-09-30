import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface CrawlJob {
  id: string;
  agent_id: string;
  status: string;
  pages_discovered: number;
  pages_processed: number;
  pages_indexed: number;
  pages_failed: number;
  pages_skipped: number;
  current_page_url?: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface Entity {
  id: string;
  entity_type: string;
  entity_name: string;
  attributes: Record<string, any>;
  source_url: string;
  source_type?: 'REAL_WEBSITE' | 'DEMO_DATA' | 'DEMO_DOCUMENT';
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  website_url: string;
  scope: 'current_page' | 'subpath' | 'entire_website';
  status: 'QUEUED' | 'CRAWLING' | 'PROCESSING' | 'INDEXING' | 'COMPLETED' | 'FAILED';
  primary_color: string;
  welcome_message: string;
  detected_sector: string;
  sector_confidence: number;
  sector_reason: string;
  created_at: string;
  last_crawled_at?: string;
  indexed_pages_count: number;
  structured_entities_count: number;
  total_chunks_count: number;
  active_job?: CrawlJob;
}

export interface Page {
  id: string;
  url: string;
  title: string;
  char_count: number;
  http_status: number;
  source_type?: 'REAL_WEBSITE' | 'DEMO_DATA' | 'DEMO_DOCUMENT';
  crawled_at: string;
}

export interface PageDetail extends Page {
  description: string;
  content_text: string;
  entities: Entity[];
}

export interface Citation {
  url: string;
  title: string;
  snippet: string;
  source_type?: 'REAL_WEBSITE' | 'DEMO_DATA' | 'DEMO_DOCUMENT';
}

export interface DebugTraceItem {
  chunk_id: string;
  title: string;
  url: string;
  score: number;
  source_type?: string;
  matched_entity?: string;
  snippet: string;
}

export interface DebugTrace {
  detected_intent: string;
  detected_entity_type?: string;
  detected_entity?: string;
  applied_filters: Record<string, any>;
  matched_structured_entities: string[];
  retrieved_sources: string[];
  reranked_chunks: DebugTraceItem[];
}

export interface LeadScore {
  score: number;
  status: 'HOT' | 'WARM' | 'COLD';
  factors: string[];
  is_demo: boolean;
}

export interface EnrollmentPrediction {
  likelihood_percent: number;
  factors: string[];
  confidence: string;
  is_demo: boolean;
}

export interface BookingSlot {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'counselor_call' | 'campus_tour' | 'callback';
  is_available: boolean;
}

export interface BookingRequest {
  slot_id: string;
  name: string;
  email: string;
  phone: string;
  course_interest?: string;
}

export interface BookingResponse {
  booking_id: string;
  status: string;
  message: string;
  slot: BookingSlot;
  is_demo: boolean;
}

export interface AdmissionLead {
  id: string;
  agent_id: string;
  student_name: string;
  mobile_number: string;
  father_name?: string;
  percentage?: number;
  annual_income?: string;
  course_name?: string;
  preferred_department?: string;
  email?: string;
  city?: string;
  state?: string;
  entrance_exam?: string;
  entrance_score?: string;
  admission_year?: string;
  hostel_required?: string;
  lead_score: number;
  lead_temperature: 'HOT' | 'WARM' | 'COLD';
  academic_qualification: 'ELIGIBLE' | 'NEEDS_REVIEW' | 'INELIGIBLE';
  qualification_status?: string;
  lead_factors?: string[];
  source: 'REAL_CHAT' | 'DEMO_DATA';
  created_at: string;
  updated_at?: string;
}

export interface CallbackRequest {
  id: string;
  lead_id?: string;
  agent_id: string;
  student_name: string;
  mobile_number: string;
  course?: string;
  preferred_time: string;
  status: string;
  created_at: string;
}

export interface LeadsSummaryResponse {
  total_leads: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  real_leads_count: number;
  demo_leads_count: number;
  high_income_leads: number;
  leads: AdmissionLead[];
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  debug_trace?: DebugTrace;
  lead_score?: LeadScore;
  enrollment_prediction?: EnrollmentPrediction;
  admission_lead?: AdmissionLead;
  apply_url?: string;
  management_quota_url?: string;
  suggested_actions?: string[];
  booking_slots?: BookingSlot[];
}

export interface HardcodedFAQ {
  id: string;
  bot_id: string;
  intent: string;
  category: string;
  questions: string[];
  answer: string;
  source_urls: string[];
  cta_label?: string;
  cta_url?: string;
  priority: number;
  answer_available: boolean;
  created_at: string;
}

export interface HardcodedBot {
  id: string;
  agent_id?: string;
  name: string;
  website_url: string;
  sector: string;
  status: 'QUEUED' | 'CRAWLING' | 'GENERATING' | 'READY' | 'UPDATE_REQUIRED' | 'FAILED';
  version: number;
  ttl_days: number;
  welcome_message: string;
  primary_color: string;
  error_message?: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  last_generated_at?: string;
  is_expired: boolean;
  faqs_count: number;
  visitors_count: number;
}

export interface HardcodedVisitor {
  id: string;
  bot_id: string;
  email: string;
  mobile: string;
  student_name?: string;
  father_name?: string;
  percentage?: number;
  annual_income?: string;
  course?: string;
  admission_year?: string;
  source_url?: string;
  created_at: string;
}

export interface HardcodedChatResponse {
  session_id: string;
  bot_id: string;
  step: 'ask_email' | 'ask_mobile' | 'active';
  answer: string;
  matched_intent?: string;
  matched_faq_id?: string;
  citations: Citation[];
  cta?: { label: string; url: string };
  suggested_actions?: string[];
  fallback_triggered: boolean;
  show_ask_ai: boolean;
  show_request_callback: boolean;
  visitor?: HardcodedVisitor;
}

export const api = {
  listAgents: async (): Promise<Agent[]> => {
    const res = await axios.get(`${API_BASE}/agents`);
    return res.data;
  },

  createAgent: async (url: string, scope: string = 'entire_website', name?: string): Promise<Agent> => {
    const res = await axios.post(`${API_BASE}/agents`, { url, scope, name });
    return res.data;
  },

  getAgent: async (id: string): Promise<Agent> => {
    const res = await axios.get(`${API_BASE}/agents/${id}`);
    return res.data;
  },

  updateAgent: async (id: string, data: { name?: string; primary_color?: string; welcome_message?: string }): Promise<Agent> => {
    const res = await axios.patch(`${API_BASE}/agents/${id}`, data);
    return res.data;
  },

  recrawlAgent: async (id: string): Promise<CrawlJob> => {
    const res = await axios.post(`${API_BASE}/agents/${id}/recrawl`);
    return res.data;
  },

  getAgentPages: async (id: string): Promise<Page[]> => {
    const res = await axios.get(`${API_BASE}/agents/${id}/pages`);
    return res.data;
  },

  getPageDetail: async (agentId: string, pageId: string): Promise<PageDetail> => {
    const res = await axios.get(`${API_BASE}/agents/${agentId}/pages/${pageId}`);
    return res.data;
  },

  getAgentEntities: async (agentId: string): Promise<Entity[]> => {
    const res = await axios.get(`${API_BASE}/agents/${agentId}/entities`);
    return res.data;
  },

  chatWithAgent: async (
    id: string,
    message: string,
    history: { role: string; content: string }[] = [],
    mode: 'student' | 'teacher' = 'student',
    debug: boolean = false
  ): Promise<ChatResponse> => {
    const res = await axios.post(`${API_BASE}/agents/${id}/chat`, { message, history, mode, debug });
    return res.data;
  },

  getAgentLeads: async (
    agentId: string,
    source?: string,
    temperature?: string,
    search?: string
  ): Promise<LeadsSummaryResponse> => {
    const params = new URLSearchParams();
    if (source && source !== 'ALL') params.append('source', source);
    if (temperature && temperature !== 'ALL') params.append('temperature', temperature);
    if (search) params.append('search', search);
    const res = await axios.get(`${API_BASE}/agents/${agentId}/leads?${params.toString()}`);
    return res.data;
  },

  getLeadDetail: async (agentId: string, leadId: string): Promise<AdmissionLead> => {
    const res = await axios.get(`${API_BASE}/agents/${agentId}/leads/${leadId}`);
    return res.data;
  },

  requestCallback: async (
    agentId: string,
    data: { student_name: string; mobile_number: string; course?: string; preferred_time?: string; lead_id?: string }
  ): Promise<CallbackRequest> => {
    const res = await axios.post(`${API_BASE}/agents/${agentId}/callback`, data);
    return res.data;
  },

  bookSlot: async (agentId: string, data: BookingRequest): Promise<BookingResponse> => {
    const res = await axios.post(`${API_BASE}/agents/${agentId}/booking`, data);
    return res.data;
  },

  // --- Hardcoded Predefined Bot Methods ---
  createHardcodedBot: async (url: string, name?: string, sector?: string, ttl_days: number = 7): Promise<HardcodedBot> => {
    const res = await axios.post(`${API_BASE}/hardcoded-bots`, { url, name, sector, ttl_days });
    return res.data;
  },

  listHardcodedBots: async (): Promise<HardcodedBot[]> => {
    const res = await axios.get(`${API_BASE}/hardcoded-bots`);
    return res.data;
  },

  getHardcodedBot: async (id: string): Promise<HardcodedBot> => {
    const res = await axios.get(`${API_BASE}/hardcoded-bots/${id}`);
    return res.data;
  },

  getHardcodedBotFaqs: async (id: string, search?: string, category?: string): Promise<HardcodedFAQ[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    const res = await axios.get(`${API_BASE}/hardcoded-bots/${id}/faqs?${params.toString()}`);
    return res.data;
  },

  regenerateHardcodedBot: async (id: string): Promise<HardcodedBot> => {
    const res = await axios.post(`${API_BASE}/hardcoded-bots/${id}/regenerate`);
    return res.data;
  },

  chatWithHardcodedBot: async (
    id: string,
    message: string,
    sessionId?: string,
    extraData?: { email?: string; mobile?: string; student_name?: string; course?: string; percentage?: number }
  ): Promise<HardcodedChatResponse> => {
    const res = await axios.post(`${API_BASE}/hardcoded-bots/${id}/chat`, {
      session_id: sessionId,
      message,
      ...extraData
    });
    return res.data;
  },

  getHardcodedBotVisitors: async (id: string): Promise<HardcodedVisitor[]> => {
    const res = await axios.get(`${API_BASE}/hardcoded-bots/${id}/visitors`);
    return res.data;
  },

  // --- Product Scraper API Methods ---
  startScrapeJob: async (url: string, max_products: number = 100): Promise<ScrapeJob> => {
    const res = await axios.post(`${API_BASE}/scraper/jobs`, {
      url,
      max_products
    });
    return res.data;
  },

  listScrapeJobs: async (): Promise<ScrapeJob[]> => {
    const res = await axios.get(`${API_BASE}/scraper/jobs`);
    return res.data;
  },

  getScrapeJob: async (jobId: string): Promise<ScrapeJob> => {
    const res = await axios.get(`${API_BASE}/scraper/jobs/${jobId}`);
    return res.data;
  },

  deleteScrapeJob: async (jobId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/scraper/jobs/${jobId}`);
  },

  getJobProducts: async (
    jobId: string,
    params?: {
      search?: string;
      brand?: string;
      category?: string;
      availability?: string;
      min_price?: number;
      max_price?: number;
      sort_by?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedProductsResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.brand) query.append('brand', params.brand);
    if (params?.category) query.append('category', params.category);
    if (params?.availability) query.append('availability', params.availability);
    if (params?.min_price !== undefined && params?.min_price !== null) query.append('min_price', params.min_price.toString());
    if (params?.max_price !== undefined && params?.max_price !== null) query.append('max_price', params.max_price.toString());
    if (params?.sort_by) query.append('sort_by', params.sort_by);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const qs = query.toString();
    const url = `${API_BASE}/scraper/jobs/${jobId}/products${qs ? `?${qs}` : ''}`;
    const res = await axios.get(url);
    return res.data;
  },

  getExportCsvUrl: (jobId: string): string => {
    return `${API_BASE}/scraper/jobs/${jobId}/export/csv`;
  },

  getExportExcelUrl: (jobId: string): string => {
    return `${API_BASE}/scraper/jobs/${jobId}/export/excel`;
  },

  // --- College Live Web Search API Methods ---
  chatWebSearch: async (
    message: string,
    history: { role: string; content: string }[] = [],
    includeDebug: boolean = true
  ): Promise<WebSearchChatResponse> => {
    const res = await axios.post(`${API_BASE}/web-search/chat`, {
      message,
      history,
      include_debug: includeDebug
    });
    return res.data;
  },

  getWebSearchConfig: async (): Promise<WebSearchConfig> => {
    const res = await axios.get(`${API_BASE}/web-search/config`);
    return res.data;
  },

  updateWebSearchConfig: async (data: Partial<WebSearchConfig>): Promise<WebSearchConfig> => {
    const res = await axios.put(`${API_BASE}/web-search/config`, data);
    return res.data;
  },

  getWebSearchSources: async (category?: string, search?: string): Promise<WebSearchSource[]> => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search) params.append('search', search);
    const res = await axios.get(`${API_BASE}/web-search/sources?${params.toString()}`);
    return res.data;
  },

  addWebSearchSource: async (data: { url: string; title?: string; category?: string }): Promise<WebSearchSource> => {
    const res = await axios.post(`${API_BASE}/web-search/sources`, data);
    return res.data;
  },

  updateWebSearchSource: async (id: string, data: { title?: string; category?: string; is_enabled?: boolean }): Promise<WebSearchSource> => {
    const res = await axios.put(`${API_BASE}/web-search/sources/${id}`, data);
    return res.data;
  },

  deleteWebSearchSource: async (id: string): Promise<{ message: string; id: string }> => {
    const res = await axios.delete(`${API_BASE}/web-search/sources/${id}`);
    return res.data;
  },

  testWebSearch: async (query: string, maxSources: number = 3): Promise<WebSearchTestResult> => {
    const res = await axios.post(`${API_BASE}/web-search/test`, {
      query,
      max_sources: maxSources
    });
    return res.data;
  },

  // --- Generic Sitemap-Based Multi-College Methods ---
  createCollegeProject: async (
    collegeName: string,
    sitemapUrl: string,
    maxSources: number = 3,
    instituteType: string = 'college'
  ): Promise<CollegeWebSearchProject> => {
    const res = await axios.post(`${API_BASE}/web-search/projects`, {
      college_name: collegeName,
      sitemap_url: sitemapUrl,
      max_sources_per_query: maxSources,
      institute_type: instituteType
    });
    return res.data;
  },

  listCollegeProjects: async (): Promise<CollegeWebSearchProject[]> => {
    const res = await axios.get(`${API_BASE}/web-search/projects`);
    return res.data;
  },

  getCollegeProject: async (projectId: string): Promise<CollegeWebSearchProject> => {
    const res = await axios.get(`${API_BASE}/web-search/projects/${projectId}`);
    return res.data;
  },

  rebuildCollegeProjectSources: async (projectId: string): Promise<RebuildSourcesResult> => {
    const res = await axios.post(`${API_BASE}/web-search/projects/${projectId}/rebuild`);
    return res.data;
  },

  getCollegeProjectSources: async (
    projectId: string,
    category?: string,
    search?: string,
    sourceType?: string
  ): Promise<CollegeWebSource[]> => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search) params.append('search', search);
    if (sourceType && sourceType !== 'All') params.append('source_type', sourceType);
    const res = await axios.get(`${API_BASE}/web-search/projects/${projectId}/sources?${params.toString()}`);
    return res.data;
  },

  updateCollegeProjectSource: async (
    projectId: string,
    sourceId: string,
    data: { title?: string; category?: string; is_enabled?: boolean }
  ): Promise<CollegeWebSource> => {
    const res = await axios.put(`${API_BASE}/web-search/projects/${projectId}/sources/${sourceId}`, data);
    return res.data;
  },

  deleteCollegeProjectSource: async (projectId: string, sourceId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/web-search/projects/${projectId}/sources/${sourceId}`);
  },

  chatCollegeProject: async (
    projectId: string,
    message: string,
    history: { role: string; content: string }[] = [],
    includeDebug: boolean = true
  ): Promise<CollegeChatResponse> => {
    const res = await axios.post(`${API_BASE}/web-search/projects/${projectId}/chat`, {
      project_id: projectId,
      message,
      history,
      include_debug: includeDebug
    });
    return res.data;
  },

  testCollegeProjectSearch: async (
    projectId: string,
    query: string,
    maxSources: number = 3
  ): Promise<WebSearchTestResult> => {
    const res = await axios.post(`${API_BASE}/web-search/projects/${projectId}/test`, {
      query,
      max_sources: maxSources
    });
    return res.data;
  },

  // --- College Voice Web Search API Methods ---
  createVoiceSession: async (projectId: string = 'proj_poornima', voice: string = 'alloy', language: string = 'en-IN'): Promise<VoiceSessionResponse> => {
    const res = await axios.post(`${API_BASE}/college-voice/session`, {
      project_id: projectId,
      voice,
      language
    });
    return res.data;
  },

  executeVoiceSearchTool: async (projectId: string = 'proj_poornima', query: string, maxSources: number = 3, language: string = 'en-IN'): Promise<VoiceSearchToolResponse> => {
    const res = await axios.post(`${API_BASE}/college-voice/search-tool`, {
      project_id: projectId,
      query,
      max_sources: maxSources,
      language
    });
    return res.data;
  }
};

// --- College Voice Web Search Interfaces ---
export interface VoiceSessionResponse {
  client_secret: {
    value: string;
    expires_at?: number;
  };
  session_id: string;
  project_id: string;
  college_name: string;
  base_domain: string;
  model: string;
  voice: string;
  language: string;
}

export interface VoiceSourceItem {
  title: string;
  url: string;
  score?: number;
  category?: string;
}

export interface VoiceSearchToolResponse {
  query: string;
  college_name: string;
  detected_intent: string;
  sources_used_count: number;
  sources: VoiceSourceItem[];
  context: string;
  summary_for_voice: string;
  detailed_answer: string;
}

// --- Generic Multi-College Project Interfaces ---
export interface CollegeWebSearchProject {
  id: string;
  college_name: string;
  sitemap_url: string;
  base_domain: string;
  institute_type?: string;
  status: 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED';
  progress_message?: string;
  total_urls: number;
  active_urls: number;
  max_sources_per_query: number;
  cache_ttl_seconds: number;
  created_at: string;
  updated_at?: string;
}

export interface CollegeWebSource {
  id: string;
  project_id: string;
  url: string;
  title: string;
  category: string;
  source_type: 'HTML' | 'PDF';
  is_enabled: boolean;
  content_snippet?: string;
  last_fetched_at?: string;
  discovered_at: string;
}

export interface RebuildSourcesResult {
  project_id: string;
  status: string;
  message: string;
  total_urls: number;
  added_count: number;
  removed_count: number;
  active_urls: number;
}

export interface CollegeChatResponse {
  project_id: string;
  college_name: string;
  answer: string;
  sources_used_count: number;
  sources: Citation[];
  is_live_searched: boolean;
  detected_intent: string;
  debug_trace?: WebSearchDebugTrace;
}

// --- College Live Web Search Interfaces ---
export interface WebSearchSource {
  id: string;
  url: string;
  title: string;
  category: string;
  is_enabled: boolean;
  content_snippet?: string;
  last_fetched_at?: string;
  created_at: string;
}

export interface WebSearchConfig {
  id: string;
  college_name: string;
  primary_domain: string;
  max_sources_per_query: number;
  status: 'ACTIVE' | 'INACTIVE';
  cache_ttl_seconds: number;
  total_sources_count: number;
  active_sources_count: number;
  updated_at: string;
}

export interface WebSearchDebugTrace {
  user_query: string;
  detected_intent: string;
  optimized_search_query: string;
  sources_returned: Array<{ id?: string; url: string; title?: string; score?: number; category?: string }>;
  selected_sources: Array<{ url: string; title?: string; score?: number; status?: string }>;
  ai_link_selection_reason?: string;
  cache_hit: boolean;
  processing_time_ms: number;
}

export interface WebSearchChatResponse {
  answer: string;
  sources_used_count: number;
  sources: Citation[];
  is_live_searched: boolean;
  detected_intent: string;
  debug_trace?: WebSearchDebugTrace;
}

export interface WebSearchTestResult {
  query: string;
  detected_intent: string;
  optimized_search_query: string;
  candidate_sources: Array<{ id?: string; url: string; title?: string; score?: number; category?: string }>;
  selected_sources: Array<{ url: string; title?: string; score?: number; fetch_status?: string }>;
}



// --- Product Scraper Interfaces ---
export interface ScrapedProduct {
  id: string;
  scrape_job_id: string;
  source_url: string;
  product_url: string;
  product_name: string;
  brand?: string;
  selling_price?: number;
  mrp?: number;
  discount?: string;
  pack_size?: string;
  availability: string;
  image_url?: string;
  description?: string;
  category?: string;
  city?: string;
  location_context?: string;
  scraped_at: string;
}

export interface ScrapeJob {
  id: string;
  source_url: string;
  website: string;
  status: 'QUEUED' | 'SCRAPING' | 'FETCHING' | 'EXTRACTING' | 'SAVING' | 'COMPLETED' | 'FAILED';
  progress_message?: string;
  total_found: number;
  total_saved: number;
  total_failed: number;
  duplicates_removed: number;
  city?: string;
  location_context?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export interface PaginatedProductsResponse {
  items: ScrapedProduct[];
  total: number;
  page: number;
  pages: number;
  brands: string[];
  categories: string[];
}



