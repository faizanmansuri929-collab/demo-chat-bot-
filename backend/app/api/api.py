from fastapi import APIRouter
from app.api.routes import agent, chat, widget, leads, hardcoded, scraper, web_search, college_voice, lead_engine

api_router = APIRouter(prefix="/api")
api_router.include_router(agent.router)
api_router.include_router(chat.router)
api_router.include_router(leads.router)
api_router.include_router(widget.router)
api_router.include_router(hardcoded.router)
api_router.include_router(scraper.router)
api_router.include_router(web_search.router)
api_router.include_router(college_voice.router)
api_router.include_router(lead_engine.router)




