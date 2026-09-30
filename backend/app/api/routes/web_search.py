import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.schemas import (
    CollegeWebSearchProjectDB, CollegeWebSourceDB,
    CreateCollegeProjectRequest, CollegeProjectResponse,
    CollegeSourceSchema, CollegeSourceUpdate, RebuildSourcesResponse,
    CollegeChatRequest, CollegeChatResponse,
    WebSearchChatRequest, WebSearchChatResponse,
    WebSearchSourceSchema, WebSearchSourceCreate, WebSearchSourceUpdate,
    WebSearchConfigSchema, WebSearchConfigUpdate,
    WebSearchTestRequest, WebSearchTestResponse
)
from app.services.web_search.allowlist import (
    seed_poornima_allowlist, is_allowed_domain_url
)
from app.services.web_search.sitemap_parser import (
    ingest_college_sitemap_project, rebuild_college_project_sources,
    extract_base_domain
)
from app.services.web_search.generator import (
    generate_college_web_search_answer, generate_poornima_web_search_answer
)
from app.services.web_search.search_engine import select_and_fetch_college_sources

router = APIRouter(prefix="/web-search", tags=["College Web Search"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Generic Multi-College Project Endpoints ---

@router.post("/projects", response_model=CollegeProjectResponse)
async def create_college_project(
    payload: CreateCollegeProjectRequest,
    db: Session = Depends(get_db)
):
    """
    Creates a new College Web Search Project from a Sitemap URL:
    1. Validates and parses sitemap.xml (supports sitemap indexes & child XMLs).
    2. Discovers all valid HTML/PDF URLs.
    3. Saves approved source inventory in database.
    """
    sitemap_url = payload.sitemap_url.strip()
    domain = extract_base_domain(sitemap_url)
    if not domain:
        raise HTTPException(status_code=400, detail="Invalid sitemap URL: Could not resolve base domain.")

    college_name = (payload.college_name or domain.split(".")[0].capitalize() + " University").strip()
    project_id = f"proj_{uuid.uuid4().hex[:8]}"

    try:
        project = await ingest_college_sitemap_project(
            project_id=project_id,
            college_name=college_name,
            sitemap_url=sitemap_url,
            db=db,
            max_sources=payload.max_sources_per_query or 3,
            institute_type=payload.institute_type or "college"
        )
        return project
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process sitemap: {str(e)}")


@router.get("/projects", response_model=List[CollegeProjectResponse])
def list_college_projects(db: Session = Depends(get_db)):
    """Lists all created College Web Search projects."""
    seed_poornima_allowlist(db)
    projects = db.query(CollegeWebSearchProjectDB).order_by(CollegeWebSearchProjectDB.created_at.desc()).all()
    return projects


@router.get("/projects/{project_id}", response_model=CollegeProjectResponse)
def get_college_project(project_id: str, db: Session = Depends(get_db)):
    """Gets details and source statistics for a specific college project."""
    seed_poornima_allowlist(db)
    project = db.query(CollegeWebSearchProjectDB).filter(CollegeWebSearchProjectDB.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="College project not found.")
    return project


@router.post("/projects/{project_id}/rebuild", response_model=RebuildSourcesResponse)
async def rebuild_project_sources(project_id: str, db: Session = Depends(get_db)):
    """
    Manually re-reads the sitemap, diffs URLs, adds new pages, and updates the approved source list.
    """
    seed_poornima_allowlist(db)
    try:
        res = await rebuild_college_project_sources(project_id, db)
        return RebuildSourcesResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rebuild sources: {str(e)}")


@router.get("/projects/{project_id}/sources", response_model=List[CollegeSourceSchema])
def list_project_sources(
    project_id: str,
    category: Optional[str] = None,
    search: Optional[str] = None,
    source_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists all approved URLs for a specific college project with filtering."""
    seed_poornima_allowlist(db)
    query = db.query(CollegeWebSourceDB).filter(CollegeWebSourceDB.project_id == project_id)

    if category and category != "All":
        query = query.filter(CollegeWebSourceDB.category == category)
    if source_type and source_type != "All":
        query = query.filter(CollegeWebSourceDB.source_type == source_type)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (CollegeWebSourceDB.title.ilike(term)) |
            (CollegeWebSourceDB.url.ilike(term)) |
            (CollegeWebSourceDB.category.ilike(term))
        )

    sources = query.order_by(CollegeWebSourceDB.category, CollegeWebSourceDB.title).all()
    return sources


@router.put("/projects/{project_id}/sources/{source_id}", response_model=CollegeSourceSchema)
def update_project_source(
    project_id: str,
    source_id: str,
    payload: CollegeSourceUpdate,
    db: Session = Depends(get_db)
):
    """Enables, disables, or updates an individual approved source."""
    source = db.query(CollegeWebSourceDB).filter(
        CollegeWebSourceDB.project_id == project_id,
        CollegeWebSourceDB.id == source_id
    ).first()

    if not source:
        raise HTTPException(status_code=404, detail="Source not found.")

    if payload.title is not None:
        source.title = payload.title
    if payload.category is not None:
        source.category = payload.category
    if payload.is_enabled is not None:
        source.is_enabled = 1 if payload.is_enabled else 0

    db.commit()
    db.refresh(source)

    # Update project active counts
    active_count = db.query(CollegeWebSourceDB).filter(
        CollegeWebSourceDB.project_id == project_id,
        CollegeWebSourceDB.is_enabled == 1
    ).count()
    project = db.query(CollegeWebSearchProjectDB).filter(CollegeWebSearchProjectDB.id == project_id).first()
    if project:
        project.active_urls = active_count
        db.commit()

    return source


@router.delete("/projects/{project_id}/sources/{source_id}")
def delete_project_source(
    project_id: str,
    source_id: str,
    db: Session = Depends(get_db)
):
    """Deletes an URL from the project allowlist."""
    source = db.query(CollegeWebSourceDB).filter(
        CollegeWebSourceDB.project_id == project_id,
        CollegeWebSourceDB.id == source_id
    ).first()

    if not source:
        raise HTTPException(status_code=404, detail="Source not found.")

    db.delete(source)
    db.commit()

    # Update project counts
    total_count = db.query(CollegeWebSourceDB).filter(CollegeWebSourceDB.project_id == project_id).count()
    active_count = db.query(CollegeWebSourceDB).filter(
        CollegeWebSourceDB.project_id == project_id,
        CollegeWebSourceDB.is_enabled == 1
    ).count()
    project = db.query(CollegeWebSearchProjectDB).filter(CollegeWebSearchProjectDB.id == project_id).first()
    if project:
        project.total_urls = total_count
        project.active_urls = active_count
        db.commit()

    return {"message": "Source removed from project allowlist.", "id": source_id}


@router.post("/projects/{project_id}/chat", response_model=CollegeChatResponse)
async def chat_with_college_project(
    project_id: str,
    request: CollegeChatRequest,
    db: Session = Depends(get_db)
):
    """
    Project-Specific College Web Search Chat Inference:
    1. Understands query intent for this specific college.
    2. OpenAI decides 1-3 best URLs from this project's sitemap inventory.
    3. Fetches live web data from those URLs.
    4. Generates grounded answer with official citations.
    """
    seed_poornima_allowlist(db)
    response = await generate_college_web_search_answer(
        project_id=project_id,
        user_message=request.message,
        history=request.history,
        include_debug=request.include_debug,
        db=db
    )
    return response


@router.post("/projects/{project_id}/test", response_model=WebSearchTestResponse)
async def test_project_search_selection(
    project_id: str,
    payload: WebSearchTestRequest,
    db: Session = Depends(get_db)
):
    """
    Debug test tool for a specific college project:
    Inspects intent routing and OpenAI link selection without full text generation.
    """
    seed_poornima_allowlist(db)
    candidates, selected, intent_info, ai_reason, college_name = await select_and_fetch_college_sources(
        project_id=project_id,
        user_message=payload.query,
        history=[],
        db=db,
        max_sources=payload.max_sources or 3
    )

    return WebSearchTestResponse(
        query=payload.query,
        detected_intent=intent_info.get("intent", "general"),
        optimized_search_query=intent_info.get("search_query", ""),
        candidate_sources=candidates,
        selected_sources=[{
            "url": s.get("url"),
            "title": s.get("title"),
            "score": s.get("score"),
            "fetch_status": s.get("fetch_status")
        } for s in selected]
    )


# --- Backward-Compatible Endpoints (Mapped to Default Poornima Project) ---

@router.post("/chat", response_model=WebSearchChatResponse)
async def chat_web_search(
    request: WebSearchChatRequest,
    db: Session = Depends(get_db)
):
    """Legacy endpoint mapped to default Poornima project."""
    seed_poornima_allowlist(db)
    response = await generate_poornima_web_search_answer(
        user_message=request.message,
        history=request.history,
        include_debug=request.include_debug,
        db=db
    )
    return response


@router.get("/config", response_model=WebSearchConfigSchema)
def get_web_search_config(db: Session = Depends(get_db)):
    seed_poornima_allowlist(db)
    project = db.query(CollegeWebSearchProjectDB).filter(CollegeWebSearchProjectDB.id == "proj_poornima").first()
    total = db.query(CollegeWebSourceDB).filter(CollegeWebSourceDB.project_id == "proj_poornima").count()
    active = db.query(CollegeWebSourceDB).filter(CollegeWebSourceDB.project_id == "proj_poornima", CollegeWebSourceDB.is_enabled == 1).count()

    return WebSearchConfigSchema(
        id="poornima_config",
        college_name=project.college_name if project else "Poornima University",
        primary_domain=project.base_domain if project else "poornima.org",
        max_sources_per_query=project.max_sources_per_query if project else 3,
        status="ACTIVE",
        cache_ttl_seconds=600,
        total_sources_count=total,
        active_sources_count=active,
        updated_at=project.updated_at if project and project.updated_at else datetime.datetime.utcnow()
    )


@router.get("/sources", response_model=List[WebSearchSourceSchema])
def list_web_search_sources(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_poornima_allowlist(db)
    query = db.query(CollegeWebSourceDB).filter(CollegeWebSourceDB.project_id == "proj_poornima")

    if category and category != "All":
        query = query.filter(CollegeWebSourceDB.category == category)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (CollegeWebSourceDB.title.ilike(term)) |
            (CollegeWebSourceDB.url.ilike(term)) |
            (CollegeWebSourceDB.category.ilike(term))
        )

    sources = query.order_by(CollegeWebSourceDB.category, CollegeWebSourceDB.title).all()
    return sources


@router.post("/test", response_model=WebSearchTestResponse)
async def test_web_search_selection(
    payload: WebSearchTestRequest,
    db: Session = Depends(get_db)
):
    return await test_project_search_selection(
        project_id="proj_poornima",
        payload=payload,
        db=db
    )
