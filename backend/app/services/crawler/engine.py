import asyncio
import datetime
import uuid
import httpx
from typing import Set, List, Dict, Any
from urllib.parse import urlparse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.schemas import AgentDB, PageDB, CrawlJobDB, EntityDB
from app.services.crawler.parser import clean_and_extract_html, compute_content_hash
from app.services.crawler.robots import RobotsManager
from app.services.knowledge.chunker import chunk_text
from app.services.knowledge.vector_store import vector_store
from app.services.knowledge.sector_detector import detect_website_sector
from app.services.knowledge.entity_extractor import extract_structured_entities
from app.services.llm.provider import get_embedding_provider

robots_manager = RobotsManager()

BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

async def execute_crawl_job(agent_id: str, job_id: str, db_session_factory):
    """
    Background worker process that crawls website pages, extracts content,
    performs sector classification, extracts structured domain entities,
    and builds tenant-isolated vector indexes with rich metadata.
    """
    db: Session = db_session_factory()
    try:
        agent = db.query(AgentDB).filter(AgentDB.id == agent_id).first()
        job = db.query(CrawlJobDB).filter(CrawlJobDB.id == job_id).first()
        
        if not agent or not job:
            return

        job.status = "CRAWLING"
        agent.status = "CRAWLING"
        db.commit()

        start_url = agent.website_url
        scope = agent.scope or "entire_website"
        parsed_start = urlparse(start_url)
        start_domain = parsed_start.netloc
        start_path = parsed_start.path.rstrip("/")

        queue: List[str] = [start_url]
        visited: Set[str] = set()
        job.pages_discovered = 1
        db.commit()

        existing_pages = {p.url: (p.id, p.content_hash) for p in db.query(PageDB).filter(PageDB.agent_id == agent_id).all()}
        embedding_provider = get_embedding_provider()

        sector_detected = False
        detected_sector = "general"

        async with httpx.AsyncClient(
            timeout=settings.CRAWL_TIMEOUT,
            follow_redirects=True,
            verify=settings.VERIFY_SSL,
            headers={"User-Agent": BROWSER_USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"}
        ) as client:

            while queue and len(visited) < settings.CRAWL_MAX_PAGES:
                current_url = queue.pop(0)
                if current_url in visited:
                    continue

                visited.add(current_url)
                job.current_page_url = current_url
                db.commit()

                # 1. Check robots.txt
                try:
                    allowed = await robots_manager.is_allowed(current_url)
                except Exception:
                    allowed = True

                if not allowed:
                    job.pages_skipped += 1
                    db.commit()
                    continue

                # 2. Fetch page HTML
                try:
                    resp = await client.get(current_url)
                    if resp.status_code != 200:
                        job.pages_failed += 1
                        db.commit()
                        continue
                    
                    raw_html = resp.text
                except Exception as e:
                    print(f"[Crawler] Error fetching {current_url}: {e}")
                    job.pages_failed += 1
                    db.commit()
                    continue

                # 3. Clean HTML & extract links (and virtual SPA pages if applicable)
                title, desc, cleaned_text, links, virtual_spa_pages = clean_and_extract_html(raw_html, current_url)
                
                if len(cleaned_text.strip()) < 15:
                    job.pages_skipped += 1
                    db.commit()
                    continue

                # 4. Sector Detection (on first page)
                if not sector_detected:
                    detected_sector, confidence, reason = detect_website_sector(cleaned_text, title, desc)
                    agent.detected_sector = detected_sector
                    agent.sector_confidence = confidence
                    agent.sector_reason = reason
                    sector_detected = True
                    db.commit()

                content_hash = compute_content_hash(cleaned_text)

                # 5. Check for re-crawl diff (Content Hash matching)
                if current_url in existing_pages:
                    existing_id, existing_hash = existing_pages[current_url]
                    if existing_hash == content_hash:
                        job.pages_processed += 1
                        job.pages_skipped += 1
                        db.commit()
                        if scope != "current_page":
                            _enqueue_links(links, queue, visited, start_domain, start_path, scope, job, db)
                        continue

                # 6. Save/Update Page in DB
                page_id = str(uuid.uuid4())
                existing_page_db = db.query(PageDB).filter(PageDB.agent_id == agent_id, PageDB.url == current_url).first()
                
                if existing_page_db:
                    page_id = existing_page_db.id
                    existing_page_db.title = title
                    existing_page_db.description = desc
                    existing_page_db.content_text = cleaned_text
                    existing_page_db.content_hash = content_hash
                    existing_page_db.char_count = len(cleaned_text)
                    existing_page_db.crawled_at = datetime.datetime.utcnow()
                    vector_store.delete_page_chunks(agent_id, page_id)
                    # Clear old entities for this page
                    db.query(EntityDB).filter(EntityDB.page_id == page_id).delete()
                else:
                    new_page = PageDB(
                        id=page_id,
                        agent_id=agent_id,
                        url=current_url,
                        title=title,
                        description=desc,
                        content_text=cleaned_text,
                        content_hash=content_hash,
                        char_count=len(cleaned_text),
                        http_status=200
                    )
                    db.add(new_page)

                # 7. Extract Structured Domain Entities
                extracted_entities = extract_structured_entities(cleaned_text, current_url, page_id, detected_sector)
                for ent in extracted_entities:
                    entity_db = EntityDB(
                        id=ent["id"],
                        agent_id=agent_id,
                        page_id=page_id,
                        entity_type=ent["entity_type"],
                        entity_name=ent["entity_name"],
                        attributes=ent.get("attributes", {}),
                        source_url=ent.get("source_url", current_url)
                    )
                    db.add(entity_db)

                job.pages_processed += 1
                db.commit()

                # 8. Chunk text and generate embeddings with rich metadata
                chunks = chunk_text(
                    text=cleaned_text,
                    url=current_url,
                    title=title,
                    page_id=page_id,
                    chunk_size=settings.CHUNK_SIZE,
                    chunk_overlap=settings.CHUNK_OVERLAP
                )

                # Enrich metadata
                for c in chunks:
                    c["metadata"]["agent_id"] = agent_id
                    c["metadata"]["sector"] = detected_sector
                    c["metadata"]["content_type"] = "webpage"

                if chunks:
                    chunk_texts = [c["text"] for c in chunks]
                    try:
                        embeddings = embedding_provider.embed_texts(chunk_texts)
                        vector_store.add_chunks(agent_id, chunks, embeddings)
                        job.pages_indexed += 1
                    except Exception as e:
                        print(f"[Crawler] Embedding generation failed for {current_url}: {e}")
                        job.pages_failed += 1

                db.commit()

                # 9. Ingest Virtual SPA Pages if discovered (for React/Vite/Next applications)
                if virtual_spa_pages and scope != "current_page":
                    for vp in virtual_spa_pages:
                        vp_url = vp["url"]
                        if vp_url in visited or len(visited) >= settings.CRAWL_MAX_PAGES:
                            continue
                        visited.add(vp_url)
                        
                        vp_title = vp.get("title") or vp_url
                        vp_desc = vp.get("description") or ""
                        vp_text = vp.get("content_text") or ""
                        if len(vp_text.strip()) < 15:
                            continue
                            
                        vp_hash = compute_content_hash(vp_text)
                        vp_page_id = str(uuid.uuid4())
                        
                        existing_vp = db.query(PageDB).filter(PageDB.agent_id == agent_id, PageDB.url == vp_url).first()
                        if existing_vp:
                            vp_page_id = existing_vp.id
                            existing_vp.title = vp_title
                            existing_vp.description = vp_desc
                            existing_vp.content_text = vp_text
                            existing_vp.content_hash = vp_hash
                            existing_vp.char_count = len(vp_text)
                            existing_vp.crawled_at = datetime.datetime.utcnow()
                            vector_store.delete_page_chunks(agent_id, vp_page_id)
                            db.query(EntityDB).filter(EntityDB.page_id == vp_page_id).delete()
                        else:
                            new_vp = PageDB(
                                id=vp_page_id,
                                agent_id=agent_id,
                                url=vp_url,
                                title=vp_title,
                                description=vp_desc,
                                content_text=vp_text,
                                content_hash=vp_hash,
                                char_count=len(vp_text),
                                http_status=200
                            )
                            db.add(new_vp)
                            
                        # Extract structured entities for virtual page
                        vp_entities = extract_structured_entities(vp_text, vp_url, vp_page_id, detected_sector)
                        for ent in vp_entities:
                            ent_db = EntityDB(
                                id=ent["id"],
                                agent_id=agent_id,
                                page_id=vp_page_id,
                                entity_type=ent["entity_type"],
                                entity_name=ent["entity_name"],
                                attributes=ent.get("attributes", {}),
                                source_url=ent.get("source_url", vp_url)
                            )
                            db.add(ent_db)
                            
                        job.pages_processed += 1
                        db.commit()
                        
                        # Chunk and embed virtual page
                        vp_chunks = chunk_text(
                            text=vp_text,
                            url=vp_url,
                            title=vp_title,
                            page_id=vp_page_id,
                            chunk_size=settings.CHUNK_SIZE,
                            chunk_overlap=settings.CHUNK_OVERLAP
                        )
                        for c in vp_chunks:
                            c["metadata"]["agent_id"] = agent_id
                            c["metadata"]["sector"] = detected_sector
                            c["metadata"]["content_type"] = "spa_section"
                            
                        if vp_chunks:
                            chunk_texts = [c["text"] for c in vp_chunks]
                            try:
                                embs = embedding_provider.embed_texts(chunk_texts)
                                vector_store.add_chunks(agent_id, vp_chunks, embs)
                                job.pages_indexed += 1
                            except Exception as e:
                                print(f"[Crawler] Virtual page embedding error for {vp_url}: {e}")
                                
                        db.commit()

                # 10. Discover new URLs if scope allows
                if scope != "current_page":
                    _enqueue_links(links, queue, visited, start_domain, start_path, scope, job, db)

                await asyncio.sleep(0.05)

        # 11. If Education / College sector, seed clearly marked DEMO datasets for student support & faculty policies
        if agent.detected_sector == "college":
            try:
                from app.services.knowledge.demo_data_seeder import seed_education_demo_data
                seed_education_demo_data(agent_id, db)
            except Exception as seeder_err:
                print(f"[Crawler] Error seeding demo education data: {seeder_err}")

        # Job Completed
        job.status = "COMPLETED"
        job.completed_at = datetime.datetime.utcnow()
        agent.status = "COMPLETED"
        agent.last_crawled_at = datetime.datetime.utcnow()
        db.commit()

    except Exception as e:
        print(f"[Crawler] Job {job_id} fatal failure: {e}")
        job.status = "FAILED"
        job.error_message = str(e)
        job.completed_at = datetime.datetime.utcnow()
        agent.status = "FAILED"
        db.commit()
    finally:
        db.close()


def _enqueue_links(links: Set[str], queue: List[str], visited: Set[str], start_domain: str, start_path: str, scope: str, job: CrawlJobDB, db: Session):
    for link in links:
        if link in visited or link in queue:
            continue
        
        parsed_link = urlparse(link)
        if parsed_link.netloc != start_domain:
            continue

        if scope == "subpath":
            if not parsed_link.path.startswith(start_path):
                continue

        queue.append(link)
        job.pages_discovered += 1
        db.commit()
