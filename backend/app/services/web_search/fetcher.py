import re
import datetime
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.schemas import WebSearchSourceDB, CollegeWebSourceDB, CollegeWebSearchProjectDB
from app.services.web_search.allowlist import is_allowed_domain_url

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def clean_html_content(html: str) -> str:
    """
    Extracts clean readable text from HTML markup with structured table and list preservation.
    Ensures fee structures, seat matrices, eligibility rules, and figures are fully intact.
    """
    if not html:
        return ""
    soup = BeautifulSoup(html, "html.parser")
    
    # Remove script, style, nav, and noisy decorative tags
    for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "nav", "iframe"]):
        tag.decompose()

    # 1. Convert HTML tables into readable text/markdown matrix
    for table in soup.find_all("table"):
        table_lines = []
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all(["th", "td"])
            cell_texts = []
            for cell in cells:
                c_text = " ".join(cell.get_text(separator=" ").split())
                if c_text:
                    cell_texts.append(c_text)
            if cell_texts:
                table_lines.append(" | ".join(cell_texts))
        if table_lines:
            table_replacement = "\n\n[TABLE START]\n" + "\n".join(table_lines) + "\n[TABLE END]\n\n"
            table.replace_with(soup.new_string(table_replacement))

    # 2. Convert list items with bullet point
    for li in soup.find_all("li"):
        li_text = " ".join(li.get_text(separator=" ").split())
        if li_text:
            li.replace_with(soup.new_string(f"\n- {li_text}\n"))

    # 3. Convert headings
    for h in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        h_text = " ".join(h.get_text(separator=" ").split())
        if h_text:
            h.replace_with(soup.new_string(f"\n\n### {h_text}\n\n"))

    # 4. Extract overall clean text
    text = soup.get_text(separator="\n")
    
    # Clean whitespace and repeated newlines
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    cleaned_text = "\n".join(lines)
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
    return cleaned_text[:12000]  # Allow up to 12k chars for complete fee tables and details


def is_url_allowed_for_domain(url: str, base_domain: Optional[str] = None) -> bool:
    """Checks if a URL matches the allowed college base domain."""
    if not url:
        return False
    try:
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False
            
        if base_domain:
            clean_base = base_domain.lower().replace("http://", "").replace("https://", "").replace("www.", "").strip("/")
            # TASK A: exact host or true subdomain ONLY (no substring match)
            if hostname == clean_base or hostname.endswith("." + clean_base):
                return True
            return False  # explicitly reject: "notpoornima.org" must NOT match "poornima.org"

        # Fallback to Poornima allowlist check if base_domain not specified
        return is_allowed_domain_url(url)
    except Exception:
        return False


async def fetch_college_page(
    url: str,
    db: Optional[Session] = None,
    project_id: Optional[str] = None,
    base_domain: Optional[str] = None,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Fetches the live content of an approved college page with database caching.
    Supports any college domain dynamically.
    """
    # 1. Check if allowed for this project/domain
    if base_domain or project_id:
        if not is_url_allowed_for_domain(url, base_domain):
            return {"url": url, "title": "Blocked URL", "content": "", "status": "BLOCKED_DOMAIN_MISMATCH"}
    else:
        if not is_allowed_domain_url(url):
            return {"url": url, "title": "Blocked URL", "content": "", "status": "BLOCKED_NON_POORNIMA"}

    # 2. Check Database Cache
    source = None
    now = datetime.datetime.utcnow()

    if db:
        if project_id:
            source = db.query(CollegeWebSourceDB).filter(
                CollegeWebSourceDB.project_id == project_id,
                CollegeWebSourceDB.url == url
            ).first()
        if not source:
            source = db.query(WebSearchSourceDB).filter(WebSearchSourceDB.url == url).first()

    # Check cache freshness (valid for 6 hours unless force_refresh or old unstructured content)
    if source and getattr(source, "content_full", None) and not force_refresh:
        # If cached content has old blocked title or empty, force re-fetch
        if source.title != "Blocked URL" and len(source.content_full) > 200 and "[TABLE START]" in source.content_full:
            last_fetched = getattr(source, "last_fetched_at", None)
            if last_fetched and (now - last_fetched).total_seconds() < 21600:
                return {
                    "url": url,
                    "title": source.title or url,
                    "content": source.content_full,
                    "status": "CACHED"
                }

    # 3. Live Fetch via HTTP
    try:
        tls_verify = getattr(settings, "VERIFY_SSL", True)
        async with httpx.AsyncClient(timeout=15.0, verify=tls_verify, follow_redirects=True) as client:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code == 200:
                raw_html = resp.text
                clean_text = clean_html_content(raw_html)
                
                # Extract page title if available
                soup = BeautifulSoup(raw_html, "html.parser")
                page_title = soup.title.string.strip() if soup.title and soup.title.string else (source.title if source else "College Official Page")
                page_title = re.sub(r'\s+', ' ', page_title)

                if db and source:
                    if hasattr(source, "content_full"):
                        source.content_full = clean_text
                    if hasattr(source, "content_snippet"):
                        source.content_snippet = clean_text[:300]
                    if not source.title or source.title.startswith("http") or source.title == "Blocked URL":
                        source.title = page_title
                    if hasattr(source, "last_fetched_at"):
                        source.last_fetched_at = now
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()

                return {
                    "url": url,
                    "title": page_title,
                    "content": clean_text,
                    "status": "LIVE_FETCHED"
                }
            else:
                fallback_content = (getattr(source, "content_full", None) or 
                                    getattr(source, "content_snippet", None) or 
                                    f"Official College URL: {url}")
                return {
                    "url": url,
                    "title": source.title if source and source.title != "Blocked URL" else url,
                    "content": fallback_content,
                    "status": f"HTTP_{resp.status_code}_FALLBACK"
                }
    except Exception as e:
        fallback_content = (getattr(source, "content_full", None) or 
                            getattr(source, "content_snippet", None) or 
                            f"Official College URL: {url}")
        return {
            "url": url,
            "title": source.title if source and source.title != "Blocked URL" else url,
            "content": fallback_content,
            "status": f"ERROR_FALLBACK: {str(e)[:50]}"
        }


async def fetch_poornima_page(url: str, db: Session, force_refresh: bool = False) -> Dict[str, Any]:
    """Backward-compatible wrapper for default Poornima fetching."""
    return await fetch_college_page(url, db=db, project_id="proj_poornima", base_domain="poornima.org", force_refresh=force_refresh)
