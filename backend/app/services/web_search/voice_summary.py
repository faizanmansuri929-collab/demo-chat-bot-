"""
voice_summary.py – TASK C

Builds a concise 1-2 sentence spoken summary from the LLM answer.
Used by both /turn and /search-tool (deprecated wrapper).
"""

import re
from typing import Optional


def build_spoken_summary(
    intent: str,
    college_name: str,
    language: str = "en-IN",
    answer_markdown: Optional[str] = None
) -> str:
    """
    Returns a 1-2 sentence spoken summary appropriate for the detected intent.
    Falls back to extracting the first clean sentence from the answer markdown.
    """
    intent_lower = intent.lower()

    if language == "hi":
        return _hindi_summary(intent_lower, college_name, answer_markdown)
    else:
        return _english_summary(intent_lower, college_name, answer_markdown)


def _english_summary(intent: str, college_name: str, answer_markdown: Optional[str]) -> str:
    if intent in ("greeting", "bot_identity"):
        return (
            f"Namaste! I am the official AI counselor for {college_name}. "
            f"How can I help you with admissions, courses, fees, or hostels today?"
        )
    extracted = _extract_first_sentence(answer_markdown)
    if extracted and len(extracted) > 20 and not extracted.lower().startswith("here"):
        if not extracted.endswith("."):
            extracted += "."
        return f"{extracted} Complete details are displayed on your screen."
    if "fee" in intent or "scholarship" in intent:
        return (
            f"I found the verified fee structure and scholarship details from {college_name}'s official website. "
            f"Full tables are displayed on your screen."
        )
    if "hostel" in intent or "mess" in intent:
        return (
            f"I found the verified hostel accommodation and mess details from {college_name}'s official website. "
            f"Details are displayed on your screen."
        )
    if "placement" in intent:
        return (
            f"I found the latest verified placement packages and top recruiters from {college_name}'s official records. "
            f"Details are displayed on your screen."
        )
    if "admission" in intent:
        return (
            f"I found the verified admission criteria, eligibility, and process for {college_name}. "
            f"Details are displayed on your screen."
        )
    if "course" in intent or "btech" in intent or "program" in intent:
        return (
            f"I found the approved courses, branches, and specializations from {college_name}'s official website. "
            f"Details are listed on your screen."
        )
    if "faculty" in intent:
        return (
            f"I found faculty and staff information from {college_name}'s official website. "
            f"Details are displayed on your screen."
        )
    if "contact" in intent or "location" in intent:
        return (
            f"I found the official contact details and location for {college_name}. "
            f"Details are displayed on your screen."
        )
    if "event" in intent or "fest" in intent:
        return (
            f"I found the latest events and fests information from {college_name}'s official website. "
            f"Details are displayed on your screen."
        )
    # General / unknown intent – try to extract the first sentence from the answer
    if extracted:
        # Cap to ~150 chars for spoken comfort
        return extracted[:150] + ("..." if len(extracted) > 150 else "")
    return (
        f"I found the verified details from {college_name}'s official website. "
        f"Please check your screen for the full information."
    )


def _hindi_summary(intent: str, college_name: str, answer_markdown: Optional[str]) -> str:
    if intent in ("greeting", "bot_identity"):
        return f"Namaste! Main {college_name} ka official AI counselor hoon. Aap admissions, fees, courses ya hostel ke baare mein poochh sakte hain."
    extracted = _extract_first_sentence(answer_markdown)
    if extracted and any(h in extracted.lower() for h in ["hai", "shulk", "fees", "mein", "ka", "ki", "hazaar", "lakh", "kharcha"]):
        if not extracted.endswith("."):
            extracted += "."
        return f"{extracted} Saari verified details screen par show kar di hain."
    if "fee" in intent or "scholarship" in intent:
        return f"{college_name} ki verified fees structure aur scholarship details screen par show kar di hain."
    if "hostel" in intent or "mess" in intent:
        return f"{college_name} ke hostels aur mess facilities ki verified details screen par show ho rahi hain."
    if "placement" in intent:
        return f"{college_name} ke placement packages aur top recruiters ka verified record screen par show ho raha hai."
    if "admission" in intent:
        return f"{college_name} ke admission process aur eligibility criteria ki verified details screen par show ho rahi hain."
    if "course" in intent or "btech" in intent or "program" in intent:
        return f"{college_name} ke programs aur branches ki verified details screen par show kar di hain."
    if extracted and any(h in extracted.lower() for h in ["hai", "shulk", "fees", "mein", "ka", "ki", "hazaar", "lakh", "kharcha"]):
        return extracted[:150] + ("..." if len(extracted) > 150 else "")
    return f"{college_name} ki official website se verified details screen par show ho rahi hain."


def _extract_first_sentence(markdown: Optional[str]) -> str:
    """
    Extract the first meaningful sentence from markdown answer,
    stripping headings, bullets, and emoji.
    """
    if not markdown:
        return ""
    # Remove markdown headers, bullets, emoji-heavy lines
    lines = markdown.splitlines()
    candidates = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Skip heading lines
        if line.startswith("#"):
            continue
        # Skip pure bullet/list lines
        if line.startswith(("- ", "* ", "• ", "1.", "2.", "3.")):
            continue
        # Remove markdown bold/italic
        clean = re.sub(r"[*_`]", "", line)
        # Remove emoji (basic)
        clean = re.sub(r"[^\x00-\x7F\u0900-\u097F .,;:()\-']", "", clean).strip()
        if len(clean) > 20:
            candidates.append(clean)
    if not candidates:
        return ""
    first = candidates[0]
    # Split at first sentence boundary
    m = re.search(r"[.!?]", first)
    if m and m.start() > 15:
        return first[: m.start() + 1]
    return first[:120]
