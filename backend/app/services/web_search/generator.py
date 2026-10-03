import time
import hashlib
import json
import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.schemas import (
    CitationSchema, WebSearchDebugTrace, WebSearchChatResponse,
    CollegeChatResponse, CollegeWebSearchProjectDB,
    CollegeWebSearchCacheDB, WebSearchCacheDB, WebSearchConfigDB, ChatMessage
)
from app.services.llm.provider import get_llm_provider
from app.services.web_search.search_engine import select_and_fetch_college_sources


def build_dynamic_college_prompt(college_name: str, base_domain: str, override_prompt: Optional[str] = None) -> str:
    """Builds a customized, domain-restricted system prompt for any college/university."""
    if override_prompt:
        return override_prompt

    return f"""You are the official AI web search assistant for {college_name} (official website: {base_domain}).

You answer user inquiries accurately using ONLY the live official {college_name} website pages and tables provided in the context.

CRITICAL DOMAIN RULES:
1. STRICT DOMAIN GROUNDING: You MUST base all answers solely on the provided official {base_domain} pages and tables. Never guess or hallucinate unverified numbers or criteria.
2. Thoroughly inspect all provided website context, including [TABLE START] ... [TABLE END] matrices, fee structures, tuition fees, semester breakdowns, caution money, registration fees, quota percentages, and helpline contact info.
3. If the user asks about fees, provide a clear semester-wise and category-wise fee breakdown (e.g. Tuition Fee, Development Fee, Caution Money, Total Amount, TFWS fees) exactly as shown in the tables.
4. If the user asks about admissions or courses, list the branches, eligibility criteria, and important dates from the context.
5. Structure your response with clean headings, simple bullet points, and tables. Avoid wrapping words in asterisks (**) unnecessarily; write clean, readable plain text.
6. OFF-DOMAIN INQUIRIES: If the user asks about an unrelated entity (e.g. other companies, general knowledge, other colleges), politely decline and state that you can only provide verified data from official {base_domain}.
7. ABSENT INFORMATION: If the queried topic is genuinely and completely absent from the provided official domain pages, explicitly state that this specific detail is not available on {base_domain} and provide the official contact number found in the context.
8. Be direct, authoritative, clean, and helpful."""


async def generate_college_web_search_answer(
    project_id: str,
    user_message: str,
    history: Optional[List[ChatMessage]] = None,
    include_debug: bool = True,
    db: Optional[Session] = None,
    system_prompt_override: Optional[str] = None
) -> CollegeChatResponse:
    """
    Generic Multi-College Live Web Search Execution Pipeline:
    1. Check 10-minute cache for this project and query.
    2. Intent routing & OpenAI dynamic URL selection from project's approved sitemap sources.
    3. Live web fetch of 1-5 selected URLs.
    4. Grounded answer synthesis with OpenAI using dynamic college persona.
    5. Return structured answer + verified clickable source links + debug trace.
    """
    start_time = time.time()
    history = history or []
    history_dicts = [{"role": m.role, "content": m.content} for m in history]

    project = None
    if db:
        project = db.query(CollegeWebSearchProjectDB).filter(CollegeWebSearchProjectDB.id == project_id).first()

    college_name = project.college_name if project else "College / University"
    base_domain = project.base_domain if project else "poornima.org"
    max_sources = max(project.max_sources_per_query if project else 5, 5)
    cache_ttl = project.cache_ttl_seconds if project else 600

    # 1. Check Short-Term Query Cache (10 mins TTL) - bypass if old refusal cache
    clean_query = user_message.strip()
    query_hash = hashlib.md5(f"{project_id}_{clean_query.lower()}_{len(history)}".encode("utf-8")).hexdigest()
    now = datetime.datetime.utcnow()

    if db and not history:
        cached = db.query(CollegeWebSearchCacheDB).filter(
            CollegeWebSearchCacheDB.id == query_hash,
            CollegeWebSearchCacheDB.expires_at > now
        ).first()

        # Only use cache if it was an informative answer, not a fallback refusal
        if cached and "couldn't find that specific information" not in (cached.answer or "").lower():
            citations = [CitationSchema(**c) for c in (cached.citations or [])]
            debug_trace = None
            if include_debug and cached.debug_trace:
                cached.debug_trace["cache_hit"] = True
                cached.debug_trace["processing_time_ms"] = round((time.time() - start_time) * 1000, 2)
                debug_trace = WebSearchDebugTrace(**cached.debug_trace)

            return CollegeChatResponse(
                project_id=project_id,
                college_name=college_name,
                answer=cached.answer,
                sources_used_count=len(citations),
                sources=citations,
                is_live_searched=True,
                detected_intent=cached.detected_intent,
                debug_trace=debug_trace
            )

    # 2. Select & Live Fetch 1-3 Approved Sources for this Project
    candidates, selected_sources, intent_info, ai_reason, resolved_college = await select_and_fetch_college_sources(
        project_id=project_id,
        user_message=user_message,
        history=history_dicts,
        db=db,
        max_sources=max_sources
    )

    detected_intent = intent_info.get("intent", "general")
    search_query = intent_info.get("search_query", "")

    # Handle Off-Topic Query
    if intent_info.get("is_off_topic"):
        answer = (
            f"I am the official AI web assistant for **{college_name}** ({base_domain}).\n\n"
            f"I can only answer questions related to {college_name} (such as programs, courses, admissions, eligibility, fees, hostels, campus life, and placements).\n\n"
            f"Please ask a question about {college_name}!"
        )
        debug_trace = WebSearchDebugTrace(
            user_query=user_message,
            detected_intent="off_topic",
            optimized_search_query="",
            sources_returned=[],
            selected_sources=[],
            ai_link_selection_reason=f"Query outside {college_name} domain; polite refusal triggered.",
            cache_hit=False,
            processing_time_ms=round((time.time() - start_time) * 1000, 2)
        )
        return CollegeChatResponse(
            project_id=project_id,
            college_name=college_name,
            answer=answer,
            sources_used_count=0,
            sources=[],
            is_live_searched=False,
            detected_intent="off_topic",
            debug_trace=debug_trace
        )

    # Handle Greeting
    if intent_info.get("is_greeting"):
        if system_prompt_override:
            answer = (
                f"👋 **Hello! Welcome to {college_name} Admissions (2026-27).**\n\n"
                f"Which course or programme are you interested in (e.g., B.Tech CSE, MBA, BCA, B.Des, MCA)?\n\n"
                f"💡 *Tip: Feel free to share your **Name** and **Mobile Number** so I can send the official 2026 fee structure, scholarship calculator, and brochure directly to your WhatsApp!*"
            )
        else:
            answer = (
                f"👋 **Hello! Welcome to {college_name} Live Web Assistant.**\n\n"
                f"I am dynamically connected to the official website (`{base_domain}`) with live sitemap search enabled. You can ask me about:\n"
                f"- 🎓 **Courses & Academic Programs**\n"
                f"- 🏛️ **Admission Procedure & Eligibility**\n"
                f"- 💰 **Fee Structure & Scholarships**\n"
                f"- 💼 **Campus Placements, Highest Packages & Recruiters**\n"
                f"- 🛏️ **Hostels, Mess & Campus Facilities**\n\n"
                f"What would you like to know about {college_name}?"
            )
        citations = []
        if selected_sources:
            citations = [
                CitationSchema(
                    url=s.get("url"),
                    title=s.get("title") or f"{college_name} Official Page",
                    snippet=f"Official {college_name} page from sitemap inventory.",
                    source_type="REAL_WEBSITE"
                ) for s in selected_sources[:2]
            ]
        else:
            citations = [
                CitationSchema(
                    url=f"https://{base_domain}/",
                    title=f"{college_name} - Official Website",
                    snippet=f"Official website home for {college_name}.",
                    source_type="REAL_WEBSITE"
                )
            ]

        debug_trace = WebSearchDebugTrace(
            user_query=user_message,
            detected_intent="greeting",
            optimized_search_query=search_query,
            sources_returned=[{"url": c.url, "title": c.title, "score": 1.0} for c in citations],
            selected_sources=[{"url": c.url, "title": c.title, "score": 1.0} for c in citations],
            ai_link_selection_reason="Standard welcome greeting response.",
            cache_hit=False,
            processing_time_ms=round((time.time() - start_time) * 1000, 2)
        )
        return CollegeChatResponse(
            project_id=project_id,
            college_name=college_name,
            answer=answer,
            sources_used_count=len(citations),
            sources=citations,
            is_live_searched=True,
            detected_intent="greeting",
            debug_trace=debug_trace
        )

    # 3. Build Grounded Context from Fetched Pages
    context_blocks = []
    citations_list = []

    for s in selected_sources:
        content_text = s.get("content", "")
        context_blocks.append(
            f"SOURCE TITLE: {s.get('title')}\nOFFICIAL URL: {s.get('url')}\nTYPE: {s.get('source_type', 'HTML')}\nCONTENT:\n{content_text}"
        )
        citations_list.append(CitationSchema(
            url=s.get("url"),
            title=s.get("title") or f"{college_name} Official Page",
            snippet=content_text[:220].replace("\n", " ") + "...",
            source_type="REAL_WEBSITE"
        ))

    context_str = "\n\n====================\n\n".join(context_blocks)

    history_context = ""
    if history:
        history_lines = []
        for h in history[-8:]:
            role_label = "Student" if h.role == "user" else "Admission Assistant"
            history_lines.append(f"{role_label}: {h.content}")
        history_context = "PREVIOUS CONVERSATION HISTORY:\n" + "\n".join(history_lines) + "\n\n"

    prompt = f"""LIVE SEARCHED {college_name.upper()} OFFICIAL WEBSITE CONTEXT ({base_domain}):
{context_str}

{history_context}CURRENT USER MESSAGE:
{user_message}

CRITICAL INSTRUCTION:
Answer the current user message accurately (2-4 sentences) using the official website context.
DO NOT repeat questions for information (e.g. 12th marks, branch, phone number) that the student has already provided in previous turns!"""

    # 4. Generate Answer via LLM Provider
    llm_provider = get_llm_provider()
    effective_override = system_prompt_override or (project.system_prompt_override if project else None)
    system_prompt = build_dynamic_college_prompt(
        college_name=college_name,
        base_domain=base_domain,
        override_prompt=effective_override
    )

    answer = await llm_provider.generate_response(prompt=prompt, system_instruction=system_prompt)
    answer = answer.strip()

    # 5. Build Debug Trace
    proc_time = round((time.time() - start_time) * 1000, 2)
    debug_trace = None
    if include_debug:
        debug_trace = WebSearchDebugTrace(
            user_query=user_message,
            detected_intent=detected_intent,
            optimized_search_query=search_query,
            sources_returned=candidates,
            selected_sources=[{
                "url": s.get("url"),
                "title": s.get("title"),
                "score": s.get("score"),
                "status": s.get("fetch_status")
            } for s in selected_sources],
            ai_link_selection_reason=ai_reason,
            cache_hit=False,
            processing_time_ms=proc_time
        )

    # 6. Save to 10-Minute Cache
    if db and not history and citations_list:
        try:
            expires_at = now + datetime.timedelta(seconds=cache_ttl)
            cache_entry = CollegeWebSearchCacheDB(
                id=query_hash,
                project_id=project_id,
                query=clean_query,
                detected_intent=detected_intent,
                search_query=search_query,
                selected_source_ids=[s.get("url") for s in selected_sources],
                answer=answer,
                citations=[c.dict() for c in citations_list],
                debug_trace=debug_trace.dict() if debug_trace else {},
                created_at=now,
                expires_at=expires_at
            )
            db.merge(cache_entry)
            db.commit()
        except Exception as e:
            print(f"[CollegeWebSearchCache] Cache save error: {e}")

    return CollegeChatResponse(
        project_id=project_id,
        college_name=college_name,
        answer=answer,
        sources_used_count=len(citations_list),
        sources=citations_list,
        is_live_searched=True,
        detected_intent=detected_intent,
        debug_trace=debug_trace
    )


async def generate_poornima_web_search_answer(
    user_message: str,
    history: Optional[List[ChatMessage]] = None,
    include_debug: bool = True,
    db: Optional[Session] = None
) -> WebSearchChatResponse:
    """Backward-compatible wrapper for default Poornima project."""
    res = await generate_college_web_search_answer(
        project_id="proj_poornima",
        user_message=user_message,
        history=history,
        include_debug=include_debug,
        db=db
    )
    return WebSearchChatResponse(
        answer=res.answer,
        sources_used_count=res.sources_used_count,
        sources=res.sources,
        is_live_searched=res.is_live_searched,
        detected_intent=res.detected_intent,
        debug_trace=res.debug_trace
    )
