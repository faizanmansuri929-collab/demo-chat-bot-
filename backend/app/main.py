import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.api import api_router

logger = logging.getLogger("omniagent")

# Initialize database tables and migrations
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from app.core.database import SessionLocal
        from app.services.web_search.allowlist import seed_poornima_allowlist
        db = SessionLocal()
        try:
            seed_poornima_allowlist(db)
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"[Startup] Warning seeding legacy allowlist: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend service for crawling websites, creating tenant-isolated knowledge bases, and serving grounded RAG AI agents.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "provider": settings.DEFAULT_LLM_PROVIDER
    }

@app.get("/widget.js")
def serve_widget_js():
    js_code = """
(function() {
    if (window.UniversalAgentWidget) return;
    
    var script = document.currentScript;
    var agentId = script ? script.getAttribute('data-agent-id') : null;
    var baseUrl = script ? script.src.replace('/widget.js', '') : 'http://localhost:3000';
    if (!agentId) {
        console.error('Universal AI Agent Widget: Missing data-agent-id attribute.');
        return;
    }

    var iframe = document.createElement('iframe');
    iframe.id = 'universal-agent-iframe-' + agentId;
    iframe.src = baseUrl + '/widget/' + agentId;
    iframe.style.position = 'fixed';
    iframe.style.bottom = '20px';
    iframe.style.right = '20px';
    iframe.style.width = '380px';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '16px';
    iframe.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
    iframe.style.zIndex = '999999';
    iframe.style.overflow = 'hidden';
    iframe.allow = 'clipboard-write';

    document.body.appendChild(iframe);
    window.UniversalAgentWidget = { loaded: true };
})();
"""
    return Response(content=js_code, media_type="application/javascript")
