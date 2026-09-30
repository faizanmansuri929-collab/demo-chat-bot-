import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from pydantic import BaseModel, HttpUrl
from app.core.database import Base

# --- SQLAlchemy Database Models ---

class AgentDB(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    website_url = Column(String, nullable=False)
    scope = Column(String, default="entire_website")
    status = Column(String, default="QUEUED")
    primary_color = Column(String, default="#3B82F6")
    welcome_message = Column(String, default="Hello! How can I help you today with information from this website?")
    
    # Sector Intelligence fields
    detected_sector = Column(String, default="general")
    sector_confidence = Column(Float, default=0.75)
    sector_reason = Column(Text, default="")

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_crawled_at = Column(DateTime, nullable=True)

    pages = relationship("PageDB", back_populates="agent", cascade="all, delete-orphan")
    entities = relationship("EntityDB", back_populates="agent", cascade="all, delete-orphan")
    crawl_jobs = relationship("CrawlJobDB", back_populates="agent", cascade="all, delete-orphan")
    chat_logs = relationship("ChatLogDB", back_populates="agent", cascade="all, delete-orphan")
    admission_leads = relationship("AdmissionLeadDB", back_populates="agent", cascade="all, delete-orphan")
    callback_requests = relationship("CallbackRequestDB", back_populates="agent", cascade="all, delete-orphan")


class PageDB(Base):
    __tablename__ = "pages"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    url = Column(String, nullable=False, index=True)
    title = Column(String, default="")
    description = Column(Text, default="")
    content_text = Column(Text, default="")
    content_hash = Column(String, index=True)
    char_count = Column(Integer, default=0)
    http_status = Column(Integer, default=200)
    source_type = Column(String, default="REAL_WEBSITE") # REAL_WEBSITE, DEMO_DATA, DEMO_DOCUMENT
    crawled_at = Column(DateTime, default=datetime.datetime.utcnow)

    agent = relationship("AgentDB", back_populates="pages")
    entities = relationship("EntityDB", back_populates="page", cascade="all, delete-orphan")


class EntityDB(Base):
    __tablename__ = "entities"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    page_id = Column(String, ForeignKey("pages.id"), nullable=True)
    entity_type = Column(String, index=True) # course, doctor, pricing_plan, spec, contact, fee, scholarship, etc.
    entity_name = Column(String, index=True)
    attributes = Column(JSON, default=dict)  # Key-value JSON data
    source_url = Column(String, default="")
    source_type = Column(String, default="REAL_WEBSITE") # REAL_WEBSITE, DEMO_DATA
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    agent = relationship("AgentDB", back_populates="entities")
    page = relationship("PageDB", back_populates="entities")


class CrawlJobDB(Base):
    __tablename__ = "crawl_jobs"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    status = Column(String, default="QUEUED")
    pages_discovered = Column(Integer, default=0)
    pages_processed = Column(Integer, default=0)
    pages_indexed = Column(Integer, default=0)
    pages_failed = Column(Integer, default=0)
    pages_skipped = Column(Integer, default=0)
    current_page_url = Column(String, default="")
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    agent = relationship("AgentDB", back_populates="crawl_jobs")


class ChatLogDB(Base):
    __tablename__ = "chat_logs"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    user_message = Column(Text, nullable=False)
    bot_answer = Column(Text, nullable=False)
    citations = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    agent = relationship("AgentDB", back_populates="chat_logs")


class AdmissionLeadDB(Base):
    __tablename__ = "admission_leads"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    student_name = Column(String, nullable=False, default="Prospective Student")
    mobile_number = Column(String, nullable=False, default="")
    father_name = Column(String, nullable=True, default="")
    percentage = Column(Float, nullable=True)
    annual_income = Column(String, nullable=True, default="")
    course_name = Column(String, nullable=True, default="")
    preferred_department = Column(String, nullable=True, default="")
    email = Column(String, nullable=True, default="")
    city = Column(String, nullable=True, default="")
    state = Column(String, nullable=True, default="")
    entrance_exam = Column(String, nullable=True, default="")
    entrance_score = Column(String, nullable=True, default="")
    admission_year = Column(String, nullable=True, default="2026")
    hostel_required = Column(String, nullable=True, default="")
    
    lead_score = Column(Integer, default=50)
    lead_temperature = Column(String, default="WARM") # HOT, WARM, COLD
    academic_qualification = Column(String, default="NEEDS_REVIEW") # ELIGIBLE, NEEDS_REVIEW, INELIGIBLE
    qualification_status = Column(Text, default="")
    lead_factors = Column(JSON, default=list)
    
    source = Column(String, default="REAL_CHAT") # REAL_CHAT, DEMO_DATA
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    agent = relationship("AgentDB", back_populates="admission_leads")
    callback_requests = relationship("CallbackRequestDB", back_populates="lead", cascade="all, delete-orphan")


class CallbackRequestDB(Base):
    __tablename__ = "callback_requests"

    id = Column(String, primary_key=True, index=True)
    lead_id = Column(String, ForeignKey("admission_leads.id"), nullable=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    student_name = Column(String, nullable=False)
    mobile_number = Column(String, nullable=False)
    course = Column(String, nullable=True, default="")
    preferred_time = Column(String, default="Today - ASAP")
    status = Column(String, default="PENDING") # PENDING, CONFIRMED, COMPLETED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    agent = relationship("AgentDB", back_populates="callback_requests")
    lead = relationship("AdmissionLeadDB", back_populates="callback_requests")


# --- Hardcoded / Predefined Chatbot Database Models ---

class HardcodedBotDB(Base):
    __tablename__ = "hardcoded_bots"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=True) # Optional link to agent
    name = Column(String, nullable=False)
    website_url = Column(String, nullable=False)
    sector = Column(String, default="general")
    status = Column(String, default="QUEUED") # QUEUED, CRAWLING, GENERATING, READY, UPDATE_REQUIRED, FAILED
    version = Column(Integer, default=1)
    ttl_days = Column(Integer, default=7)
    welcome_message = Column(String, default="Hello! Welcome to our website assistant. How may I help you?")
    primary_color = Column(String, default="#3B82F6")
    
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    last_generated_at = Column(DateTime, nullable=True)

    faqs = relationship("HardcodedFAQDB", back_populates="bot", cascade="all, delete-orphan")
    visitors = relationship("ChatVisitorDB", back_populates="bot", cascade="all, delete-orphan")
    sessions = relationship("ChatSessionDB", back_populates="bot", cascade="all, delete-orphan")


class HardcodedFAQDB(Base):
    __tablename__ = "hardcoded_faqs"

    id = Column(String, primary_key=True, index=True)
    bot_id = Column(String, ForeignKey("hardcoded_bots.id"), nullable=False)
    intent = Column(String, index=True, nullable=False)
    category = Column(String, default="General", index=True)
    questions = Column(JSON, default=list) # List of question string variations
    answer = Column(Text, nullable=False)
    source_urls = Column(JSON, default=list) # List of URLs
    cta_label = Column(String, nullable=True)
    cta_url = Column(String, nullable=True)
    priority = Column(Integer, default=1)
    answer_available = Column(Integer, default=1) # 1=True, 0=False
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    bot = relationship("HardcodedBotDB", back_populates="faqs")


class ChatVisitorDB(Base):
    __tablename__ = "chat_visitors"

    id = Column(String, primary_key=True, index=True)
    bot_id = Column(String, ForeignKey("hardcoded_bots.id"), nullable=False)
    email = Column(String, nullable=False, index=True)
    mobile = Column(String, nullable=False, index=True)
    student_name = Column(String, nullable=True, default="")
    father_name = Column(String, nullable=True, default="")
    percentage = Column(Float, nullable=True)
    annual_income = Column(String, nullable=True, default="")
    course = Column(String, nullable=True, default="")
    admission_year = Column(String, nullable=True, default="2026")
    source_url = Column(String, nullable=True, default="")
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    bot = relationship("HardcodedBotDB", back_populates="visitors")
    sessions = relationship("ChatSessionDB", back_populates="visitor", cascade="all, delete-orphan")


class ChatSessionDB(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, index=True)
    bot_id = Column(String, ForeignKey("hardcoded_bots.id"), nullable=False)
    visitor_id = Column(String, ForeignKey("chat_visitors.id"), nullable=True)
    step = Column(String, default="ask_email") # ask_email, ask_mobile, active
    status = Column(String, default="ACTIVE") # ACTIVE, CLOSED
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    bot = relationship("HardcodedBotDB", back_populates="sessions")
    visitor = relationship("ChatVisitorDB", back_populates="sessions")
    messages = relationship("HardcodedMessageDB", back_populates="session", cascade="all, delete-orphan")


class HardcodedMessageDB(Base):
    __tablename__ = "hardcoded_messages"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    bot_id = Column(String, ForeignKey("hardcoded_bots.id"), nullable=False)
    role = Column(String, nullable=False) # user, assistant, system
    content = Column(Text, nullable=False)
    matched_faq_id = Column(String, nullable=True)
    matched_intent = Column(String, nullable=True)
    citations = Column(JSON, default=list)
    cta = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("ChatSessionDB", back_populates="messages")


# --- Pydantic Schemas for API Requests & Responses ---

class CreateAgentRequest(BaseModel):
    url: str
    name: Optional[str] = None
    scope: Optional[str] = "entire_website"

class UpdateAgentRequest(BaseModel):
    name: Optional[str] = None
    primary_color: Optional[str] = None
    welcome_message: Optional[str] = None

class EntitySchema(BaseModel):
    id: str
    entity_type: str
    entity_name: str
    attributes: Dict[str, Any]
    source_url: str
    source_type: str = "REAL_WEBSITE"
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class PageSchema(BaseModel):
    id: str
    url: str
    title: str
    char_count: int
    http_status: int
    source_type: str = "REAL_WEBSITE"
    crawled_at: datetime.datetime

    class Config:
        from_attributes = True

class PageDetailSchema(PageSchema):
    description: str
    content_text: str
    entities: List[EntitySchema] = []

class CrawlJobSchema(BaseModel):
    id: str
    agent_id: str
    status: str
    pages_discovered: int
    pages_processed: int
    pages_indexed: int
    pages_failed: int
    pages_skipped: int
    current_page_url: Optional[str] = ""
    started_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class SectorInfoSchema(BaseModel):
    sector: str
    confidence: float
    reason: str

class AgentResponse(BaseModel):
    id: str
    name: str
    website_url: str
    scope: str
    status: str
    primary_color: str
    welcome_message: str
    detected_sector: str = "general"
    sector_confidence: float = 0.75
    sector_reason: str = ""
    created_at: datetime.datetime
    last_crawled_at: Optional[datetime.datetime] = None
    indexed_pages_count: int = 0
    structured_entities_count: int = 0
    total_chunks_count: int = 0
    active_job: Optional[CrawlJobSchema] = None

    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    role: str
    content: str

class AdmissionLeadSchema(BaseModel):
    id: str
    agent_id: str
    student_name: str
    mobile_number: str
    father_name: Optional[str] = ""
    percentage: Optional[float] = None
    annual_income: Optional[str] = ""
    course_name: Optional[str] = ""
    preferred_department: Optional[str] = ""
    email: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    entrance_exam: Optional[str] = ""
    entrance_score: Optional[str] = ""
    admission_year: Optional[str] = "2026"
    hostel_required: Optional[str] = ""
    lead_score: int = 50
    lead_temperature: str = "WARM"
    academic_qualification: str = "NEEDS_REVIEW"
    qualification_status: str = ""
    lead_factors: List[str] = []
    source: str = "REAL_CHAT"
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class AdmissionLeadCreate(BaseModel):
    student_name: str
    mobile_number: str
    father_name: Optional[str] = ""
    percentage: Optional[float] = None
    annual_income: Optional[str] = ""
    course_name: Optional[str] = ""
    preferred_department: Optional[str] = ""
    email: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    entrance_exam: Optional[str] = ""
    entrance_score: Optional[str] = ""
    admission_year: Optional[str] = "2026"
    hostel_required: Optional[str] = ""

class CallbackRequestSchema(BaseModel):
    id: str
    lead_id: Optional[str] = None
    agent_id: str
    student_name: str
    mobile_number: str
    course: Optional[str] = ""
    preferred_time: str = "Today - ASAP"
    status: str = "PENDING"
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class CallbackCreateRequest(BaseModel):
    student_name: str
    mobile_number: str
    course: Optional[str] = ""
    preferred_time: Optional[str] = "Today - ASAP"
    lead_id: Optional[str] = None

class LeadsSummaryResponse(BaseModel):
    total_leads: int
    hot_leads: int
    warm_leads: int
    cold_leads: int
    real_leads_count: int
    demo_leads_count: int
    high_income_leads: int
    leads: List[AdmissionLeadSchema]

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    mode: Optional[str] = "student" # "student" | "teacher"
    debug: Optional[bool] = False

class CitationSchema(BaseModel):
    url: str
    title: str
    snippet: str
    source_type: str = "REAL_WEBSITE" # REAL_WEBSITE, DEMO_DATA, DEMO_DOCUMENT

class DebugTraceItem(BaseModel):
    chunk_id: str
    title: str
    url: str
    score: float
    source_type: str = "REAL_WEBSITE"
    matched_entity: Optional[str] = None
    snippet: str

class DebugTrace(BaseModel):
    detected_intent: str
    detected_entity_type: Optional[str] = None
    detected_entity: Optional[str] = None
    applied_filters: Dict[str, Any] = {}
    matched_structured_entities: List[str] = []
    retrieved_sources: List[str] = []
    reranked_chunks: List[DebugTraceItem] = []

class LeadScoreSchema(BaseModel):
    score: int # 0 - 100
    status: str # HOT, WARM, COLD
    factors: List[str]
    is_demo: bool = True

class EnrollmentPredictionSchema(BaseModel):
    likelihood_percent: int # 0 - 100
    factors: List[str]
    confidence: str # High, Moderate, Low
    is_demo: bool = True

class BookingSlotSchema(BaseModel):
    id: str
    title: str
    date: str
    time: str
    type: str # counselor_call, campus_tour, callback
    is_available: bool = True

class BookingRequest(BaseModel):
    slot_id: str
    name: str
    email: str
    phone: str
    course_interest: Optional[str] = None

class BookingResponse(BaseModel):
    booking_id: str
    status: str
    message: str
    slot: BookingSlotSchema
    is_demo: bool = True

class ChatResponse(BaseModel):
    answer: str
    citations: List[CitationSchema]
    debug_trace: Optional[DebugTrace] = None
    lead_score: Optional[LeadScoreSchema] = None
    enrollment_prediction: Optional[EnrollmentPredictionSchema] = None
    admission_lead: Optional[AdmissionLeadSchema] = None
    apply_url: Optional[str] = None
    management_quota_url: Optional[str] = None
    suggested_actions: Optional[List[str]] = None
    booking_slots: Optional[List[BookingSlotSchema]] = None


# --- Hardcoded / Predefined Bot Pydantic Schemas ---

class CreateHardcodedBotRequest(BaseModel):
    url: str
    name: Optional[str] = None
    sector: Optional[str] = None
    ttl_days: Optional[int] = 7

class HardcodedFAQSchema(BaseModel):
    id: str
    bot_id: str
    intent: str
    category: str
    questions: List[str] = []
    answer: str
    source_urls: List[str] = []
    cta_label: Optional[str] = None
    cta_url: Optional[str] = None
    priority: int = 1
    answer_available: bool = True
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class HardcodedBotResponse(BaseModel):
    id: str
    agent_id: Optional[str] = None
    name: str
    website_url: str
    sector: str
    status: str
    version: int = 1
    ttl_days: int = 7
    welcome_message: str
    primary_color: str = "#3B82F6"
    error_message: Optional[str] = None
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None
    expires_at: Optional[datetime.datetime] = None
    last_generated_at: Optional[datetime.datetime] = None
    is_expired: bool = False
    faqs_count: int = 0
    visitors_count: int = 0

    class Config:
        from_attributes = True

class ChatVisitorSchema(BaseModel):
    id: str
    bot_id: str
    email: str
    mobile: str
    student_name: Optional[str] = ""
    father_name: Optional[str] = ""
    percentage: Optional[float] = None
    annual_income: Optional[str] = ""
    course: Optional[str] = ""
    admission_year: Optional[str] = "2026"
    source_url: Optional[str] = ""
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class HardcodedCTA(BaseModel):
    label: str
    url: str

class HardcodedChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    email: Optional[str] = None
    mobile: Optional[str] = None
    student_name: Optional[str] = None
    course: Optional[str] = None
    percentage: Optional[float] = None

class HardcodedChatResponse(BaseModel):
    session_id: str
    bot_id: str
    step: str # ask_email, ask_mobile, active
    answer: str
    matched_intent: Optional[str] = None
    matched_faq_id: Optional[str] = None
    citations: List[CitationSchema] = []
    cta: Optional[HardcodedCTA] = None
    suggested_actions: Optional[List[str]] = None
    fallback_triggered: bool = False
    show_ask_ai: bool = False
    show_request_callback: bool = False
    visitor: Optional[ChatVisitorSchema] = None


# --- Product Scraper Database Models ---

class ScrapeJobDB(Base):
    __tablename__ = "scrape_jobs"

    id = Column(String, primary_key=True, index=True)
    source_url = Column(String, nullable=False, index=True)
    website = Column(String, default="Instamart")
    status = Column(String, default="QUEUED") # QUEUED, FETCHING, EXTRACTING, SAVING, COMPLETED, FAILED
    progress_message = Column(String, default="Preparing scraper...")
    total_found = Column(Integer, default=0)
    total_saved = Column(Integer, default=0)
    total_failed = Column(Integer, default=0)
    duplicates_removed = Column(Integer, default=0)
    city = Column(String, nullable=True)
    location_context = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    products = relationship("ProductDB", back_populates="scrape_job", cascade="all, delete-orphan")


class ProductDB(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    scrape_job_id = Column(String, ForeignKey("scrape_jobs.id"), nullable=False, index=True)
    source_url = Column(String, nullable=False)
    product_url = Column(String, nullable=False)
    product_name = Column(String, nullable=False, index=True)
    brand = Column(String, nullable=True, index=True)
    selling_price = Column(Float, nullable=True)
    mrp = Column(Float, nullable=True)
    discount = Column(String, nullable=True)
    pack_size = Column(String, nullable=True)
    availability = Column(String, default="In Stock")
    image_url = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True, index=True)
    city = Column(String, nullable=True)
    location_context = Column(String, nullable=True)
    raw_data = Column(JSON, default=dict)
    scraped_at = Column(DateTime, default=datetime.datetime.utcnow)

    scrape_job = relationship("ScrapeJobDB", back_populates="products")


# --- Product Scraper Pydantic Schemas ---

class CreateScrapeJobRequest(BaseModel):
    url: str
    max_products: Optional[int] = 100

class ProductResponse(BaseModel):
    id: str
    scrape_job_id: str
    source_url: str
    product_url: str
    product_name: str
    brand: Optional[str] = ""
    selling_price: Optional[float] = None
    mrp: Optional[float] = None
    discount: Optional[str] = ""
    pack_size: Optional[str] = ""
    availability: str = "In Stock"
    image_url: Optional[str] = ""
    description: Optional[str] = ""
    category: Optional[str] = ""
    city: Optional[str] = ""
    location_context: Optional[str] = ""
    scraped_at: datetime.datetime

    class Config:
        from_attributes = True

class ScrapeJobResponse(BaseModel):
    id: str
    source_url: str
    website: str
    status: str
    progress_message: Optional[str] = ""
    total_found: int = 0
    total_saved: int = 0
    total_failed: int = 0
    duplicates_removed: int = 0
    city: Optional[str] = None
    location_context: Optional[str] = None
    error_message: Optional[str] = None
    started_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class PaginatedProductsResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    pages: int
    brands: List[str] = []
    categories: List[str] = []


# --- College Web Search Database Models ---

class WebSearchConfigDB(Base):
    __tablename__ = "web_search_configs"

    id = Column(String, primary_key=True, index=True)
    college_name = Column(String, default="Poornima University / College")
    primary_domain = Column(String, default="poornima.org")
    max_sources_per_query = Column(Integer, default=3)
    status = Column(String, default="ACTIVE") # ACTIVE, INACTIVE
    cache_ttl_seconds = Column(Integer, default=600) # 10 minutes
    system_prompt_override = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class WebSearchSourceDB(Base):
    __tablename__ = "web_search_sources"

    id = Column(String, primary_key=True, index=True)
    url = Column(String, nullable=False, unique=True, index=True)
    title = Column(String, default="")
    category = Column(String, default="General", index=True)
    is_enabled = Column(Integer, default=1) # 1=True, 0=False
    content_snippet = Column(Text, nullable=True)
    content_full = Column(Text, nullable=True)
    last_fetched_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class WebSearchCacheDB(Base):
    __tablename__ = "web_search_caches"

    id = Column(String, primary_key=True, index=True) # Hash of query
    query = Column(String, nullable=False, index=True)
    detected_intent = Column(String, default="general")
    search_query = Column(String, default="")
    selected_source_ids = Column(JSON, default=list)
    answer = Column(Text, nullable=False)
    citations = Column(JSON, default=list)
    debug_trace = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)


# --- College Web Search Pydantic Schemas ---

class WebSearchSourceSchema(BaseModel):
    id: str
    url: str
    title: str
    category: str
    is_enabled: bool = True
    content_snippet: Optional[str] = None
    last_fetched_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class WebSearchSourceCreate(BaseModel):
    url: str
    title: Optional[str] = None
    category: Optional[str] = "General"

class WebSearchSourceUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    is_enabled: Optional[bool] = None

class WebSearchConfigSchema(BaseModel):
    id: str
    college_name: str
    primary_domain: str
    max_sources_per_query: int
    status: str
    cache_ttl_seconds: int
    total_sources_count: int = 0
    active_sources_count: int = 0
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class WebSearchConfigUpdate(BaseModel):
    college_name: Optional[str] = None
    primary_domain: Optional[str] = None
    max_sources_per_query: Optional[int] = None
    status: Optional[str] = None
    cache_ttl_seconds: Optional[int] = None
    system_prompt_override: Optional[str] = None

class WebSearchDebugTrace(BaseModel):
    user_query: str
    detected_intent: str
    optimized_search_query: str
    sources_returned: List[Dict[str, Any]] = []
    selected_sources: List[Dict[str, Any]] = []
    ai_link_selection_reason: Optional[str] = None
    cache_hit: bool = False
    processing_time_ms: float = 0.0

class WebSearchChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    include_debug: bool = True

class WebSearchChatResponse(BaseModel):
    answer: str
    sources_used_count: int
    sources: List[CitationSchema]
    is_live_searched: bool = True
    detected_intent: str
    debug_trace: Optional[WebSearchDebugTrace] = None

# --- Generic Sitemap-Based College Web Search Database Models ---

class CollegeWebSearchProjectDB(Base):
    __tablename__ = "college_web_search_projects"

    id = Column(String, primary_key=True, index=True)
    college_name = Column(String, nullable=False, default="College / University")
    sitemap_url = Column(String, nullable=False)
    base_domain = Column(String, nullable=False, index=True)
    status = Column(String, default="READY") # QUEUED, PROCESSING, READY, FAILED
    progress_message = Column(String, default="Sitemap ready")
    total_urls = Column(Integer, default=0)
    active_urls = Column(Integer, default=0)
    max_sources_per_query = Column(Integer, default=3)
    cache_ttl_seconds = Column(Integer, default=600)
    institute_type = Column(String, default="college") # college, coaching
    system_prompt_override = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    sources = relationship("CollegeWebSourceDB", back_populates="project", cascade="all, delete-orphan")


class CollegeWebSourceDB(Base):
    __tablename__ = "college_web_sources"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("college_web_search_projects.id"), nullable=False, index=True)
    url = Column(String, nullable=False, index=True)
    title = Column(String, default="")
    category = Column(String, default="General", index=True)
    source_type = Column(String, default="HTML") # HTML, PDF
    is_enabled = Column(Integer, default=1) # 1=True, 0=False
    content_snippet = Column(Text, nullable=True)
    content_full = Column(Text, nullable=True)
    discovered_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_fetched_at = Column(DateTime, nullable=True)

    project = relationship("CollegeWebSearchProjectDB", back_populates="sources")


class CollegeWebSearchCacheDB(Base):
    __tablename__ = "college_web_search_caches"

    id = Column(String, primary_key=True, index=True) # Hash of project_id + query
    project_id = Column(String, nullable=False, index=True)
    query = Column(String, nullable=False, index=True)
    detected_intent = Column(String, default="general")
    search_query = Column(String, default="")
    selected_source_ids = Column(JSON, default=list)
    answer = Column(Text, nullable=False)
    citations = Column(JSON, default=list)
    debug_trace = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)


# --- Generic College Web Search Pydantic Schemas ---

class CreateCollegeProjectRequest(BaseModel):
    college_name: Optional[str] = "College / University"
    sitemap_url: str
    institute_type: Optional[str] = "college" # "college" or "coaching"
    max_sources_per_query: Optional[int] = 3

class CollegeProjectResponse(BaseModel):
    id: str
    college_name: str
    sitemap_url: str
    base_domain: str
    institute_type: Optional[str] = "college"
    status: str
    progress_message: Optional[str] = ""
    total_urls: int = 0
    active_urls: int = 0
    max_sources_per_query: int = 3
    cache_ttl_seconds: int = 600
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class CollegeSourceSchema(BaseModel):
    id: str
    project_id: str
    url: str
    title: str
    category: str
    source_type: str = "HTML"
    is_enabled: bool = True
    content_snippet: Optional[str] = None
    last_fetched_at: Optional[datetime.datetime] = None
    discovered_at: datetime.datetime

    class Config:
        from_attributes = True

class CollegeSourceUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    is_enabled: Optional[bool] = None

class RebuildSourcesResponse(BaseModel):
    project_id: str
    status: str
    message: str
    total_urls: int
    added_count: int
    removed_count: int
    active_urls: int

class CollegeChatRequest(BaseModel):
    project_id: Optional[str] = "proj_poornima"
    message: str
    history: Optional[List[ChatMessage]] = []
    include_debug: bool = True

class CollegeChatResponse(BaseModel):
    project_id: str
    college_name: str
    answer: str
    sources_used_count: int
    sources: List[CitationSchema]
    is_live_searched: bool = True
    detected_intent: str
    debug_trace: Optional[WebSearchDebugTrace] = None

class WebSearchTestRequest(BaseModel):
    query: str
    max_sources: Optional[int] = 3

class WebSearchTestResponse(BaseModel):
    query: str
    detected_intent: str
    optimized_search_query: str
    candidate_sources: List[Dict[str, Any]] = []
    selected_sources: List[Dict[str, Any]] = []





