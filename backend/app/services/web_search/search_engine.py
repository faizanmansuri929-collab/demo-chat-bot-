import re
import json
import asyncio
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.schemas import (
    CollegeWebSearchProjectDB, CollegeWebSourceDB,
    WebSearchSourceDB, WebSearchConfigDB
)
from app.services.web_search.intent_router import classify_college_intent, classify_poornima_intent
from app.services.web_search.fetcher import fetch_college_page, fetch_poornima_page
from app.services.web_search.allowlist import is_allowed_domain_url
from app.services.llm.provider import get_llm_provider


async def select_and_fetch_college_sources(
    project_id: str,
    user_message: str,
    history: Optional[List[Dict[str, str]]] = None,
    db: Optional[Session] = None,
    max_sources: int = 5,
    voice_mode: bool = False
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any], str, str]:
    """
    Generic Multi-College Live Web Search Decision Engine:
    1. Loads college project metadata (name, base domain) and approved sources.
    2. Understands user query & detects college intent dynamically.
    3. Uses AI Decision + Allowlist Scoring across expanded candidate pool.
    4. Performs live web fetch on all selected URLs (up to 5-6 pages).
    5. Returns (candidates, selected_with_content, intent_info, ai_reason, college_name).
    """
    history = history or []
    
    # Load project
    project = None
    if db:
        project = db.query(CollegeWebSearchProjectDB).filter(CollegeWebSearchProjectDB.id == project_id).first()
    
    if not project:
        if project_id in ["proj_poornima", "poornima_config", "poornima"]:
            college_name = "Poornima University & Colleges"
            base_domain = "poornima.org"
        else:
            intent_info = {"intent": "general", "search_query": "", "is_greeting": False, "is_off_topic": False, "target_categories": []}
            return [], [], intent_info, f"College project '{project_id}' not found.", ""
    else:
        college_name = project.college_name
        base_domain = project.base_domain
    
    # Both Live Chat and Voice Feature dynamically select 3 to 5 URLs from sitemap
    effective_max = max(3, min(max_sources if max_sources is not None else 5, 5))
    
    intent_info = classify_college_intent(user_message, college_name=college_name, base_domain=base_domain, history=history)
    
    # Check off-topic
    if intent_info.get("is_off_topic"):
        if college_name.lower() in user_message.lower() or base_domain.lower() in user_message.lower():
            intent_info["is_off_topic"] = False
        else:
            return [], [], intent_info, f"Query classified as off-topic (outside {college_name} domain).", college_name

    # 1. Fetch active approved sources for this project from database
    active_sources = []
    if db:
        active_sources = db.query(CollegeWebSourceDB).filter(
            CollegeWebSourceDB.project_id == project_id,
            CollegeWebSourceDB.is_enabled == 1
        ).all()
        
        # Fallback to legacy table ONLY if project is poornima and no generic sources
        if not active_sources and project_id in ["proj_poornima", "poornima_config", "poornima"]:
            legacy_sources = db.query(WebSearchSourceDB).filter(WebSearchSourceDB.is_enabled == 1).all()
            active_sources = legacy_sources

    if not active_sources:
        return [], [], intent_info, f"No active approved sources found for project '{project_id}'.", college_name

    # 2. Score and rank candidates based on query tokens & intent
    query_lower = user_message.lower()
    query_tokens = set(re.findall(r'\b\w+\b', query_lower))
    target_categories = set(intent_info.get("target_categories", []))

    scored_candidates = []
    for src in active_sources:
        url_lower = src.url.lower()
        title_lower = (src.title or "").lower()
        snippet_lower = (src.content_snippet or "").lower()

        score = 0.0

        # Category match
        if src.category in target_categories:
            score += 3.0

        # Title keyword match
        title_tokens = set(re.findall(r'\b\w+\b', title_lower))
        overlap = query_tokens.intersection(title_tokens)
        score += len(overlap) * 3.5

        # URL slug match
        url_clean = re.sub(r'https?://(www\.)?[^/]+/', '', url_lower)
        url_tokens = set(re.findall(r'\b\w+\b', url_clean))
        url_overlap = query_tokens.intersection(url_tokens)
        score += len(url_overlap) * 4.0

        # Snippet/keywords overlap
        snippet_tokens = set(re.findall(r'\b\w+\b', snippet_lower))
        snip_overlap = query_tokens.intersection(snippet_tokens)
        score += len(snip_overlap) * 1.5

        # --- Strong Specific Keyword & Intent Boosters ---
        # 1. Fees & Scholarships
        if any(k in query_lower for k in ["fee", "fees", "cost", "tuition", "scholarship", "charge", "payment", "account"]):
            if any(k in url_lower or k in title_lower for k in ["fee", "fees", "tuition", "scholarship", "accounts", "payment", "fee-structure"]):
                score += 14.0
            if "btech" in query_lower and any(k in url_lower or k in title_lower for k in ["b-tech", "btech", "admission", "first-year", "1st-year"]):
                score += 8.0

        # 2. Admissions & Eligibility
        if any(k in query_lower for k in ["admission", "apply", "eligibility", "reap", "cutoff", "criteria", "seat", "intake"]):
            if any(k in url_lower or k in title_lower for k in ["admission", "apply", "eligibility", "reap", "seat", "intake", "process"]):
                score += 12.0

        # 3. Courses & Branches
        if any(k in query_lower for k in ["btech", "b.tech", "course", "program", "branch", "specialization", "department", "engineering", "mtech", "mba", "bba", "bca"]):
            if any(k in url_lower or k in title_lower for k in ["course", "btech", "b-tech", "department", "academic", "program", "specialization"]):
                score += 8.0
            for branch in ["computer", "cse", "ai", "artificial", "data", "cyber", "electrical", "civil", "mechanical", "it", "electronics", "ece"]:
                if branch in query_lower and (branch in url_lower or branch in title_lower):
                    score += 10.0

        # 4. Placements & Recruiters
        if any(k in query_lower for k in ["placement", "package", "salary", "recruiter", "company", "tpo", "internship"]):
            if any(k in url_lower or k in title_lower for k in ["placement", "recruiter", "career", "salary", "package", "tpo", "highest-package"]):
                score += 12.0

        # 5. Hostels & Mess
        if any(k in query_lower for k in ["hostel", "mess", "dining", "room", "accommodation", "residence"]):
            if any(k in url_lower or k in title_lower for k in ["hostel", "mess", "dining", "room", "accommodation", "residence", "campus-life"]):
                score += 12.0

        # 6. Faculty & Contact
        if any(k in query_lower for k in ["faculty", "professor", "teacher", "hod", "director", "contact", "phone", "email", "address"]):
            if any(k in url_lower or k in title_lower for k in ["faculty", "staff", "contact", "about", "leadership", "reach-us"]):
                score += 10.0

        if score > 0 or src.category in target_categories:
            scored_candidates.append({
                "id": src.id,
                "url": src.url,
                "title": src.title or src.url,
                "category": src.category,
                "source_type": getattr(src, "source_type", "HTML"),
                "score": round(score, 2),
                "snippet": src.content_snippet or ""
            })

    # Sort descending by score
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    # Give OpenAI an expanded pool of up to 18-20 candidates
    top_candidates = scored_candidates[:20]

    if not top_candidates:
        top_candidates = [
            {"id": s.id, "url": s.url, "title": s.title, "category": s.category, "source_type": getattr(s, "source_type", "HTML"), "score": 1.0, "snippet": ""}
            for s in active_sources[:5]
        ]

    # 3. OpenAI Dynamic Link Selection (Select 3 to 5 best pages from sitemap)
    selected_sources = []
    ai_reason = "Selected based on highest relevance score and intent alignment."

    llm_provider = get_llm_provider()
    if hasattr(llm_provider, "primary_provider") and llm_provider.primary_provider and len(top_candidates) > 1:
        candidates_listing = "\n".join([
            f"- [{idx+1}] URL: {c['url']} | Title: {c['title']} | Category: {c['category']} | Type: {c.get('source_type', 'HTML')}"
            for idx, c in enumerate(top_candidates[:18])
        ])
        
        target_count = min(effective_max, len(top_candidates))
        min_target = min(3, target_count)
        selection_prompt = f"""You are the official URL selector for {college_name} Web Search ({base_domain}).
User Question: "{user_message}"
Detected Intent: {intent_info['intent']}

Here are top candidate official URLs from the {college_name} sitemap inventory:
{candidates_listing}

Task:
Decide which official URLs from the list above are MOST RELEVANT to answer the user's inquiry thoroughly.
Select between {min_target} to {target_count} URLs.
Pick complementary official pages (for example: main course/program page, fee structure, admission criteria, hostel facilities) to ensure complete factual coverage without omitting details.

Output strictly valid JSON with this exact format:
{{"selected_indexes": [1, 2, 3], "reason": "brief explanation for choosing these pages"}}"""

        try:
            llm_decision_raw = await llm_provider.generate_response(selection_prompt, system_instruction="You are a strict URL selection analyzer. Output JSON only.")
            clean_json = re.search(r'\{.*\}', llm_decision_raw, re.DOTALL)
            if clean_json:
                data = json.loads(clean_json.group(0))
                indexes = data.get("selected_indexes", [])
                ai_reason = data.get("reason", ai_reason)
                for idx in indexes:
                    if isinstance(idx, int) and 1 <= idx <= len(top_candidates):
                        cand = top_candidates[idx-1]
                        if cand not in selected_sources:
                            selected_sources.append(cand)
        except Exception as e:
            print(f"[SearchEngine] LLM URL selection fallback: {e}")

    # Ensure 3 to 5 URLs are selected whenever enough candidate URLs exist
    desired_count = min(effective_max, len(top_candidates))
    for cand in top_candidates:
        if len(selected_sources) >= desired_count:
            break
        if cand not in selected_sources:
            selected_sources.append(cand)

    # Enforce effective_max slice
    if selected_sources:
        selected_sources = selected_sources[:effective_max]

    # If LLM didn't select or fallback
    if not selected_sources:
        num_to_pick = min(effective_max, len(top_candidates))
        selected_sources = top_candidates[:max(1, min(num_to_pick, effective_max))]

    # 4. Perform Live Web Search / Content Fetch on all selected URLs in parallel
    fetch_tasks = [
        fetch_college_page(s["url"], db=db, project_id=project_id, base_domain=base_domain)
        for s in selected_sources
    ]
    fetched_results = await asyncio.gather(*fetch_tasks)

    # Attach fetched live content
    selected_sources_with_content = []
    for s, f in zip(selected_sources, fetched_results):
        raw_content = f.get("content", "")
        if voice_mode and len(raw_content) > 8000:
            raw_content = raw_content[:8000]
        selected_sources_with_content.append({
            "id": s["id"],
            "url": s["url"],
            "title": f.get("title") or s["title"],
            "category": s.get("category", "General"),
            "source_type": s.get("source_type", "HTML"),
            "score": s.get("score", 1.0),
            "content": raw_content,
            "fetch_status": f.get("status", "FETCHED")
        })

    return top_candidates, selected_sources_with_content, intent_info, ai_reason, college_name


async def select_and_fetch_poornima_sources(
    user_message: str,
    history: Optional[List[Dict[str, str]]] = None,
    db: Optional[Session] = None,
    max_sources: int = 5
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any], str]:
    """Backward-compatible wrapper for default Poornima project."""
    cands, selected, info, reason, _ = await select_and_fetch_college_sources(
        project_id="proj_poornima",
        user_message=user_message,
        history=history,
        db=db,
        max_sources=max_sources
    )
    return cands, selected, info, reason
