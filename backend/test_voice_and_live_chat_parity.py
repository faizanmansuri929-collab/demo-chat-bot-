import asyncio
import os
from dotenv import load_dotenv
load_dotenv("backend/.env")

from app.core.database import SessionLocal, Base, engine
from app.models.schemas import CollegeWebSearchProjectDB, CollegeWebSourceDB, ChatMessage
from app.services.web_search.allowlist import seed_poornima_allowlist
from app.services.web_search.search_engine import select_and_fetch_college_sources
from app.services.web_search.generator import generate_college_web_search_answer
from app.api.routes.college_voice import voice_turn, VoiceTurnRequest, execute_voice_search_tool, VoiceSearchToolRequest

async def test_voice_and_live_chat_parity():
    print("\n=================================================================")
    print("  VERIFYING SITEMAP SEARCH (3-5 URLs), TEXT OUTPUT & SPOKEN SUMMARY ")
    print("=================================================================\n")
    db = SessionLocal()
    seed_poornima_allowlist(db)

    project_id = "proj_poornima"
    query = "What is the B.Tech CSE fee structure, admission criteria, and hostel charges?"

    # 1. Test Dynamic 3-5 URL Sitemap Selection
    print("[1] Testing Sitemap 3-5 URL Selection for query:", query)
    candidates, selected, intent_info, reason, college_name = await select_and_fetch_college_sources(
        project_id=project_id,
        user_message=query,
        history=[],
        db=db,
        max_sources=5,
        voice_mode=True
    )
    print(f"  -> Candidate sources available: {len(candidates)}")
    print(f"  -> Selected sources count: {len(selected)} (Must be between 3 and 5)")
    assert 3 <= len(selected) <= 5, f"Expected 3-5 sources, got {len(selected)}"
    for idx, s in enumerate(selected, 1):
        print(f"     [{idx}] {s.get('title')} ({s.get('url')})")

    # 2. Test End-to-End Generation produces both Text Result Output AND Spoken Summary
    print("\n[2] Testing generate_college_web_search_answer...")
    chat_res = await generate_college_web_search_answer(
        project_id=project_id,
        user_message=query,
        history=[],
        include_debug=True,
        db=db,
        voice_mode=True
    )
    print(f"  -> Sources Used Count: {chat_res.sources_used_count}")
    assert 3 <= chat_res.sources_used_count <= 5, f"Expected 3-5 sources used, got {chat_res.sources_used_count}"
    
    print("\n--- TEXT RESULT OUTPUT (for on-screen display) ---")
    print(chat_res.answer[:400] + "...\n")
    assert len(chat_res.answer) > 100
    assert "poornima" in chat_res.answer.lower() or "fee" in chat_res.answer.lower()

    print("--- REAL-TIME SPOKEN SUMMARY (for GPT voice audio) ---")
    print(chat_res.spoken_summary + "\n")
    assert chat_res.spoken_summary and len(chat_res.spoken_summary) > 20
    # Spoken summary should not contain raw table markdown delimiters
    assert "[TABLE START]" not in chat_res.spoken_summary
    assert "```" not in chat_res.spoken_summary

    # 3. Test POST /college-voice/turn (User Voice Input endpoint)
    print("[3] Testing POST /college-voice/turn (voice transcript flow)...")
    turn_req = VoiceTurnRequest(
        project_id=project_id,
        transcript=query,
        language_hint="en-IN",
        history=[]
    )
    turn_res = await voice_turn(payload=turn_req, db=db)
    assert turn_res.should_respond is True
    assert turn_res.found is True
    assert 3 <= len(turn_res.sources) <= 5, f"Expected 3-5 sources in VoiceTurnResponse, got {len(turn_res.sources)}"
    assert turn_res.display_markdown == chat_res.answer or len(turn_res.display_markdown) > 100
    assert turn_res.spoken_summary and len(turn_res.spoken_summary) > 20
    print(f"  -> VoiceTurnResponse display_markdown length: {len(turn_res.display_markdown)}")
    print(f"  -> VoiceTurnResponse spoken_summary: {turn_res.spoken_summary}")
    print(f"  -> VoiceTurnResponse sources count: {len(turn_res.sources)}")

    # 4. Test POST /college-voice/search-tool (Text input in voice feature)
    print("\n[4] Testing POST /college-voice/search-tool (text query in voice feature)...")
    tool_req = VoiceSearchToolRequest(
        project_id=project_id,
        query=query,
        language="en-IN",
        max_sources=5
    )
    tool_res = await execute_voice_search_tool(payload=tool_req, db=db)
    assert 3 <= len(tool_res.sources) <= 5, f"Expected 3-5 sources in tool response, got {len(tool_res.sources)}"
    assert tool_res.detailed_answer and len(tool_res.detailed_answer) > 100
    assert tool_res.summary_for_voice and len(tool_res.summary_for_voice) > 20
    print(f"  -> SearchToolResponse sources count: {len(tool_res.sources)}")
    print(f"  -> SearchToolResponse summary_for_voice: {tool_res.summary_for_voice}")

    # 5. Test Hindi / Hinglish Query
    print("\n[5] Testing Hinglish Voice Query...")
    hi_query = "B.Tech CSE ki fees kitni hai aur hostel ka kharcha kitna hai?"
    turn_hi_req = VoiceTurnRequest(
        project_id=project_id,
        transcript=hi_query,
        language_hint="hi",
        history=[]
    )
    turn_hi_res = await voice_turn(payload=turn_hi_req, db=db)
    assert turn_hi_res.should_respond is True
    assert 3 <= len(turn_hi_res.sources) <= 5
    assert turn_hi_res.spoken_summary and len(turn_hi_res.spoken_summary) > 20
    print(f"  -> Hinglish spoken_summary: {turn_hi_res.spoken_summary}")

    print("\n=================================================================")
    print("  ALL PARITY TESTS PASSED! SITEMAP (3-5 URLs), TEXT & AUDIO READY ")
    print("=================================================================\n")

if __name__ == "__main__":
    asyncio.run(test_voice_and_live_chat_parity())

