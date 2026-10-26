import uuid
import datetime
from urllib.parse import urlparse
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db, SessionLocal
from app.models.schemas import (
    AgentDB, PageDB, CrawlJobDB, EntityDB,
    CreateAgentRequest, UpdateAgentRequest, AgentResponse, PageSchema, PageDetailSchema, EntitySchema, CrawlJobSchema
)
from app.services.crawler.engine import execute_crawl_job

router = APIRouter(prefix="/agents", tags=["Agents"])

@router.get("", response_model=List[AgentResponse])
def list_agents(db: Session = Depends(get_db)):
    agents = db.query(AgentDB).all()
    if not agents:
        return []

    # Batch query page and entity counts to prevent N+1 query overhead
    page_counts = dict(
        db.query(PageDB.agent_id, func.count(PageDB.id))
        .group_by(PageDB.agent_id)
        .all()
    )
    entity_counts = dict(
        db.query(EntityDB.agent_id, func.count(EntityDB.id))
        .group_by(EntityDB.agent_id)
        .all()
    )

    # Batch query latest crawl jobs
    all_jobs = db.query(CrawlJobDB).order_by(CrawlJobDB.started_at.desc()).all()
    latest_jobs = {}
    for j in all_jobs:
        if j.agent_id not in latest_jobs:
            latest_jobs[j.agent_id] = j

    results = []
    for agent in agents:
        pages_count = page_counts.get(agent.id, 0)
        entities_count = entity_counts.get(agent.id, 0)
        latest_job = latest_jobs.get(agent.id)
        active_job_schema = CrawlJobSchema.model_validate(latest_job) if latest_job else None

        results.append(AgentResponse(
            id=agent.id,
            name=agent.name,
            website_url=agent.website_url,
            scope=agent.scope,
            status=agent.status,
            primary_color=agent.primary_color,
            welcome_message=agent.welcome_message,
            detected_sector=agent.detected_sector or "general",
            sector_confidence=agent.sector_confidence or 0.75,
            sector_reason=agent.sector_reason or "",
            created_at=agent.created_at,
            last_crawled_at=agent.last_crawled_at,
            indexed_pages_count=pages_count,
            structured_entities_count=entities_count,
            total_chunks_count=pages_count * 4,
            active_job=active_job_schema
        ))
    return results

@router.post("", response_model=AgentResponse)
async def create_agent(
    req: CreateAgentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    url = req.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    parsed = urlparse(url)
    if not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid website URL provided")

    agent_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    name = req.name
    if not name:
        name = parsed.netloc.replace("www.", "").capitalize() + " AI Agent"

    agent = AgentDB(
        id=agent_id,
        name=name,
        website_url=url,
        scope=req.scope or "entire_website",
        status="QUEUED"
    )
    db.add(agent)

    crawl_job = CrawlJobDB(
        id=job_id,
        agent_id=agent_id,
        status="QUEUED"
    )
    db.add(crawl_job)
    db.commit()

    background_tasks.add_task(execute_crawl_job, agent_id, job_id, SessionLocal)

    active_job_schema = CrawlJobSchema.model_validate(crawl_job)
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        website_url=agent.website_url,
        scope=agent.scope,
        status=agent.status,
        primary_color=agent.primary_color,
        welcome_message=agent.welcome_message,
        detected_sector=agent.detected_sector or "general",
        sector_confidence=agent.sector_confidence or 0.75,
        sector_reason=agent.sector_reason or "",
        created_at=agent.created_at,
        last_crawled_at=agent.last_crawled_at,
        indexed_pages_count=0,
        structured_entities_count=0,
        total_chunks_count=0,
        active_job=active_job_schema
    )


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(AgentDB).filter(AgentDB.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    pages_count = db.query(PageDB).filter(PageDB.agent_id == agent_id).count()
    entities_count = db.query(EntityDB).filter(EntityDB.agent_id == agent_id).count()

    latest_job = (
        db.query(CrawlJobDB)
        .filter(CrawlJobDB.agent_id == agent_id)
        .order_by(CrawlJobDB.started_at.desc())
        .first()
    )

    active_job_schema = CrawlJobSchema.model_validate(latest_job) if latest_job else None

    return AgentResponse(
        id=agent.id,
        name=agent.name,
        website_url=agent.website_url,
        scope=agent.scope,
        status=agent.status,
        primary_color=agent.primary_color,
        welcome_message=agent.welcome_message,
        detected_sector=agent.detected_sector or "general",
        sector_confidence=agent.sector_confidence or 0.75,
        sector_reason=agent.sector_reason or "",
        created_at=agent.created_at,
        last_crawled_at=agent.last_crawled_at,
        indexed_pages_count=pages_count,
        structured_entities_count=entities_count,
        total_chunks_count=pages_count * 4, # estimated chunk count
        active_job=active_job_schema
    )


@router.patch("/{agent_id}", response_model=AgentResponse)
def update_agent(agent_id: str, req: UpdateAgentRequest, db: Session = Depends(get_db)):
    agent = db.query(AgentDB).filter(AgentDB.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if req.name:
        agent.name = req.name
    if req.primary_color:
        agent.primary_color = req.primary_color
    if req.welcome_message:
        agent.welcome_message = req.welcome_message

    db.commit()
    return get_agent(agent_id, db)


@router.post("/{agent_id}/recrawl", response_model=CrawlJobSchema)
async def recrawl_agent(
    agent_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    agent = db.query(AgentDB).filter(AgentDB.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    job_id = str(uuid.uuid4())
    crawl_job = CrawlJobDB(
        id=job_id,
        agent_id=agent_id,
        status="QUEUED"
    )
    db.add(crawl_job)
    
    agent.status = "QUEUED"
    db.commit()

    background_tasks.add_task(execute_crawl_job, agent_id, job_id, SessionLocal)
    return CrawlJobSchema.model_validate(crawl_job)


@router.get("/{agent_id}/pages", response_model=List[PageSchema])
def list_agent_pages(agent_id: str, db: Session = Depends(get_db)):
    pages = db.query(PageDB).filter(PageDB.agent_id == agent_id).order_by(PageDB.crawled_at.desc()).all()
    return [PageSchema.model_validate(p) for p in pages]


@router.get("/{agent_id}/pages/{page_id}", response_model=PageDetailSchema)
def get_page_detail(agent_id: str, page_id: str, db: Session = Depends(get_db)):
    page = db.query(PageDB).filter(PageDB.agent_id == agent_id, PageDB.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    entities = db.query(EntityDB).filter(EntityDB.page_id == page_id).all()
    entity_schemas = [EntitySchema.model_validate(e) for e in entities]

    return PageDetailSchema(
        id=page.id,
        url=page.url,
        title=page.title,
        description=page.description or "",
        content_text=page.content_text or "",
        char_count=page.char_count,
        http_status=page.http_status,
        crawled_at=page.crawled_at,
        entities=entity_schemas
    )


@router.get("/{agent_id}/entities", response_model=List[EntitySchema])
def list_agent_entities(agent_id: str, db: Session = Depends(get_db)):
    entities = db.query(EntityDB).filter(EntityDB.agent_id == agent_id).order_by(EntityDB.created_at.desc()).all()
    return [EntitySchema.model_validate(e) for e in entities]
