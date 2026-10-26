# Universal Website AI Agent Platform (OmniAgent AI)

An enterprise full-stack platform that ingests public website URLs, crawls & extracts content (including modern React/Vite/Next.js Single Page Applications), automatically classifies industry sectors, extracts structured domain entities, and serves multi-modal grounded AI assistants:
1. **Realtime WebRTC Voice Assistant**: Low-latency spoken Q&A with Whisper STT and on-screen Markdown table synchronization.
2. **Grounded Live Web Search**: Dynamic multi-URL sitemap retrieval with 10-minute caching and zero-hallucination domain boundary enforcement.
3. **Lead Engine & CRM**: Real-time prospective student/customer lead scoring, qualification, and automated counselor assignment.
4. **Deep-Crawl RAG Knowledge Base**: Tenant-isolated ChromaDB vector storage with BM25 hybrid ranking.
5. **Instant Hardcoded FAQ Bot**: One-time AI dataset generation with deterministic sub-millisecond matching.
6. **Ecommerce Product Scraper**: Automated catalog extraction (Instamart, etc.) with price tracking, pagination, and CSV/Excel export.

---

## Architecture

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend**: FastAPI (Python 3.11+), Async HTTP Crawler, BeautifulSoup4, ChromaDB Vector Store, SQLAlchemy 2.0 (SQLite)
- **Voice & Realtime**: OpenAI Realtime GA (WebRTC) with ephemeral token minting and Server VAD
- **LLM Engine**: Pluggable provider architecture (OpenAI GPT-4o-mini / Gemini / Mock fallback) with sector-aware prompt engineering, query analyzer, and multi-factor reranker.

---

## Quick Start

### 1. Prerequisites
- Python 3.11+
- Node.js 18+

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env # Add your OPENAI_API_KEY
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. One-Click Demo (Windows)
Double-click `start_demo.bat` to launch both backend (`http://localhost:8000`) and frontend (`http://localhost:3000`) simultaneously.

---

## Automated Verification & Testing

Run the automated test suite from the repository root:
```bash
python -m pytest backend/tests
```

Run end-to-end specialized test suites:
```bash
cd backend
python test_voice_turn.py             # Verifies WebRTC voice turn gating & Hinglish resolution
python test_product_scraper_e2e.py    # Verifies catalog scraping, pagination, and Excel/CSV export
python test_hardcoded_pipeline.py     # Verifies instant FAQ generation, TTL, and matching
python test_web_search_pipeline.py    # Verifies live sitemap fetching and LLM grounding
```

Build the production frontend:
```bash
cd frontend
npm run build
```

---

## Production Security & Design Highlights

- **Ephemeral Secret Minting**: WebRTC sessions generate temporary OpenAI client secrets on the server (`/api/college-voice/session`); permanent API keys never touch the client browser.
- **Strict Domain Grounding**: Off-domain requests are blocked; answers strictly cite verified source URLs.
- **Deterministic Single-Source Database**: Path resolution in `backend/app/core/config.py` anchors database and vector persistence directly to `backend/app.db` and `backend/chroma_db`, preventing stray databases when commands run across different directories.
- **Optimized Batch Queries**: API endpoints use aggregated SQL grouping to prevent N+1 query overhead.
- **Lazy-Loaded Embeddings**: Heavy PyTorch sentence-transformer models are loaded strictly on demand, saving memory and eliminating startup latency.
