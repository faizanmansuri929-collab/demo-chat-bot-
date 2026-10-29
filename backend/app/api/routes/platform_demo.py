import re
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.llm.provider import get_llm_provider

logger = logging.getLogger("omniagent")

router = APIRouter(prefix="/platform-demo", tags=["Platform Demo"])

class PlatformDemoChatRequest(BaseModel):
    message: str = Field(..., description="User message or question about OmniAgent AI")
    history: Optional[List[Dict[str, str]]] = Field(default=[], description="Previous conversation turns")

class PlatformDemoChatResponse(BaseModel):
    answer: str
    sources: Optional[List[str]] = Field(default=["omniagent.ai/overview", "omniagent.ai/features"])

OMNIAGENT_SYSTEM_PROMPT = """You are the official AI Product Specialist for OmniAgent AI (Universal Website-to-AI Assistant Platform).

YOUR PRIMARY MISSION:
Explain, demonstrate, and guide visitors on everything OmniAgent AI can do. You act as an intelligent, authoritative, and friendly product demo assistant for the OmniAgent AI platform.

CRITICAL RULES:
1. STRICT PRODUCT FOCUS: You ONLY represent OmniAgent AI. NEVER mention, promote, or hallucinate any specific college or university name (such as Poornima, XYZ University, Rajasthan University, etc.). OmniAgent is a universal platform suitable for businesses, SaaS, healthcare, schools, and ecommerce.
2. If asked what OmniAgent is, explain that it is an enterprise full-stack platform that turns any public website into a multi-modal AI assistant with grounded RAG, real-time voice, lead capture, and scraper capabilities.
3. Highlight Key Capabilities:
   - 🎙️ Realtime WebRTC Voice Assistant: Ultra-low latency voice with OpenAI Realtime GA & Web Speech API, supporting Push-to-Talk (Spacebar) and Hands-free modes with on-screen Markdown table sync.
   - 🔍 Live Grounded Web Search: Deep sitemap crawling with 10-minute cache TTL, zero-hallucination domain boundary enforcement, and verified clickable citations.
   - 🎯 Lead Engine & CRM: In-conversation visitor lead capture (name, email, phone, interest), automated 0-100 lead scoring, pipeline tracking (New -> Contacted -> Qualified -> Converted), and CSV export.
   - 🧠 Deep-Crawl ChromaDB Vector RAG: Tenant-isolated vector collections with hybrid BM25 search.
   - ⚡ Deterministic Hardcoded FAQ Bot: AI-generated question-answer datasets with sub-millisecond keyword/regex matching ($0 LLM cost).
   - 🛒 eCommerce Product Scraper: Automated catalog extraction with price tracking, pagination, and Excel/CSV download.
   - 🔌 Embeddable Widget: A one-line JavaScript tag (<script src="/widget.js" data-agent-id="..."></script>) to embed the assistant on any external website.
4. How to create an assistant:
   - Step 1: Enter your website URL or sitemap link in the "Create Assistant" wizard.
   - Step 2: OmniAgent crawls and indexes your pages, extracting structured entities.
   - Step 3: Configure voice/text personas, test in playground, and deploy via embed widget.
5. Language Matching:
   - If the user asks in Hindi or Hinglish, answer in natural, friendly Hindi/Hinglish.
   - If the user asks in English, answer in clear, professional English.
6. Tone: Direct, helpful, clean formatting with bullet points and bold headers. Do NOT use excessive markdown asterisks unnecessarily."""

FALLBACK_QA = [
    {
        "keys": ["what can omniagent do", "what is omniagent", "omniagent kya hai", "features", "capabilities", "product"],
        "answer": """**OmniAgent AI** is a universal website-to-AI agent platform that transforms any public website into an intelligent, multi-modal assistant.

### Key Capabilities:
- 🎙️ **Realtime WebRTC Voice**: Speak naturally with visitors using ultra-low latency voice, supporting Push-to-Talk (Spacebar) and Hands-free modes.
- 🔍 **Live Grounded Web Search**: Directly reads your live website sitemap with 10-minute caching and zero-hallucination citations.
- 🎯 **Lead Engine & CRM**: Captures prospective leads (Name, Email, Phone, Interest), auto-scores them (0–100), and tracks them across your sales pipeline.
- 🧠 **ChromaDB Vector RAG**: Deep crawling with tenant-isolated vector search and hybrid BM25 ranking.
- ⚡ **Instant FAQ Matching**: Deterministic sub-millisecond keyword/regex responses at $0 LLM cost.
- 🛒 **eCommerce Scraper**: Automated catalog extraction (like Instamart) with price tracking and Excel/CSV export.
- 🔌 **Embeddable Widget**: Add one `<script>` tag to embed the assistant on any website.""",
        "sources": ["omniagent.ai/features", "omniagent.ai/docs"]
    },
    {
        "keys": ["how do i create", "create an assistant", "kaise banaye", "setup", "start", "build assistant"],
        "answer": """Creating an AI assistant with OmniAgent takes just **3 simple steps**:

1. **Enter Your Website URL**:
   Go to **Create Assistant** in the navbar and paste your website URL or XML sitemap link.
2. **Automated Deep Crawl**:
   OmniAgent reads your pages, extracts structured entities (services, products, FAQs, contacts), and builds a grounded knowledge base.
3. **Customize & Launch**:
   Choose your persona (Voice, Text RAG, or Instant FAQ), test in the interactive playground, and embed it using a single `<script>` tag on your website!""",
        "sources": ["omniagent.ai/get-started", "omniagent.ai/create"]
    },
    {
        "keys": ["lead", "crm", "capture", "sales", "scoring"],
        "answer": """**Yes! OmniAgent includes a full-featured Lead Engine & CRM:**

- 📋 **In-Conversation Capture**: Seamlessly asks for name, email, phone number, and area of interest during the chat.
- 📊 **Automated Lead Scoring (0–100)**: Automatically calculates lead quality based on verified contact fields and high-intent queries.
- 📈 **Pipeline Tracking**: Moves leads across stages: `New` ➔ `Contacted` ➔ `Qualified` ➔ `Converted`.
- 👥 **Automated Counselor Assignment**: Assigns leads to dedicated team members or counselors.
- 📥 **CSV / Excel Export**: Export qualified leads with one click to your existing CRM.""",
        "sources": ["omniagent.ai/lead-engine", "omniagent.ai/crm"]
    },
    {
        "keys": ["voice", "webrtc", "mic", "spacebar", "push to talk", "aawaz", "speech"],
        "answer": """**OmniAgent features an enterprise-grade Realtime Voice Assistant:**

- ⚡ **Ultra-Low Latency**: Powered by OpenAI Realtime WebRTC and browser native Web Speech API.
- 🎙️ **Dual Modes**: 
  - **Push-to-Talk**: Hold Spacebar or button to speak — perfect for noisy environments.
  - **Hands-Free**: Continuous conversation with near-field voice detection.
- 📊 **Audio & Screen Sync**: Speaks a concise spoken summary aloud while simultaneously rendering complete Markdown tables on the screen!
- 🌐 **Bilingual (English & Hindi/Hinglish)**: Speaks and understands natural Indian English and Hindi seamlessly.""",
        "sources": ["omniagent.ai/voice", "omniagent.ai/webrtc"]
    }
]

@router.post("/chat", response_model=PlatformDemoChatResponse)
async def chat_platform_demo(payload: PlatformDemoChatRequest):
    """
    Dedicated OmniAgent Platform Demo Chatbot Endpoint:
    Provides authoritative, accurate answers about OmniAgent AI platform features,
    capabilities, voice assistant, lead engine, and setup.
    STRICTLY avoids promoting any college or university.
    """
    user_msg = (payload.message or "").strip()
    if not user_msg:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")

    history = payload.history or []

    # Check for direct greeting
    low_msg = user_msg.lower()
    if any(g == low_msg or low_msg.startswith(g + " ") for g in ["hi", "hello", "hey", "namaste", "halo"]):
        return PlatformDemoChatResponse(
            answer="👋 **Hello! Welcome to the OmniAgent AI Interactive Demo.**\n\nI can answer questions about how OmniAgent turns your website into an AI assistant, our Realtime WebRTC Voice, Lead Engine & CRM, product scraping, and embeddable widgets.\n\nWhat would you like to know about OmniAgent?",
            sources=["omniagent.ai/overview", "omniagent.ai/features"]
        )

    # Format conversation history
    history_lines = []
    for h in history[-6:]:
        role = "User" if h.get("role") == "user" else "OmniAgent Specialist"
        content = h.get("content") or h.get("text") or ""
        if content:
            history_lines.append(f"{role}: {content}")
    history_prompt = ("PREVIOUS CONVERSATION:\n" + "\n".join(history_lines) + "\n\n") if history_lines else ""

    prompt = f"""{history_prompt}CURRENT USER QUESTION:
{user_msg}

Please provide an accurate, helpful, and concise answer about OmniAgent AI following your system instructions. Do NOT mention any university or college names."""

    try:
        llm = get_llm_provider()
        answer = await llm.generate_response(prompt=prompt, system_instruction=OMNIAGENT_SYSTEM_PROMPT)
        clean_answer = (answer or "").strip()

        # Sanity check: Ensure no legacy college name leaked into demo answer
        clean_answer = re.sub(r'(?i)\bpoornima\b', 'OmniAgent', clean_answer)

        if clean_answer and len(clean_answer) > 15:
            # Determine contextual sources based on question
            sources = ["omniagent.ai/features"]
            if any(k in low_msg for k in ["voice", "speak", "mic", "webrtc", "aawaz"]):
                sources = ["omniagent.ai/voice", "omniagent.ai/webrtc"]
            elif any(k in low_msg for k in ["lead", "crm", "score", "sales"]):
                sources = ["omniagent.ai/lead-engine", "omniagent.ai/crm"]
            elif any(k in low_msg for k in ["create", "setup", "start", "build"]):
                sources = ["omniagent.ai/get-started", "omniagent.ai/docs"]
            elif any(k in low_msg for k in ["scrape", "ecommerce", "product", "instamart"]):
                sources = ["omniagent.ai/scraper", "omniagent.ai/catalog"]

            return PlatformDemoChatResponse(
                answer=clean_answer,
                sources=sources
            )
    except Exception as e:
        logger.warning(f"[PlatformDemo] LLM call error: {e}, falling back to built-in QA.")

    # High-quality fallback matching if LLM provider is offline
    for qa in FALLBACK_QA:
        if any(k in low_msg for k in qa["keys"]):
            return PlatformDemoChatResponse(
                answer=qa["answer"],
                sources=qa["sources"]
            )

    # General default response
    default_ans = f"""**OmniAgent AI** is a universal platform designed to connect directly with your existing website and convert your visitors into active conversations.

For your inquiry ("{user_msg}"):
- **Instant Knowledge Retrieval**: OmniAgent crawls your public URLs and answers questions grounded strictly in your official website content with citations.
- **Multi-Modal Interaction**: Works via interactive chat, real-time WebRTC voice, or embeddable widget.
- **Lead Generation**: Automatically captures visitor names, emails, and phone numbers directly in conversation.

Try clicking one of the suggested questions below to see how it works!"""

    return PlatformDemoChatResponse(
        answer=default_ans,
        sources=["omniagent.ai/overview", "omniagent.ai/features"]
    )

