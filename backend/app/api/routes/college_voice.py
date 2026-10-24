import os
import copy
import json
import time
import httpx
from collections import defaultdict
from typing import List, Optional, Dict, Any, Literal
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.schemas import CollegeWebSearchProjectDB, CollegeWebSourceDB
from app.services.web_search.search_engine import select_and_fetch_college_sources
from app.services.web_search.generator import generate_college_web_search_answer

router = APIRouter(prefix="/college-voice", tags=["College Voice Web Search"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# In-memory per-IP rate limiter (10 sessions / 60s)
# ---------------------------------------------------------------------------
_rate_store: Dict[str, list] = defaultdict(list)
_RATE_LIMIT = 10
_RATE_WINDOW = 60  # seconds

def _check_rate_limit(ip: str) -> bool:
    """Return True if within limit, False if exceeded."""
    now = time.monotonic()
    hits = [t for t in _rate_store[ip] if now - t < _RATE_WINDOW]
    if len(hits) >= _RATE_LIMIT:
        _rate_store[ip] = hits
        return False
    hits.append(now)
    _rate_store[ip] = hits
    return True


# ---------------------------------------------------------------------------
# Pydantic models – TASK B: strict Literals
# ---------------------------------------------------------------------------
class CreateVoiceSessionRequest(BaseModel):
    project_id: Optional[str] = None  # TASK A: no default; 404 if missing
    voice: Literal["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"] = "verse"
    language: Literal["en-IN", "hi"] = "en-IN"
    mode: Literal["hands_free", "push_to_talk"] = "hands_free"
    mic_profile: Literal["near_field", "far_field"] = "near_field"
    barge_in: bool = False
    vad_threshold: Optional[float] = 0.5
    silence_duration_ms: Optional[int] = 650

    @validator("vad_threshold")
    def clamp_vad(cls, v):
        if v is None:
            return 0.5
        return max(0.2, min(0.9, float(v)))

    @validator("silence_duration_ms")
    def clamp_silence(cls, v):
        if v is None:
            return 650
        return max(200, min(3000, int(v)))


class VoiceSessionResponse(BaseModel):
    client_secret: Dict[str, Any]
    session_id: str
    project_id: str
    college_name: str
    base_domain: str


# [COMMENTED OUT: Web Speech API is baseline STT]
# class CreateTranscriptionSessionRequest(BaseModel):
#     project_id: str
#     language: Optional[str] = "en-IN"
#     model: Optional[str] = "gpt-live-transcribe"
#
# class TranscriptionSessionResponse(BaseModel):
#     client_secret: Dict[str, Any]
#     session_id: str
#     project_id: str
#     college_name: str
#     base_domain: str
#     model: str


class VoiceSearchToolRequest(BaseModel):
    project_id: Optional[str] = None
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


# New /turn request/response models (TASK C)
class TurnHistoryItem(BaseModel):
    role: str
    content: str


class VoiceTurnRequest(BaseModel):
    project_id: str
    transcript: str
    language_hint: Optional[str] = "en-IN"
    history: Optional[List[TurnHistoryItem]] = Field(default_factory=list)
    stt_meta: Optional[Dict[str, Any]] = None


class VoiceSourceOut(BaseModel):
    title: str
    url: str
    category: Optional[str] = "General"


class VoiceTurnResponse(BaseModel):
    should_respond: bool
    reason: str
    found: bool
    intent: str
    language: str
    display_markdown: str
    spoken_summary: str
    sources: List[VoiceSourceOut]
    timings_ms: Dict[str, float]


# ---------------------------------------------------------------------------
# TASK B: tiny instructions – voice only speaks what it is given
# ---------------------------------------------------------------------------
VOICE_ONLY_INSTRUCTIONS = (
    "You are only a voice. Speak ONLY the text you are given via response.create, "
    "exactly and naturally in an Indian accent. Never answer on your own, "
    "never use general knowledge."
)

# ---------------------------------------------------------------------------
# TASK B: verified transcription model constants
# ---------------------------------------------------------------------------
# OpenAI Realtime docs confirm `whisper-1` works for input_audio_transcription.
# `gpt-transcribe` params (languages/keywords) are unverified; use whisper-1 only.
TRANSCRIPTION_MODEL = "whisper-1"

# Realtime model fallback order (TASK B)
REALTIME_MODEL_FALLBACK = ["gpt-realtime-mini", "gpt-realtime"]


def _build_keywords(college_name: str, base_domain: str) -> list:
    """Build transcription keywords from project data + generic academic terms."""
    parts = [p for p in college_name.replace("&", "and").split() if len(p) > 2]
    domain_part = base_domain.split(".")[0] if base_domain else ""
    generic = [
        "B.Tech", "BTech", "M.Tech", "MTech", "BCA", "MCA", "MBA", "BBA", "PhD",
        "CSE", "Computer Science", "Artificial Intelligence", "AI", "Data Science",
        "Mechanical", "Civil", "Electrical", "ECE",
        "hostel", "mess", "tuition fee", "scholarship", "admission",
        "eligibility", "REAP", "JEE", "CUET", "cutoff", "placement", "package",
        "registration fee", "application fee",
    ]
    all_kw = [college_name] + parts + ([domain_part] if domain_part else []) + generic
    return list(dict.fromkeys(kw for kw in all_kw if kw))


# ---------------------------------------------------------------------------
# TASK B: /session endpoint
# ---------------------------------------------------------------------------
@router.post("/session", response_model=VoiceSessionResponse)
async def create_voice_realtime_session(
    request: Request,
    payload: CreateVoiceSessionRequest,
    db: Session = Depends(get_db)
):
    """
    Creates an OpenAI Realtime WebRTC ephemeral session.
    TASK B changes: strict schema, no tools in session, model fallback list,
    per-IP rate limiting, 502 on empty secret, sanitised errors.
    """
    # Rate limiting (TASK B.5)
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Too many session requests. Please wait and try again.")

    # TASK B.5: auth hook – origin allowlist (permissive by default, lockable via env)
    allowed_origins_env = os.environ.get("VOICE_ALLOWED_ORIGINS", "")
    if allowed_origins_env:
        origin = request.headers.get("origin", "")
        allowed = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
        if allowed and origin not in allowed:
            raise HTTPException(status_code=403, detail="Origin not allowed.")

    # TASK A: require project_id; 404 if missing
    if not payload.project_id:
        raise HTTPException(status_code=422, detail="project_id is required.")

    project = db.query(CollegeWebSearchProjectDB).filter(
        CollegeWebSearchProjectDB.id == payload.project_id
    ).first()
    if not project:
        raise HTTPException(
            status_code=404,
            detail=f"College project '{payload.project_id}' not found. Please create it first via POST /api/web-search/projects."
        )

    raw_college_name = project.college_name or "College"
    if raw_college_name.startswith("http://") or raw_college_name.startswith("https://") or "/" in raw_college_name:
        college_name = project.base_domain or raw_college_name.replace("https://", "").replace("http://", "").strip("/")
    else:
        college_name = raw_college_name
    base_domain = project.base_domain

    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="Voice service is temporarily unavailable.")

    # TASK B: VAD / turn detection
    if payload.mode == "push_to_talk":
        turn_detection_config = None
    else:
        turn_detection_config = {
            "type": "server_vad",
            "threshold": payload.vad_threshold,
            "prefix_padding_ms": 300,
            "silence_duration_ms": payload.silence_duration_ms,
            "create_response": False,   # TASK B: create_response=false; /turn handles logic
            "interrupt_response": payload.barge_in
        }

    # TASK B: transcription – whisper-1 with language hint & college context prompt
    whisper_lang = "hi" if payload.language == "hi" else "en"
    transcription_prompt = (
        f"{college_name}, Poornima University, Jaipur, B.Tech, BTech, M.Tech, BCA, MCA, MBA, "
        f"CSE, AI, Data Science, Mechanical, Civil, Electrical, hostel fees, mess, tuition fee, "
        f"admission, eligibility, scholarship, REAP, JEE, CUET"
    )
    transcription_config = {
        "model": TRANSCRIPTION_MODEL,
        "language": whisper_lang,
        "prompt": transcription_prompt,
    }

    # TASK A: build keywords from project data
    kw = _build_keywords(college_name, base_domain)

    base_session = {
        "session": {
            "type": "realtime",
            "instructions": VOICE_ONLY_INSTRUCTIONS,
            "output_modalities": ["audio"],
            "audio": {
                "input": {
                    "transcription": transcription_config,
                    "noise_reduction": {"type": payload.mic_profile},
                    "turn_detection": turn_detection_config
                },
                "output": {
                    "voice": payload.voice,
                    "speed": 1.0
                }
            },
            # TASK B: no tools in session – /turn handles search
        }
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        for idx, model in enumerate(REALTIME_MODEL_FALLBACK):
            attempt = copy.deepcopy(base_session)
            attempt["session"]["model"] = model

            try:
                resp = await client.post(
                    "https://api.openai.com/v1/realtime/client_secrets",
                    headers=headers,
                    json=attempt
                )
            except httpx.RequestError as e:
                raise HTTPException(status_code=502, detail="Could not reach voice service. Please try again.")

            if resp.status_code == 200:
                data = resp.json()
                ephemeral_val = (
                    data.get("value")
                    or data.get("client_secret", {}).get("value", "")
                )
                # TASK B.5: 502 if empty secret
                if not ephemeral_val:
                    print(f"[VoiceSession] Empty ephemeral secret from OpenAI. Response: {data}")
                    raise HTTPException(status_code=502, detail="Voice service returned an invalid token. Please try again.")

                sess_id = data.get("session", {}).get("id") or data.get("id", "")
                return VoiceSessionResponse(
                    client_secret={"value": ephemeral_val, "expires_at": data.get("expires_at")},
                    session_id=sess_id,
                    project_id=payload.project_id,
                    college_name=college_name,
                    base_domain=base_domain
                )

            # TASK B: retry ONLY on 4xx param errors, not on 401/429/5xx
            status = resp.status_code
            err_text = resp.text
            print(f"[VoiceSession] Attempt {idx+1} model={model} status={status}: {err_text[:200]}")

            if status in (401, 429) or status >= 500:
                # Never retry auth/rate/server errors
                raise HTTPException(status_code=502, detail="Voice service temporarily unavailable.")

            if idx == len(REALTIME_MODEL_FALLBACK) - 1:
                # Last model in fallback – give up
                raise HTTPException(status_code=502, detail="Voice service could not start a session. Please try again later.")
            # else: loop to next model (400-class param error)

    raise HTTPException(status_code=502, detail="Voice service could not start a session.")


# ---------------------------------------------------------------------------
# Candidate Transcription Session: /transcription-session
# [COMMENTED OUT: Web Speech API is baseline STT in UI]
# ---------------------------------------------------------------------------
# @router.post("/transcription-session", response_model=TranscriptionSessionResponse)
# async def create_dedicated_transcription_session(
#     request: Request,
#     payload: CreateTranscriptionSessionRequest,
#     db: Session = Depends(get_db)
# ):
#     ...


# ---------------------------------------------------------------------------
# TASK C: new /turn endpoint
# ---------------------------------------------------------------------------
@router.post("/turn", response_model=VoiceTurnResponse)
async def voice_turn(
    payload: VoiceTurnRequest,
    db: Session = Depends(get_db)
):
    """
    TASK C: Main voice turn handler.
    1. Gate (voice_gate.py) – silent/off-topic checks.
    2. Detect language.
    3. Call generate_college_web_search_answer.
    4. Build spoken_summary.
    5. Return structured response.
    """
    import time as _time
    t0 = _time.monotonic()

    # Import gate and summary helpers
    from app.services.web_search.voice_gate import gate_transcript
    from app.services.web_search.voice_summary import build_spoken_summary
    from app.models.schemas import ChatMessage

    transcript = (payload.transcript or "").strip()
    project_id = payload.project_id
    if not project_id:
        raise HTTPException(status_code=422, detail="project_id is required.")

    if not transcript:
        return VoiceTurnResponse(
            should_respond=False,
            reason="empty_transcript",
            found=False,
            intent="empty",
            language=payload.language_hint or "en-IN",
            display_markdown="",
            spoken_summary="",
            sources=[],
            timings_ms={"total_ms": 0.0}
        )

    # Verify project exists
    project = db.query(CollegeWebSearchProjectDB).filter(
        CollegeWebSearchProjectDB.id == project_id
    ).first()
    if not project:
        raise HTTPException(
            status_code=404,
            detail=f"College project '{project_id}' not found."
        )

    raw_college_name = project.college_name or "College"
    if raw_college_name.startswith("http://") or raw_college_name.startswith("https://") or "/" in raw_college_name:
        college_name = project.base_domain or raw_college_name.replace("https://", "").replace("http://", "").strip("/")
    else:
        college_name = raw_college_name
    base_domain = project.base_domain
    language_hint = payload.language_hint or "en-IN"
    history_dicts = [
        {"role": h.role, "content": h.content}
        for h in (payload.history or [])
        if h.role in ("user", "assistant") and h.content.strip()
    ][-6:]

    t_gate_start = _time.monotonic()
    gate_result = await gate_transcript(
        transcript=transcript,
        college_name=college_name,
        base_domain=base_domain,
        history=history_dicts,
        language=language_hint
    )
    t_gate = (_time.monotonic() - t_gate_start) * 1000

    # Gate says silent
    if not gate_result["should_respond"]:
        return VoiceTurnResponse(
            should_respond=False,
            reason=gate_result["reason"],
            found=False,
            intent=gate_result.get("intent", "chatter"),
            language=language_hint,
            display_markdown="",
            spoken_summary="",
            sources=[],
            timings_ms={"gate_ms": round(t_gate, 1), "total_ms": round((_time.monotonic() - t0) * 1000, 1)}
        )

    # Greeting / off-topic refusals
    if gate_result["intent"] in ("greeting", "off_topic"):
        return VoiceTurnResponse(
            should_respond=True,
            reason=gate_result["reason"],
            found=True,
            intent=gate_result["intent"],
            language=language_hint,
            display_markdown=gate_result.get("reply_text", ""),
            spoken_summary=gate_result.get("reply_text", ""),
            sources=[],
            timings_ms={"gate_ms": round(t_gate, 1), "total_ms": round((_time.monotonic() - t0) * 1000, 1)}
        )

    # Build history as ChatMessage list
    history_msgs = [ChatMessage(role=h["role"], content=h["content"]) for h in history_dicts]

    t_search_start = _time.monotonic()
    try:
        chat_res = await generate_college_web_search_answer(
            project_id=project_id,
            user_message=transcript,
            history=history_msgs,
            include_debug=False,
            db=db,
            voice_mode=True
        )
    except Exception as e:
        print(f"[VoiceTurn] Search error: {e}")
        return VoiceTurnResponse(
            should_respond=True,
            reason="search_error",
            found=False,
            intent="general",
            language=language_hint,
            display_markdown=f"I'm sorry, I couldn't find that information right now. Please contact {college_name} directly.",
            spoken_summary=f"I'm sorry, I couldn't find that information right now.",
            sources=[],
            timings_ms={"total_ms": round((_time.monotonic() - t0) * 1000, 1)}
        )
    t_search = (_time.monotonic() - t_search_start) * 1000

    detected_intent = (chat_res.detected_intent or "general").lower()
    found = len(chat_res.sources or []) > 0

    spoken = getattr(chat_res, "spoken_summary", None)
    if not spoken:
        spoken = build_spoken_summary(
            intent=detected_intent,
            college_name=college_name,
            language=language_hint,
            answer_markdown=chat_res.answer
        )

    sources_out = [
        VoiceSourceOut(
            title=s.title or f"{college_name} Official Page",
            url=s.url,
            category=getattr(s, "category", "General")
        )
        for s in (chat_res.sources or [])
    ]

    total_ms = (_time.monotonic() - t0) * 1000
    return VoiceTurnResponse(
        should_respond=True,
        reason="college_query",
        found=found,
        intent=detected_intent,
        language=language_hint,
        display_markdown=chat_res.answer,
        spoken_summary=spoken,
        sources=sources_out,
        timings_ms={
            "gate_ms": round(t_gate, 1),
            "search_ms": round(t_search, 1),
            "total_ms": round(total_ms, 1)
        }
    )


# ---------------------------------------------------------------------------
# TASK C: /search-tool kept as thin deprecated wrapper
# ---------------------------------------------------------------------------
@router.post("/search-tool", response_model=VoiceSearchToolResponse)
async def execute_voice_search_tool(
    payload: VoiceSearchToolRequest,
    db: Session = Depends(get_db)
):
    """
    Deprecated: use POST /turn instead.
    Thin wrapper that calls generate_college_web_search_answer.
    """
    from app.services.web_search.voice_summary import build_spoken_summary

    project_id = payload.project_id
    if not project_id:
        raise HTTPException(status_code=422, detail="project_id is required.")

    project = db.query(CollegeWebSearchProjectDB).filter(
        CollegeWebSearchProjectDB.id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

    language = payload.language or "en-IN"
    query = payload.query.strip()

    chat_res = await generate_college_web_search_answer(
        project_id=project_id,
        user_message=query,
        history=[],
        include_debug=False,
        db=db,
        voice_mode=True
    )

    sources_list: List[VoiceSourceItem] = []
    for s in (chat_res.sources or []):
        sources_list.append(VoiceSourceItem(
            title=s.title or f"{chat_res.college_name} Official Page",
            url=s.url,
            score=1.0,
            category=getattr(s, "category", "General")
        ))

    intent = (chat_res.detected_intent or "general").lower()
    spoken_summary = getattr(chat_res, "spoken_summary", None)
    if not spoken_summary:
        spoken_summary = build_spoken_summary(
            intent=intent,
            college_name=chat_res.college_name,
            language=language,
            answer_markdown=chat_res.answer
        )

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
