import pytest
from pydantic import ValidationError
from app.models.schemas import (
    CreateAgentRequest, CreateScrapeJobRequest,
    CreateHardcodedBotRequest, CreateCollegeProjectRequest
)
from app.api.routes.college_voice import CreateVoiceSessionRequest

def test_create_agent_request_validation():
    req = CreateAgentRequest(url="https://example.com", name="Example Bot")
    assert req.url == "https://example.com"
    assert req.name == "Example Bot"
    assert req.scope == "entire_website"

def test_voice_session_vad_clamping():
    # Test vad_threshold clamped between 0.2 and 0.9
    req_low = CreateVoiceSessionRequest(project_id="proj_test", vad_threshold=0.05)
    assert req_low.vad_threshold == 0.2

    req_high = CreateVoiceSessionRequest(project_id="proj_test", vad_threshold=1.5)
    assert req_high.vad_threshold == 0.9

    # Test silence_duration_ms clamped between 200 and 3000
    req_silence_low = CreateVoiceSessionRequest(project_id="proj_test", silence_duration_ms=50)
    assert req_silence_low.silence_duration_ms == 200

    req_silence_high = CreateVoiceSessionRequest(project_id="proj_test", silence_duration_ms=10000)
    assert req_silence_high.silence_duration_ms == 3000

def test_voice_session_missing_project_id():
    with pytest.raises(ValidationError):
        CreateVoiceSessionRequest(project_id="")

def test_create_scrape_job_request():
    req = CreateScrapeJobRequest(url="https://instamart.in/c/test", max_products=25)
    assert req.url == "https://instamart.in/c/test"
    assert req.max_products == 25

