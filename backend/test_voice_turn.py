import asyncio
import os
from app.core.database import SessionLocal, Base, engine
from app.models.schemas import CollegeWebSearchProjectDB, CollegeWebSourceDB, ChatMessage
from app.services.web_search.allowlist import seed_poornima_allowlist
from app.services.web_search.voice_gate import gate_transcript
from app.services.web_search.voice_summary import build_spoken_summary
from app.services.web_search.generator import generate_college_web_search_answer
from app.services.web_search.intent_router import classify_college_intent

Base.metadata.create_all(bind=engine)

async def run_voice_turn_tests():
    print("\n=======================================================")
    print("      COLLEGE VOICE DESK & /TURN VERIFICATION SUITE    ")
    print("=======================================================\n")
    db = SessionLocal()

    # Seed default Poornima project for testing
    seed_poornima_allowlist(db)
    project_id = "proj_poornima"
    project = db.query(CollegeWebSearchProjectDB).filter(CollegeWebSearchProjectDB.id == project_id).first()
    assert project is not None
    college_name = project.college_name
    base_domain = project.base_domain

    # -----------------------------------------------------------------
    # Test 1: English Greeting
    # -----------------------------------------------------------------
    print("[Test 1] English Greeting...")
    gate_res = await gate_transcript(
        transcript="Hello, good morning!",
        college_name=college_name,
        base_domain=base_domain
    )
    assert gate_res["should_respond"] is True
    assert gate_res["intent"] == "greeting"
    assert "Namaste" in gate_res["reply_text"]
    print("  -> Passed: Greeting responded with warm welcome greeting.")

    # -----------------------------------------------------------------
    # Test 2: Hinglish Fee Question
    # -----------------------------------------------------------------
    print("\n[Test 2] Hinglish Fee Question...")
    fee_q = "B.Tech CSE ki fees kitni hai aur total kharcha kitna lagega?"
    gate_res = await gate_transcript(
        transcript=fee_q,
        college_name=college_name,
        base_domain=base_domain
    )
    assert gate_res["should_respond"] is True
    assert gate_res["intent"] == "college_query"

    intent_info = classify_college_intent(fee_q, college_name=college_name, base_domain=base_domain)
    assert intent_info["intent"] == "fees_scholarships"
    spoken = build_spoken_summary(
        intent=intent_info["intent"],
        college_name=college_name,
        language="hi"
    )
    assert "fees" in spoken.lower() or "kharcha" in spoken.lower() or "verified" in spoken.lower()
    print("  -> Passed: Hinglish fees detected correctly, spoken summary generated.")

    # -----------------------------------------------------------------
    # Test 3: Follow-up Query ("aur hostel?")
    # -----------------------------------------------------------------
    print("\n[Test 3] Hinglish Follow-up Query ('aur hostel?')...")
    history_ctx = [
        {"role": "user", "content": "B.Tech CSE fees kitni hai?"},
        {"role": "assistant", "content": "B.Tech CSE annual fee is 1.2 Lakhs."}
    ]
    follow_up_q = "aur hostel?"
    intent_follow_up = classify_college_intent(
        follow_up_q,
        college_name=college_name,
        base_domain=base_domain,
        history=history_ctx
    )
    assert intent_follow_up["intent"] == "hostel_mess"
    print("  -> Passed: Context resolution resolved 'aur hostel?' to hostel_mess.")

    # -----------------------------------------------------------------
    # Test 4: Filler / Ambient Chatter Transcripts -> Silent (should_respond=False)
    # -----------------------------------------------------------------
    print("\n[Test 4] Filler / Chatter noise rejection (Must be silent)...")
    chatter_cases = [
        "hmm",
        "theek hai",
        "haan ok",
        "arrey chalo",
        "ok okay",
        "acha acha",
        "a"
    ]
    for noise in chatter_cases:
        gate_res = await gate_transcript(
            transcript=noise,
            college_name=college_name,
            base_domain=base_domain
        )
        assert gate_res["should_respond"] is False, f"Expected '{noise}' to be silent, got: {gate_res}"
    print(f"  -> Passed: All {len(chatter_cases)} ambient chatter cases rejected silently.")

    # -----------------------------------------------------------------
    # Test 5: Foreign / Arabic / Urdu script noise -> Silent (should_respond=False)
    # -----------------------------------------------------------------
    print("\n[Test 5] Foreign / Non-Latin / Non-Devanagari script noise rejection...")
    foreign_noise = "مرحبا كيف حالك اليوم هنا"
    gate_res = await gate_transcript(
        transcript=foreign_noise,
        college_name=college_name,
        base_domain=base_domain
    )
    assert gate_res["should_respond"] is False
    assert gate_res["reason"] == "bad_script" or gate_res["intent"] in ("bad_script", "chatter")
    print("  -> Passed: Foreign script noise correctly rejected as bad_script.")

    # -----------------------------------------------------------------
    # Test 6: Off-topic Query -> Polite Refusal
    # -----------------------------------------------------------------
    print("\n[Test 6] Off-topic Query (Weather / IPL / Bollywood)...")
    off_topic_q = "What is the weather today and who won the IPL cricket match?"
    gate_res = await gate_transcript(
        transcript=off_topic_q,
        college_name=college_name,
        base_domain=base_domain
    )
    assert gate_res["should_respond"] is True
    assert gate_res["intent"] == "off_topic"
    assert "only answer questions about" in gate_res["reply_text"].lower() or "sirf" in gate_res["reply_text"].lower()
    print("  -> Passed: Off-topic inquiry triggered polite domain refusal.")

    # -----------------------------------------------------------------
    # Test 7: Unknown Project ID -> 404 Error
    # -----------------------------------------------------------------
    print("\n[Test 7] Unknown Project ID (Must return 404, not fallback to poornima)...")
    from fastapi import HTTPException
    unknown_proj_id = "proj_unknown_random_99999"
    try:
        await generate_college_web_search_answer(
            project_id=unknown_proj_id,
            user_message="What is the fee?",
            history=[],
            db=db
        )
        assert False, "Expected HTTPException 404 for unknown project!"
    except HTTPException as e:
        assert e.status_code == 404
        assert "not found" in e.detail.lower()
        print(f"  -> Passed: Unknown project returned HTTP 404 ({e.detail}).")

    # -----------------------------------------------------------------
    # Test 8: Non-Poornima Project Isolation (No Poornima String Leaks)
    # -----------------------------------------------------------------
    print("\n[Test 8] Non-Poornima Project Isolation (Zero string leakage)...")
    test_college_id = "proj_test_apex_institute"
    # Create or retrieve test college project
    existing = db.query(CollegeWebSearchProjectDB).filter(CollegeWebSearchProjectDB.id == test_college_id).first()
    if not existing:
        new_proj = CollegeWebSearchProjectDB(
            id=test_college_id,
            college_name="Apex Institute of Technology",
            sitemap_url="https://www.apextech.edu/sitemap.xml",
            base_domain="apextech.edu",
            institute_type="engineering",
            status="READY",
            total_urls=5,
            active_urls=5
        )
        db.add(new_proj)
        # Add sample source
        src = CollegeWebSourceDB(
            id="src_apex_1",
            project_id=test_college_id,
            url="https://www.apextech.edu/admissions/fees",
            title="Apex Institute Fee Structure",
            category="Admissions",
            source_type="HTML",
            is_enabled=1,
            content_full="[TABLE START]\nProgram | Annual Fee\nB.Tech CSE | ₹ 95,000\n[TABLE END]",
            content_snippet="B.Tech CSE Annual Fee ₹ 95,000"
        )
        db.add(src)
        db.commit()

    # Run query on Apex Institute
    apex_res = await generate_college_web_search_answer(
        project_id=test_college_id,
        user_message="What is the fee for B.Tech CSE at Apex Institute?",
        history=[],
        db=db,
        voice_mode=True
    )
    assert apex_res.college_name == "Apex Institute of Technology"
    assert "poornima" not in apex_res.answer.lower()
    assert "poornima" not in apex_res.college_name.lower()
    for s in apex_res.sources:
        assert "poornima" not in s.url.lower()
    print("  -> Passed: Non-Poornima project response contains zero Poornima references.")

    print("\n=======================================================")
    print("      ALL TESTS PASSED WITH 100% SUCCESS RATE!        ")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_voice_turn_tests())
