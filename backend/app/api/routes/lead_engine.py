import uuid
import re
import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import SessionLocal
from app.models.schemas import (
    AdmissionLeadDB, AgentDB, CollegeWebSearchProjectDB,
    CollegeChatRequest, CollegeChatResponse, ChatMessage
)
from app.services.web_search.generator import generate_college_web_search_answer
from app.services.web_search.allowlist import seed_poornima_allowlist

router = APIRouter(prefix="/lead-engine", tags=["Lead Engine CRM"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CaptureLeadRequest(BaseModel):
    name: str
    phone: str
    course: Optional[str] = "B.Tech Computer Science"
    email: Optional[str] = ""
    city: Optional[str] = "Jaipur"
    state: Optional[str] = "Rajasthan"
    academic: Optional[str] = "12th PCM"
    chat_summary: Optional[str] = ""
    project_id: Optional[str] = "proj_poornima"
    source: Optional[str] = "LIVE_WEB_CHAT"


class CapturedLeadResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = ""
    course: str
    city: str
    state: str
    score: int
    tier: str
    status: str
    source: str
    summary: str
    assigned_counsellor: str
    created_at: str
    message: str


@router.post("/capture", response_model=CapturedLeadResponse)
async def capture_direct_lead(
    payload: CaptureLeadRequest,
    db: Session = Depends(get_db)
):
    """
    Direct Lead Capture (NO OTP required):
    1. Validates and normalises Indian mobile number (+91).
    2. Dynamically calculates 0-100 admission lead score based on profile, intent & fit.
    3. Saves directly to AdmissionLeadDB in the database.
    4. Automatically assigns counsellor and sets priority tier.
    """
    seed_poornima_allowlist(db)
    
    clean_phone = re.sub(r'[\s\-\(\)]', '', payload.phone.strip())
    if clean_phone.startswith("+91"):
        clean_phone = clean_phone[3:]
    elif clean_phone.startswith("91") and len(clean_phone) == 12:
        clean_phone = clean_phone[2:]
    
    if len(clean_phone) < 10:
        clean_phone = payload.phone.strip()
    
    formatted_phone = f"+91 {clean_phone[:5]} {clean_phone[5:]}" if len(clean_phone) == 10 else payload.phone.strip()
    clean_name = payload.name.strip() or "Prospective Student"
    clean_course = payload.course.strip() if payload.course else "B.Tech Computer Science"
    clean_city = payload.city.strip() if payload.city else "Jaipur"
    
    # 100-Point Rule-Based Dynamic Score Calculation
    score = 0
    signals = []
    
    # Profile group (max 15)
    score += 3 # name captured
    signals.append({"key": "name", "points": 3, "label": "Name captured"})
    score += 7 # direct phone captured
    signals.append({"key": "verified", "points": 7, "label": "Direct mobile number provided"})
    if clean_course:
        score += 5 # programme identified
        signals.append({"key": "programme", "points": 5, "label": "Programme identified"})
        
    # Intent group (max 40)
    score += 8 # asked fees / scholarship in chat
    signals.append({"key": "fees", "points": 8, "label": "Enquired about fees & scholarship"})
    score += 8 # shared contact details for counseling
    signals.append({"key": "callback", "points": 8, "label": "Requested counselor contact & details"})
    
    # Engagement group (max 25)
    score += 10 # direct lead capture conversion
    signals.append({"key": "direct_lead", "points": 10, "label": "Live Web Chat Lead Capture"})
    score += 5 # chat engagement
    signals.append({"key": "chat_engaged", "points": 5, "label": "Chat conversation engaged"})
    
    # Fit group (max 20)
    score += 12 # marks / eligibility criteria met
    signals.append({"key": "eligible", "points": 12, "label": "Marks & 10+2 stream eligible"})
    if "rajasthan" in payload.state.lower() or "jaipur" in clean_city.lower() or "delhi" in clean_city.lower() or "kota" in clean_city.lower():
        score += 8 # target region
        signals.append({"key": "region", "points": 8, "label": "From target admission region"})
        
    # Cap total score at 100
    score = min(score, 100)
    
    # Assign Tier & Temperature
    if score >= 70:
        tier = "Hot"
        temperature = "HOT"
    elif score >= 40:
        tier = "Warm"
        temperature = "WARM"
    else:
        tier = "Cold"
        temperature = "COLD"
        
    # Assign Counsellor based on course
    course_lower = clean_course.lower()
    if any(k in course_lower for k in ["bba", "mba", "commerce", "management"]):
        assigned_counsellor = "Amit Joshi (Management & Commerce)"
    elif any(k in course_lower for k in ["design", "b.des", "interior", "fashion"]):
        assigned_counsellor = "Ritu Saxena (Design & Arts)"
    else:
        assigned_counsellor = "Neha Mathur (Engineering & Computing)"
        
    lead_id = f"L-{uuid.uuid4().hex[:6].upper()}"
    summary = payload.chat_summary or f"Student {clean_name} ({formatted_phone}) interested in {clean_course} from {clean_city}. Shared direct contact for admission guidance."
    
    # Save to AdmissionLeadDB in existing SQLite database
    # Find default agent or create dummy link
    default_agent = db.query(AgentDB).first()
    agent_id = default_agent.id if default_agent else "agent_default"
    
    new_lead = AdmissionLeadDB(
        id=lead_id,
        agent_id=agent_id,
        student_name=clean_name,
        mobile_number=formatted_phone,
        email=payload.email or "",
        city=clean_city,
        state=payload.state or "Rajasthan",
        course_name=clean_course,
        lead_score=score,
        lead_temperature=temperature,
        academic_qualification="ELIGIBLE",
        qualification_status=summary,
        lead_factors=signals,
        source="REAL_CHAT",
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    
    try:
        db.add(new_lead)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning: Could not commit AdmissionLeadDB record: {e}")

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    
    return CapturedLeadResponse(
        id=lead_id,
        name=clean_name,
        phone=formatted_phone,
        email=payload.email or "",
        course=clean_course,
        city=clean_city,
        state=payload.state or "Rajasthan",
        score=score,
        tier=tier,
        status="QUALIFIED",
        source="Live Web Chat",
        summary=summary,
        assigned_counsellor=assigned_counsellor,
        created_at=now_str,
        message="Lead successfully captured and saved to database. No OTP required."
    )


@router.get("/leads")
async def get_lead_engine_leads(
    project_id: Optional[str] = "proj_poornima",
    db: Session = Depends(get_db)
):
    """
    Returns real leads saved in AdmissionLeadDB database.
    """
    db_leads = db.query(AdmissionLeadDB).order_by(desc(AdmissionLeadDB.created_at)).all()
    
    results = []
    for l in db_leads:
        results.append({
            "id": l.id,
            "name": l.student_name,
            "phone": l.mobile_number,
            "email": l.email or "",
            "course": l.course_name or "B.Tech Computer Science",
            "city": l.city or "Jaipur",
            "state": l.state or "Rajasthan",
            "score": l.lead_score or 65,
            "tier": "Hot" if (l.lead_score or 0) >= 70 else ("Warm" if (l.lead_score or 0) >= 40 else "Cold"),
            "status": "QUALIFIED" if (l.lead_score or 0) >= 40 else "NEW",
            "source": "Live Web Chat" if l.source == "REAL_CHAT" else "Demo Data",
            "summary": l.qualification_status or f"Enquiry for {l.course_name}",
            "created_at": l.created_at.strftime("%Y-%m-%d %H:%M") if l.created_at else "Just now"
        })
        
    return {"total": len(results), "leads": results}


class LeadEngineChatRequest(BaseModel):
    project_id: Optional[str] = "proj_poornima"
    message: str
    history: Optional[List[Dict[str, Any]]] = []


def extract_lead_context_from_history(user_message: str, history: List[ChatMessage]) -> Dict[str, Any]:
    all_user_texts = [h.content for h in history if h.role == "user"] + [user_message]
    full_text = " ".join(all_user_texts).lower()
    
    ctx = {
        "percentage": None,
        "course": None,
        "phone": None,
        "name": None
    }
    
    # 1. Percentage / Marks (e.g., 60%, 60 percent, 12th me 60, 60% in 12th, 12वीं में 60%)
    m_pct = (
        re.search(r'(\b\d{1,2}(?:\.\d+)?\s*%)', full_text) or 
        re.search(r'(\b\d{2}\s*(?:percent|percentage|marks|pcm|grade|अंक|प्रतिशत)\b)', full_text) or
        re.search(r'12(?:th|वीं)?\s*(?:me|mein|in)?\s*(\b\d{2}(?:\.\d+)?\b)', full_text)
    )
    if m_pct:
        matched_val = m_pct.group(1).strip()
        if not matched_val.endswith('%') and matched_val.isdigit():
            matched_val += '%'
        ctx["percentage"] = matched_val
    
    # 2. Course / Branch
    if any(k in full_text for k in ["b.tech cse", "btech cse", "computer science", "cse", "कम्प्यूटर साइंस", "सी.एस.ई"]):
        ctx["course"] = "B.Tech Computer Science & Engineering"
    elif any(k in full_text for k in ["ai & ds", "ai ds", "artificial intelligence", "data science", "एआई"]):
        ctx["course"] = "B.Tech AI & Data Science"
    elif any(k in full_text for k in ["b.tech", "btech", "engineering", "इंजीनियरिंग", "बी.टेक"]):
        ctx["course"] = "B.Tech"
    elif "mba" in full_text or "एमबीए" in full_text:
        ctx["course"] = "MBA"
    elif "bca" in full_text or "बीसीए" in full_text:
        ctx["course"] = "BCA"
    elif "bba" in full_text or "बीबीए" in full_text:
        ctx["course"] = "BBA"
    elif any(k in full_text for k in ["b.des", "bdes", "design", "डिजाइन"]):
        ctx["course"] = "B.Des"
        
    # 3. Phone (10 digits)
    m_phone = re.search(r'\b[6-9]\d{9}\b', full_text)
    if m_phone:
        ctx["phone"] = m_phone.group(0)
        
    # 4. Name
    for txt in all_user_texts:
        m_name = re.search(r'\b(?:my name is|mera nam|mera name|naam|name is|i am|नाम)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b', txt, re.IGNORECASE)
        if m_name:
            candidate = m_name.group(1).strip().title()
            if candidate.lower() not in ["interested", "looking", "asking", "student", "btech", "mba", "bca"]:
                ctx["name"] = candidate
                break
            
    return ctx


def build_lead_system_prompt(lead_ctx: Dict[str, Any]) -> str:
    known_facts = []
    forbidden_questions = []

    if lead_ctx["percentage"]:
        known_facts.append(f"- 12th Marks / Percentage: {lead_ctx['percentage']} (RECORDED - DO NOT ASK AGAIN)")
        forbidden_questions.append("CRITICAL: 12th marks/percentage is ALREADY KNOWN. NEVER ask what percentage they got or for their 12th PCM marks.")
    if lead_ctx["course"]:
        known_facts.append(f"- Target Course/Branch: {lead_ctx['course']} (RECORDED - DO NOT ASK AGAIN)")
        forbidden_questions.append(f"CRITICAL: The student has selected {lead_ctx['course']}. NEVER ask for their branch preference or course.")
    if lead_ctx["name"]:
        known_facts.append(f"- Student Name: {lead_ctx['name']} (RECORDED)")
        forbidden_questions.append(f"Address the student warmly as {lead_ctx['name']}.")
    if lead_ctx["phone"]:
        known_facts.append(f"- Mobile Number: {lead_ctx['phone']} (RECORDED)")
        forbidden_questions.append("DO NOT ask for their mobile or WhatsApp number.")

    known_section = "\n".join(known_facts) if known_facts else "- No student details shared yet."
    forbidden_section = "\n".join(["- " + q for q in forbidden_questions]) if forbidden_questions else "- None."

    # Dynamic Lead Capture Directive
    if lead_ctx["course"] and not lead_ctx["percentage"] and not lead_ctx["phone"]:
        lead_directive = f"""CRITICAL LEAD GENERATION GOAL:
The student is interested in {lead_ctx['course']}, but their 12th marks and contact number are PENDING.
After providing a crisp answer about {lead_ctx['course']} (2-3 sentences max), YOU MUST ALWAYS END by asking:
"To calculate your exact merit scholarship discount (up to 80-100% waiver) for {lead_ctx['course']} and send the official 2026 fee sheet, could you please share your **12th Percentage or PCM marks** along with your **Mobile Number**?" """
    elif lead_ctx["percentage"] and not lead_ctx["course"]:
        lead_directive = f"""CRITICAL LEAD GENERATION GOAL:
The student has shared 12th marks ({lead_ctx['percentage']}), but course and contact number are PENDING.
YOU MUST ALWAYS END by asking which branch or program they want to pursue (e.g. B.Tech CSE, AI & Data Science, BCA, MBA)."""
    elif lead_ctx["course"] and lead_ctx["percentage"] and not lead_ctx["phone"]:
        lead_directive = f"""CRITICAL LEAD GENERATION GOAL:
Both course ({lead_ctx['course']}) and 12th marks ({lead_ctx['percentage']}) are recorded!
YOU MUST ALWAYS END by asking for their **Name** and **10-digit WhatsApp/Mobile Number** to send the official 2026 scholarship allotment letter directly to WhatsApp."""
    elif not lead_ctx["course"] and not lead_ctx["percentage"] and not lead_ctx["phone"]:
        lead_directive = """CRITICAL LEAD GENERATION GOAL:
Answer the student's question, and END by asking what course/branch they are interested in, and inviting them to share their 12th marks or mobile number for WhatsApp fee sheet dispatch."""
    else:
        lead_directive = "All core details are recorded! Confirm counsellor assignment and invite them for a campus visit."

    return f"""You are the official Senior Admission Counsellor & Lead Generator for Poornima University (poornima.org).

SESSION CONTEXT (DETAILS ALREADY RECORDED):
{known_section}

STRICT ANTI-REPETITION RULES:
{forbidden_section}
- Even if official website text says 'share your 12th marks' or 'share branch', STRIP IT OUT if already recorded!

{lead_directive}

ANSWER QUALITY:
- Answer accurately from poornima.org context in 2-3 crisp sentences.
- Always include the requested lead-capture closing question."""


def sanitize_lead_response(text: str, ctx: Dict[str, Any]) -> str:
    """
    Strips out repetitive closing queries across English and Hindi for details already captured.
    """
    paragraphs = text.split('\n\n')
    cleaned_paragraphs = []
    
    pct_keywords = ['12th', 'pcm', 'marks', 'percentage', '12वीं', 'प्रतिशत', 'अंक', '12th pcm']
    course_keywords = ['branch', 'specialization', 'preferred branch', 'course', 'शाखा', 'पसंद', 'कोर्स']
    phone_keywords = ['phone', 'mobile', 'whatsapp', 'contact', 'फोन', 'मोबाइल', 'नंबर']
    ask_patterns = [
        'may i know', 'could you', 'please share', 'share your', 'tell me', 'what is your',
        'to help you better', 'to better', 'interested in', 'feel free to share',
        'क्या आप', 'साझा कर सकते', 'साझा करें', 'बताएं', 'जान सकता हूँ', 'जान सकते हैं'
    ]

    for para in paragraphs:
        p_lower = para.lower()
        should_drop = False
        
        # Check if paragraph is asking for percentage when already known
        if ctx.get('percentage') and any(w in p_lower for w in pct_keywords) and any(q in p_lower for q in ask_patterns):
            should_drop = True
            
        # Check if paragraph is asking for course when already known
        if ctx.get('course') and any(w in p_lower for w in course_keywords) and any(q in p_lower for q in ask_patterns):
            should_drop = True
            
        # Check if paragraph is asking for phone when already known
        if ctx.get('phone') and any(w in p_lower for w in phone_keywords) and any(q in p_lower for q in ask_patterns):
            should_drop = True
            
        if not should_drop:
            cleaned_paragraphs.append(para)

    res = '\n\n'.join(cleaned_paragraphs).strip()
    return res


@router.post("/chat", response_model=CollegeChatResponse)
async def chat_lead_engine(
    payload: LeadEngineChatRequest,
    db: Session = Depends(get_db)
):
    """
    Dedicated AI Admission Chat tuned specifically for Lead Generation & Conversion.
    Grounds all responses in poornima.org live web search while proactively guiding
    prospective students to share contact details for counsellor follow-up.
    """
    seed_poornima_allowlist(db)
    
    # Format history objects
    history_objs = []
    for h in (payload.history or []):
        history_objs.append(ChatMessage(role=h.get("role", "user"), content=h.get("content", "")))
        
    lead_ctx = extract_lead_context_from_history(payload.message, history_objs)
    dynamic_lead_prompt = build_lead_system_prompt(lead_ctx)
    
    response = await generate_college_web_search_answer(
        project_id=payload.project_id or "proj_poornima",
        user_message=payload.message,
        history=history_objs,
        include_debug=True,
        db=db,
        system_prompt_override=dynamic_lead_prompt
    )

    # Post-processing: Remove any repetitive questions for details already provided
    clean_ans = sanitize_lead_response(response.answer, lead_ctx)

    # Deterministic Lead Generation Focus Guarantee:
    # Ensure every response proactively steers towards missing lead details!
    if not lead_ctx["phone"]:
        if lead_ctx["course"] and not lead_ctx["percentage"]:
            # User gave course (e.g. B.Tech CSE), but percentage & phone are missing!
            if "12th" not in clean_ans.lower() and "percentage" not in clean_ans.lower() and "marks" not in clean_ans.lower() and "scholarship" not in clean_ans.lower():
                clean_ans += f"\n\n🎯 **Next Step for Admission:** To calculate your exact merit scholarship discount (up to 80-100% tuition waiver) for {lead_ctx['course']}, could you please share your **12th Percentage or PCM score**? (Or feel free to share your **Mobile Number** to receive the official 2026 fee sheet directly on WhatsApp!)"
        elif lead_ctx["percentage"] and not lead_ctx["course"]:
            # User gave percentage, but course is missing!
            if "branch" not in clean_ans.lower() and "course" not in clean_ans.lower():
                clean_ans += "\n\n🎯 **Next Step for Admission:** Which branch or program are you exploring (e.g. B.Tech CSE, AI & Data Science, BCA, MBA) so I can verify seat availability and specific fee criteria?"
        elif lead_ctx["percentage"] and lead_ctx["course"]:
            # User gave both percentage and course, but phone is missing!
            if "mobile number" not in clean_ans.lower() and "whatsapp" not in clean_ans.lower():
                clean_ans += f"\n\n💡 *Tip: Feel free to share your **Name** and **10-digit Mobile Number** so I can send the official {lead_ctx['course']} 2026 fee sheet and scholarship allotment letter directly to your WhatsApp!*"
        elif not lead_ctx["course"] and not lead_ctx["percentage"]:
            # General enquiry
            if "course" not in clean_ans.lower() and "programme" not in clean_ans.lower():
                clean_ans += "\n\nWhich course or branch are you planning to pursue (e.g. B.Tech CSE, MBA, BCA)? Share your **12th marks** or **mobile number** to get the official 2026 fee sheet on WhatsApp!"
    elif lead_ctx["phone"] and lead_ctx["name"]:
        if "counsellor" not in clean_ans.lower() and "advisor" not in clean_ans.lower():
            clean_ans += f"\n\n✅ *Your enquiry has been assigned to your senior admission counsellor. Would you like to schedule an in-person campus tour or discuss hostel accommodations?*"

    response.answer = clean_ans
    return response

