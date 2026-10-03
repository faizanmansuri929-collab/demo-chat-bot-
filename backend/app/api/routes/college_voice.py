import os
import json
import httpx
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.schemas import CollegeWebSearchProjectDB, CollegeWebSourceDB
from app.services.web_search.allowlist import seed_poornima_allowlist
from app.services.web_search.search_engine import select_and_fetch_college_sources
from app.services.web_search.generator import generate_college_web_search_answer

router = APIRouter(prefix="/college-voice", tags=["College Voice Web Search"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CreateVoiceSessionRequest(BaseModel):
    project_id: Optional[str] = "proj_poornima"
    voice: Optional[str] = "verse" # alloy, ash, ballad, coral, echo, sage, shimmer, verse
    language: Optional[str] = "en-IN" # en-IN, hi
    vad_threshold: Optional[float] = 0.85
    silence_duration_ms: Optional[int] = 450
    mode: Optional[str] = "hands_free" # hands_free, push_to_talk


class VoiceSessionResponse(BaseModel):
    client_secret: Dict[str, Any]
    session_id: str
    project_id: str
    college_name: str
    base_domain: str
    model: str
    voice: str
    language: str


class VoiceSearchToolRequest(BaseModel):
    project_id: Optional[str] = "proj_poornima"
    query: str
    language: Optional[str] = "en-IN"
    max_sources: Optional[int] = 3


class VoiceSourceItem(BaseModel):
    title: str
    url: str
    score: Optional[float] = 1.0
    category: Optional[str] = "General"


class VoiceSearchToolResponse(BaseModel):
    query: str
    college_name: str
    detected_intent: str
    sources_used_count: int
    sources: List[VoiceSourceItem]
    context: str
    summary_for_voice: str
    detailed_answer: str


def build_voice_system_prompt(college_name: str, base_domain: str, language: str = "en-IN") -> str:
    lang_instruction = ""
    if language == "hi":
        lang_instruction = """
LANGUAGE & SCRIPT (NATURAL HINGLISH):
- You MUST speak and respond strictly in natural, conversational Hinglish (Hindi words written in clean Roman/Latin alphabet script, e.g. "Poornima University me B.Tech CSE ki annual tuition fee approximately 1.21 Lakhs hai. Full fee breakdown tables aur admission eligibility details aapki screen par show ho rahi hain.").
- Do NOT output in Devanagari script. Use everyday Indian conversational Hinglish in clean Roman letters.
- Keep the spoken tone polite, natural, and helpful with an authentic Indian accent.
"""
    else:
        lang_instruction = """
LANGUAGE & ACCENT (INDIAN ENGLISH):
- You MUST speak with a natural, polite, professional Indian English tone and cadence.
- Use standard Indian academic terminology naturally (e.g., 'B.Tech', 'Lakhs per annum', 'hostel accommodation', 'annual fee structure', 'REAP counseling').
- Keep spoken pronunciation clear, warm, and helpful.
"""

    return f"""You are the official Indian Voice Assistant for {college_name} (official website: {base_domain}).

CRITICAL MANDATORY DOMAIN-CHECK RULES:
1. STRICT DOMAIN LOCK (ZERO UNVERIFIED RESPONSES):
   You are strictly restricted to {college_name} ({base_domain}). You are PROHIBITED from answering any question from general world knowledge without first reading the official domain.
2. MANDATORY TOOL CALLING BEFORE EVERY RESPONSE:
   Whenever the user asks ANY question (fees, courses, admissions, eligibility, placements, hostels, faculty, cutoffs, campus), you MUST IMMEDIATELY execute the `college_web_search` tool to read and verify live pages from {base_domain}.
3. NO OFF-DOMAIN ANSWERS:
   If the user asks about an unrelated entity, external topic, or general questions not related to {college_name}, you MUST politely refuse:
   "I can only provide verified information from the official {college_name} website ({base_domain}). Please ask a question about {college_name}."
4. ABSENCE OF INFORMATION:
   If the official {base_domain} search does not contain the requested detail, explicitly state that this information is not found on the official {base_domain} website. Do NOT make up numbers or guess.
5. CONCISE SPOKEN SUMMARY (FOR AUDIO STREAM):
   - When the tool returns data, speak a short 1 to 2 sentence polite conversational summary aloud (10 to 35 words).
   - Inform the user that full detailed breakdown tables, branch lists, and verified official links are displayed on their screen.
   - Example: "B.Tech tuition fee is approximately 1.21 Lakhs per year. I have displayed the complete detailed fee breakdown table and official links on your screen!"
6. User speech is in English or Hinglish (Hindi in Roman script). Never output or transcribe into unrelated languages or strange scripts.
{lang_instruction}
"""


@router.post("/session", response_model=VoiceSessionResponse)
async def create_voice_realtime_session(
    payload: CreateVoiceSessionRequest,
    db: Session = Depends(get_db)
):
    """
    Creates an OpenAI Realtime WebRTC session with ephemeral client credentials:
    1. Validates the college project and approved domain.
    2. Builds specialized concise voice instructions with Indian English or Hinglish tone.
    3. Configures `college_web_search` function tool for live search retrieval.
    4. Authenticates with OpenAI and returns ephemeral client secret for browser WebRTC.
    """
    seed_poornima_allowlist(db)
    
    project_id = payload.project_id or "proj_poornima"
    language = payload.language or "en-IN"
    project = db.query(CollegeWebSearchProjectDB).filter(CollegeWebSearchProjectDB.id == project_id).first()
    
    college_name = project.college_name if project else "Poornima University"
    base_domain = project.base_domain if project else "poornima.org"
    
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured on the server. Please check backend .env settings."
        )

    voice_instructions = build_voice_system_prompt(college_name=college_name, base_domain=base_domain, language=language)
    
    # Realtime model configuration
    model_name = "gpt-realtime-mini"
    selected_voice = payload.voice if payload.voice in ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"] else "alloy"

    # For both English and Hinglish, using 'en' transcription forces Whisper to output Roman/Latin alphabet characters (Hinglish)
    whisper_lang = "en"

    vad_threshold = payload.vad_threshold if (payload.vad_threshold is not None and payload.vad_threshold < 0.8) else 0.5
    silence_ms = payload.silence_duration_ms if (payload.silence_duration_ms is not None and payload.silence_duration_ms >= 500) else 650
    turn_detection_config = None if payload.mode == "push_to_talk" else {
        "type": "server_vad",
        "threshold": vad_threshold,
        "prefix_padding_ms": 300,
        "silence_duration_ms": silence_ms,
        "create_response": True,
        "interrupt_response": False
    }

    session_payload = {
        "session": {
            "type": "realtime",
            "model": model_name,
            "instructions": voice_instructions,
            "output_modalities": ["audio"],
            "audio": {
                "input": {
                    "transcription": {
                        "model": "whisper-1",
                        "language": whisper_lang,
                        "prompt": f"{college_name}, Poornima University, B.Tech, CSE, Computer Engineering, Artificial Intelligence, AI, Data Science, Mechanical, Civil, Electrical, MBA, BCA, MCA, hostel fees, mess, tuition fee structure, admission eligibility, REAP, cutoffs, placements, highest package, Jaipur, Rajasthan, Hinglish."
                    },
                    "turn_detection": turn_detection_config
                },
                "output": {
                    "voice": selected_voice,
                    "speed": 1.0
                }
            },
            "tools": [
                {
                    "type": "function",
                    "name": "college_web_search",
                    "description": f"Mandatory search tool: Searches official {college_name} website ({base_domain}) for live fees, courses, admissions, placements, hostels, and campus details.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The specific query to search on the official college website, e.g., 'B.Tech CSE fees structure', 'hostel fees', 'placement statistics', 'admission criteria'"
                            }
                        },
                        "required": ["query"]
                    }
                }
            ],
            "tool_choice": "auto"
        }
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/realtime/client_secrets",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json=session_payload
            )
            
            if resp.status_code != 200:
                # Fallback to gpt-realtime-2.1 if mini fails
                fallback_payload = dict(session_payload)
                fallback_payload["session"]["model"] = "gpt-realtime-2.1"
                resp_fallback = await client.post(
                    "https://api.openai.com/v1/realtime/client_secrets",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json=fallback_payload
                )
                if resp_fallback.status_code == 200:
                    data = resp_fallback.json()
                    ephemeral_val = data.get("value") or data.get("client_secret", {}).get("value", "")
                    sess_id = data.get("session", {}).get("id") or data.get("id", "")
                    return VoiceSessionResponse(
                        client_secret={"value": ephemeral_val, "expires_at": data.get("expires_at")},
                        session_id=sess_id,
                        project_id=project_id,
                        college_name=college_name,
                        base_domain=base_domain,
                        model="gpt-realtime-2.1",
                        voice=selected_voice,
                        language=language
                    )
                
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"OpenAI Realtime Session creation failed: {resp.text}"
                )

            data = resp.json()
            ephemeral_val = data.get("value") or data.get("client_secret", {}).get("value", "")
            sess_id = data.get("session", {}).get("id") or data.get("id", "")
            return VoiceSessionResponse(
                client_secret={"value": ephemeral_val, "expires_at": data.get("expires_at")},
                session_id=sess_id,
                project_id=project_id,
                college_name=college_name,
                base_domain=base_domain,
                model=model_name,
                voice=selected_voice,
                language=language
            )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Network error connecting to OpenAI Realtime API: {str(e)}"
        )


@router.post("/search-tool", response_model=VoiceSearchToolResponse)
async def execute_voice_search_tool(
    payload: VoiceSearchToolRequest,
    db: Session = Depends(get_db)
):
    """
    Executes the exact same College Web Search pipeline as text search:
    1. Calls `generate_college_web_search_answer` directly to get the identical grounded markdown answer, fee tables & verified sources.
    2. Constructs a crisp 1-2 sentence spoken summary for voice audio.
    3. Returns full structured tables & citations for screen display.
    """
    seed_poornima_allowlist(db)
    
    project_id = payload.project_id or "proj_poornima"
    language = payload.language or "en-IN"
    query = payload.query.strip()
    
    chat_res = await generate_college_web_search_answer(
        project_id=project_id,
        user_message=query,
        history=[],
        include_debug=False,
        db=db
    )
    
    sources_list: List[VoiceSourceItem] = []
    for s in (chat_res.sources or []):
        sources_list.append(VoiceSourceItem(
            title=s.title or f"{chat_res.college_name} Official Page",
            url=s.url,
            score=1.0,
            category=getattr(s, "category", "General")
        ))
    
    # Generate concise spoken summary for the audio model
    spoken_summary = ""
    if language == "hi":
        spoken_summary = f"{chat_res.college_name} ki official website se verified information aur fees tables niche screen par show ho rahi hain."
    else:
        spoken_summary = f"I found the verified details and fee breakdown from {chat_res.college_name}'s official website and displayed the complete table on your screen."
    
    return VoiceSearchToolResponse(
        query=query,
        college_name=chat_res.college_name,
        detected_intent=chat_res.detected_intent or "general",
        sources_used_count=chat_res.sources_used_count,
        sources=sources_list,
        context=chat_res.answer[:2000],
        summary_for_voice=spoken_summary,
        detailed_answer=chat_res.answer
    )
