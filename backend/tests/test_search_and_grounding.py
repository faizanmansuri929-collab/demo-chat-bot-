import pytest
from app.services.web_search.intent_router import classify_college_intent
from app.services.web_search.voice_gate import gate_transcript
from app.services.hardcoded.matcher import match_query_to_faqs
from app.services.web_search.allowlist import is_allowed_domain_url

def test_domain_allowlist_checker():
    assert is_allowed_domain_url("https://www.poornima.org/admissions")
    assert is_allowed_domain_url("https://poornima.org/fees")
    assert not is_allowed_domain_url("https://malicious-domain.com/phish")
    assert not is_allowed_domain_url("")

def test_intent_classification():
    fees_res = classify_college_intent("What is the fee structure for B.Tech CSE?", "Poornima", "poornima.org")
    assert fees_res["intent"] == "fees_scholarships"

    hostel_res = classify_college_intent("hostel room charges and mess details", "Poornima", "poornima.org")
    assert hostel_res["intent"] == "hostel_mess"

    placement_res = classify_college_intent("highest package and placement records", "Poornima", "poornima.org")
    assert placement_res["intent"] == "placements_recruiters"

    off_topic = classify_college_intent("Tell me about the solar system and planets", "Poornima", "poornima.org")
    assert off_topic.get("is_off_topic") is True

@pytest.mark.anyio
async def test_voice_gate_ambient_noise_rejection():
    # Ambient chatter / fillers must not respond
    res = await gate_transcript(
        transcript="um hmm ah okay",
        college_name="Test College",
        base_domain="testcollege.edu"
    )
    assert res["should_respond"] is False

@pytest.mark.anyio
async def test_voice_gate_greeting():
    res = await gate_transcript(
        transcript="Hello good morning",
        college_name="Test College",
        base_domain="testcollege.edu"
    )
    assert res["should_respond"] is True
    assert res["intent"] == "greeting"

