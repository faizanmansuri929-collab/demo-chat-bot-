import re
from typing import Dict, Any, List, Optional
from app.models.schemas import ChatMessage

INTENT_KEYWORD_MAP = {
    "fees_scholarships": [
        "fee", "fees", "fee structure", "tuition", "annual fee", "cost", "scholarship",
        "scholarships", "waiver", "concession", "merit scholarship", "installment", "pay online",
        "btech fee", "b.tech fee", "btech fees", "b.tech fees", "hostel fee", "hostel fees",
        "bus fee", "transport fee", "caution money", "development fee", "accounts",
        "kitni", "kitna", "kharcha", "shulk", "fees kitni", "kitne paise", "kitna lagega", "fees batao", "paisa"
    ],
    "admissions_eligibility": [
        "admission", "admissions", "apply", "eligibility", "reap", "cutoff", "cutoffs",
        "criteria", "how to get admission", "admission process", "lateral entry",
        "direct admission", "management quota", "jee", "12th percentage", "intake", "seats",
        "daakhila", "dakhila", "admission kaise le", "apply kaise kare", "admission process"
    ],
    "courses_btech": [
        "b.tech", "btech", "course", "courses", "branch", "branches", "specialization",
        "specializations", "program", "programs", "computer science", "cse", "it",
        "civil", "mechanical", "electrical", "ece", "ai", "data science", "cyber security",
        "iot", "artificial intelligence", "degree", "b tech", "mtech", "mba", "mca", "bba", "bca", "phd"
    ],
    "placements_recruiters": [
        "placement", "placements", "highest package", "average package", "package", "salary",
        "recruiter", "recruiters", "mnc", "companies", "tpo", "internship", "internships",
        "tcs", "infosys", "wipro", "capgemini", "job offer", "placement statistics",
        "naukri", "job", "package kitna", "placement kaisa"
    ],
    "hostel_mess": [
        "hostel", "hostels", "mess", "dining", "room", "rooms", "accommodation", "stay",
        "warden", "gym", "boys hostel", "girls hostel", "ac room", "cooler room", "food",
        "khana", "kamra", "mess kaisa", "hostel kaisa", "rehna", "khana peena", "rehne ka"
    ],
    "faculty_management": [
        "faculty", "professors", "teachers", "chairman", "director", "management",
        "hod", "deans", "mentors", "chancellor", "leadership", "staff"
    ],
    "infrastructure_labs": [
        "infrastructure", "labs", "laboratory", "workshop", "auditorium", "campus building",
        "smart classroom", "practical lab", "library", "sports complex"
    ],
    "academic_calendar_exams": [
        "academic calendar", "calendar", "exam", "exams", "semester", "datesheet",
        "holidays", "vacation", "mid term", "schedule"
    ],
    "forms_student_resources": [
        "form", "forms", "download forms", "study materials", "notes", "archive",
        "syllabus", "bonafide", "transcript", "grievance", "anti ragging"
    ],
    "contact_location": [
        "contact", "phone", "mobile", "helpline", "email", "address", "location",
        "where is", "reach", "contact us", "kahan hai", "pata", "map"
    ],
    "events_fests": [
        "event", "events", "fest", "cultural", "hackathon",
        "sports fest", "technical events", "conference", "conferences", "workshop", "seminar"
    ],
    "about_history_accreditation": [
        "about", "history", "legacy", "accreditation", "naac", "aicte", "rtu",
        "nba", "ranking", "philosophy", "foundation"
    ]
}


def classify_college_intent(
    user_message: str,
    college_name: str = "College / University",
    base_domain: str = "college.edu",
    history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Classifies the user query into college-specific intents, resolves follow-up context,
    and builds an optimized search query for any college domain.
    """
    history = history or []
    clean_msg = user_message.strip()
    lower_msg = clean_msg.lower()

    # Context resolution from previous turn (English & Hinglish)
    context_keywords = []
    if history:
        last_turn = history[-2:]
        for item in last_turn:
            txt = (item.get("content") or "").lower()
            if any(k in txt for k in ["b.tech", "btech", "cse", "course", "branch", "padhai"]):
                context_keywords.append("B.Tech")
            if any(k in txt for k in ["fee", "fees", "cost", "scholarship", "kitni", "kitna", "kharcha", "shulk"]):
                context_keywords.append("Fees")
            if any(k in txt for k in ["placement", "package", "recruiter", "naukri", "job"]):
                context_keywords.append("Placement")
            if any(k in txt for k in ["hostel", "mess", "room", "khana", "kamra"]):
                context_keywords.append("Hostel")
            if any(k in txt for k in ["admission", "eligibility", "reap", "daakhila", "dakhila"]):
                context_keywords.append("Admission")

    # Hinglish and English follow-up detection
    follow_up_pattern = (
        r'\b(which one|what about|and for|how much for|tell me more|is there any|where is it|'
        r'aur\b|uske baare me|iske baare me|aur batao|aur hostel|aur fees|aur placement|aur admission)\b'
    )
    is_follow_up = bool(re.search(follow_up_pattern, lower_msg))
    
    # Score each intent
    intent_scores = {}
    for intent, kw_list in INTENT_KEYWORD_MAP.items():
        score = 0
        for kw in kw_list:
            if " " in kw:
                if kw in lower_msg:
                    score += 4
            else:
                if re.search(r'\b' + re.escape(kw) + r'\b', lower_msg):
                    score += 2
        intent_scores[intent] = score

    # Determine primary intent
    best_intent = "general"
    max_score = 0
    for intent, score in intent_scores.items():
        if score > max_score:
            max_score = score
            best_intent = intent

    # Normalize punctuation and tokens
    norm_msg = re.sub(r'[^a-zA-Z0-9\s]', ' ', lower_msg).strip()
    norm_words = norm_msg.split()

    # Check for bot identity / introduction queries
    identity_patterns = [
        r'\b(tell me about (you|yourself))\b',
        r'\b(who are you|who r u|what are you)\b',
        r'\b(what can you do|how can you help|what do you do)\b',
        r'\b(introduce yourself|your intro|about you)\b'
    ]
    if any(re.search(pat, norm_msg) for pat in identity_patterns):
        return {
            "intent": "bot_identity",
            "search_query": f"{college_name} overview site:{base_domain}",
            "is_greeting": True,
            "is_off_topic": False,
            "target_categories": ["About", "Home"]
        }

    # Check for greeting (standalone or short polite greetings)
    greeting_words = {"hi", "hello", "hey", "namaste", "namaskar", "morning", "afternoon", "evening", "hii", "helloo", "hola", "greetings"}
    is_greeting_match = (
        norm_msg in ["hi", "hello", "hey", "namaste", "namaskar", "good morning", "good afternoon", "good evening", "hii", "helloo", "hola"]
        or (len(norm_words) <= 3 and any(w in greeting_words for w in norm_words) and not any(k in norm_msg for k in ["fee", "fees", "admission", "course", "placement", "hostel", "cutoff", "result", "btech", "apply", "kitni", "kitna", "kharcha"]))
    )
    if is_greeting_match:
        return {
            "intent": "greeting",
            "search_query": f"{college_name} overview programs admissions site:{base_domain}",
            "is_greeting": True,
            "is_off_topic": False,
            "target_categories": ["Home", "Courses", "Admissions", "About"]
        }

    # Off-topic filter: widened patterns across external subjects
    college_keywords = [
        "college", "university", "admission", "course", "fee", "fees", "hostel",
        "placement", "btech", "mtech", "bba", "mba", "faculty", "syllabus", "reap",
        "rtu", "campus", "shulk", "daakhila", "kharcha", "kitni", "kitna", "naukri"
    ]
    has_college_context = any(k in lower_msg for k in college_keywords) or (college_name.lower() in lower_msg) or (base_domain.lower() in lower_msg)

    if not has_college_context:
        off_topic_patterns = [
            r'\b(weather|temperature|forecast|rain in|prime minister|president|election|politics)\b',
            r'\b(bitcoin|crypto|stock market|share market|sensex|nifty|trading)\b',
            r'\b(ipl score|cricket match|football|fifa|world cup|olympics)\b',
            r'\b(recipe|how to cook|biryani|paneer|movie review|hollywood|bollywood|netflix|cinema)\b',
            r'\b(iphone 16|samsung galaxy|laptop review|car price|bike model)\b',
            r'\b(joke|story|poem|write a code|python script|write an essay)\b'
        ]
        for otp in off_topic_patterns:
            if re.search(otp, lower_msg):
                return {
                    "intent": "off_topic",
                    "search_query": "",
                    "is_greeting": False,
                    "is_off_topic": True,
                    "target_categories": []
                }

    # Build optimized search query
    search_terms = [college_name.split()[0] if college_name else "College"]
    if context_keywords and is_follow_up:
        search_terms.extend(context_keywords)
    
    cleaned_tokens = [w for w in re.findall(r'[a-zA-Z0-9_\-\+]+', clean_msg) if len(w) > 1 and w.lower() not in ["what", "is", "the", "are", "of", "for", "in", "to", "and", "do", "you", "provide", "give", "tell", "me", "about", "which", "please"]]
    search_terms.extend(cleaned_tokens[:6])
    
    optimized_query = f"{' '.join(search_terms)} site:{base_domain}"

    category_map = {
        "fees_scholarships": ["Admissions", "Courses", "Policies", "About"],
        "admissions_eligibility": ["Admissions", "Courses", "Policies"],
        "courses_btech": ["Courses", "Admissions", "Departments"],
        "placements_recruiters": ["Placements", "About", "Students"],
        "hostel_mess": ["Hostels", "Campus Life", "Infrastructure"],
        "faculty_management": ["Faculty", "About", "Departments"],
        "infrastructure_labs": ["Infrastructure", "Campus Life", "About"],
        "academic_calendar_exams": ["Students", "Policies"],
        "forms_student_resources": ["Students", "Policies", "Admissions"],
        "contact_location": ["Contact", "About"],
        "events_fests": ["Events", "Campus Life"],
        "about_history_accreditation": ["About", "Policies"]
    }

    return {
        "intent": best_intent,
        "search_query": optimized_query,
        "is_greeting": False,
        "is_off_topic": False,
        "target_categories": category_map.get(best_intent, ["General", "Home", "Courses", "Admissions", "Policies"])
    }


def classify_poornima_intent(user_message: str, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    """Backward-compatible wrapper for Poornima."""
    return classify_college_intent(user_message, college_name="Poornima University", base_domain="poornima.org", history=history)
