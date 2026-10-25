"""
voice_gate.py – TASK C

Gates voice transcript before search:
  1. Rule checks (empty, <2 words, fillers, bad scripts, repeated tokens)
  2. If ambiguous → tiny gpt-4o-mini classifier
     → COLLEGE_QUERY | GREETING | OFF_TOPIC | CHATTER

CHATTER  → should_respond=False (silent)
OFF_TOPIC → polite refusal template
GREETING  → polite greeting template
COLLEGE_QUERY → proceed to search
"""

import re
import unicodedata
from typing import Dict, Any, List, Optional

# ---- Fixed reply templates (no LLM) -------
_GREETING_EN = "Namaste! How can I help you today?"
_GREETING_HI = "Namaste! Main aapki kya madad kar sakta hoon?"
_OFF_TOPIC_EN = "I can only answer questions about {college_name}. Please ask me about admissions, courses, fees, or hostels."
_OFF_TOPIC_HI = "Main sirf {college_name} ke baare mein bata sakta hoon. Admissions, courses, fees ya hostel ke baare mein poochhe."

# ---- Filler-only tokens (both languages) ----
_FILLERS = frozenset([
    "hmm", "hm", "um", "uh", "ok", "okay", "okie", "haan", "han", "ha",
    "theek", "hai", "chalo", "arrey", "are", "acha", "accha", "achha", "suno",
    "yaar", "bhai", "yep", "yeah", "ya", "nah", "na", "no",
    "hello", "hi", "hey", "namaste"  # greeted already – handled separately
])

# ---- Script detection ----
def _dominant_script(text: str) -> str:
    """Returns 'latin', 'devanagari', 'other', or 'mixed'."""
    latin_count = devanagari_count = other_count = 0
    for ch in text:
        cat = unicodedata.category(ch)
        name = unicodedata.name(ch, "")
        if "LATIN" in name or cat in ("Ll", "Lu", "Lo") and ord(ch) < 0x0400:
            if ord(ch) < 0x0250:
                latin_count += 1
            else:
                other_count += 1
        elif "DEVANAGARI" in name:
            devanagari_count += 1
        elif cat.startswith("L"):
            other_count += 1

    total = latin_count + devanagari_count + other_count
    if total == 0:
        return "latin"
    if other_count / total > 0.3:
        return "other"
    if devanagari_count > latin_count:
        return "devanagari"
    return "latin"


# ---- College inquiry vocabulary (avoids substring false positives) ----
COLLEGE_INQUIRY_WORDS = frozenset([
    "fee", "fees", "tuition", "scholarship", "scholarships",
    "hostel", "hostels", "mess", "accommodation", "room", "rooms",
    "admission", "admissions", "apply", "eligibility", "eligible",
    "cutoff", "cutoffs", "ranking", "rankings", "reap", "jee", "cuet",
    "course", "courses", "branch", "branches", "program", "programs", "degree",
    "placement", "placements", "package", "packages", "salary", "recruiter", "recruiters",
    "btech", "mtech", "mba", "bca", "mca", "bba", "bdes", "phd", "cse", "ece",
    "faculty", "professors", "teachers", "campus", "location", "address",
    "syllabus", "curriculum", "exam", "exams", "contact", "helpline",
    "info", "information", "detail", "details", "help", "about", "tell", "explain",
    "overview", "facilities", "library", "sports", "bus", "transport", "transportation",
    "timing", "timings", "review", "reviews",
    # Specific Hinglish terms
    "kharcha", "shulk", "daakhila", "naukri", "kamra", "padhai", "batao", "bataiye", "jaankari"
])

COLLEGE_COMPOUND_PHRASES = [
    "computer science", "artificial intelligence", "data science",
    "b tech", "b.tech", "m tech", "m.tech", "information technology",
    "fee structure", "admission process", "average package", "highest package"
]


async def gate_transcript(
    transcript: str,
    college_name: str = "College",
    base_domain: str = "college.edu",
    history: Optional[List[Dict[str, str]]] = None,
    language: str = "en-IN"
) -> Dict[str, Any]:
    """
    Returns:
        {
            should_respond: bool,
            reason: str,
            intent: str,   # college_query|greeting|off_topic|chatter|filler|empty|bad_script
            reply_text: str  # for greeting/off_topic, populated template
        }
    """
    history = history or []
    text = transcript.strip()
    lower = text.lower()
    words = re.findall(r"[\w']+", lower)

    # 1. Empty
    if not text:
        return _silent("empty", "Empty transcript.")

    # 1b. Bare URL / domain echo rejection (prevents AI speaker loopback from triggering search)
    clean_domain = base_domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").strip("/")
    clean_college = college_name.lower().replace("https://", "").replace("http://", "").replace("www.", "").strip("/")
    clean_lower = lower.replace("https://", "").replace("http://", "").replace("www.", "").strip("/")

    if (
        re.match(r"^https?://[^\s]+$", text.strip(), re.I)
        or re.match(r"^www\.[^\s]+$", text.strip(), re.I)
        or clean_lower == clean_domain
        or clean_lower == clean_college
        or clean_lower.replace(" ", "") == clean_domain.replace(" ", "")
        or clean_lower.replace(" ", "") == clean_college.replace(" ", "")
    ):
        return _silent("domain_echo", "Bare URL or domain echo detected.")

    # 2. Bad script (non-Latin, non-Devanagari dominant)
    script = _dominant_script(text)
    if script == "other":
        return _silent("bad_script", "Non-Latin/Devanagari script detected.")

    # 3. Greeting standalone (common short greetings and greeting + "there")
    greeting_tokens = {"hi", "hello", "hey", "namaste", "namaskar", "hii", "helloo", "hola", "there"}
    greeting_variants = {"good", "morning", "afternoon", "evening"}
    greeting_words = [w for w in words if w not in {"there", "buddy", "friend", "sir", "maam", "madam"}]
    pure_greeting = len(greeting_words) <= 3 and all(w in greeting_tokens or w in greeting_variants for w in greeting_words)
    if pure_greeting and greeting_words:
        return _respond_greeting(college_name, language)

    # 4. College keyword fast path — checks specific college queries (even 1-word like "Fees?", "Hostel?", "Eligibility?")
    words_set = set(words)
    if any(kw in words_set for kw in COLLEGE_INQUIRY_WORDS) or any(phrase in lower for phrase in COLLEGE_COMPOUND_PHRASES):
        return {
            "should_respond": True,
            "reason": "college_keyword_fast_path",
            "intent": "college_query",
            "reply_text": ""
        }

    # 5. Filler only (no real meaningful words)
    meaningful = [w for w in words if w not in _FILLERS and len(w) >= 2]
    if not meaningful:
        return _silent("filler", "Filler-only transcript.")

    # 6. Too short (<2 meaningful words and not a recognized college keyword)
    if len(meaningful) < 2:
        return _silent("too_short", "Transcript too short to be a meaningful query.")

    # 7. Repeated tokens (e.g. "hello hello hello" or "paisa paisa paisa")
    if len(set(words)) < max(1, len(words) // 2):
        return _silent("repeated_tokens", "Repeated tokens detected.")

    # 8. Widen off-topic signals (no college context at all)
    off_topic_signals = [
        r"\b(weather|cricket|ipl|score|movie|film|recipe|song|music|news|bitcoin|stock|share market)\b",
        r"\b(prime minister|president|election|politics|sport|football|basketball)\b",
        r"\b(restaurant|hotel|travel|tour|visa|passport)\b",
    ]
    col_name_lower = college_name.lower()
    col_domain_lower = base_domain.lower()
    lower_no_punc = re.sub(r"[^a-z0-9 ]", " ", lower)
    has_college_ref = col_name_lower in lower or col_domain_lower in lower or any(kw in lower_no_punc.split() for kw in ["college", "university", "institute", "campus"])

    if not has_college_ref:
        for pat in off_topic_signals:
            if re.search(pat, lower):
                return _respond_off_topic(college_name, language)

    # 9. LLM classifier for ambiguous cases
    try:
        from app.services.llm.provider import get_llm_provider
        provider = get_llm_provider()
        if provider.primary_provider:
            classification = await _classify_with_llm(provider, transcript, college_name)
            intent = classification.strip().upper()
            if intent == "CHATTER":
                return _silent("chatter", "Classified as chatter by AI.")
            elif intent == "OFF_TOPIC":
                return _respond_off_topic(college_name, language)
            elif intent == "GREETING":
                return _respond_greeting(college_name, language)
            else:
                return {
                    "should_respond": True,
                    "reason": "llm_college_query",
                    "intent": "college_query",
                    "reply_text": ""
                }
    except Exception as e:
        print(f"[VoiceGate] LLM classifier error: {e}")

    # Default: respond (don't be overly restrictive)
    return {
        "should_respond": True,
        "reason": "default_pass",
        "intent": "college_query",
        "reply_text": ""
    }


async def _classify_with_llm(provider, transcript: str, college_name: str) -> str:
    prompt = (
        f'Classify this student voice transcript (context: asking about {college_name}).\n'
        f'Transcript: "{transcript}"\n\n'
        f'Reply with exactly ONE word:\n'
        f'COLLEGE_QUERY - a question about college admissions, fees, courses, placements, hostel, campus\n'
        f'GREETING - a greeting or introduction only\n'
        f'OFF_TOPIC - completely unrelated to college/education\n'
        f'CHATTER - background noise, random sounds, filler words, or casual side talk not addressed to the assistant\n'
        f'\nAnswer:'
    )
    result = await provider.generate_response(
        prompt=prompt,
        system_instruction="You are a voice transcript classifier. Reply with exactly one word: COLLEGE_QUERY, GREETING, OFF_TOPIC, or CHATTER."
    )
    # Extract first word
    first_word = re.findall(r"COLLEGE_QUERY|GREETING|OFF_TOPIC|CHATTER", result.upper())
    return first_word[0] if first_word else "COLLEGE_QUERY"


def _silent(intent: str, reason: str) -> Dict[str, Any]:
    return {
        "should_respond": False,
        "reason": reason,
        "intent": intent,
        "reply_text": ""
    }


def _respond_greeting(college_name: str, language: str = "en-IN") -> Dict[str, Any]:
    if language == "hi":
        text = _GREETING_HI
    else:
        text = f"Namaste! I am the official AI counselor for {college_name}. How can I help you with admissions, fees, courses, or hostels today?"
    return {
        "should_respond": True,
        "reason": "greeting",
        "intent": "greeting",
        "reply_text": text
    }


def _respond_off_topic(college_name: str, language: str = "en-IN") -> Dict[str, Any]:
    if language == "hi":
        text = _OFF_TOPIC_HI.format(college_name=college_name)
    else:
        text = _OFF_TOPIC_EN.format(college_name=college_name)
    return {
        "should_respond": True,
        "reason": "off_topic",
        "intent": "off_topic",
        "reply_text": text
    }
