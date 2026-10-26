import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_status():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "service" in data

def test_widget_js():
    res = client.get("/widget.js")
    assert res.status_code == 200
    assert "application/javascript" in res.headers.get("content-type", "")
    assert "UniversalAgentWidget" in res.text

def test_list_agents():
    res = client.get("/api/agents")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_list_college_projects():
    res = client.get("/api/web-search/projects")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_list_hardcoded_bots():
    res = client.get("/api/hardcoded-bots")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_list_scraper_jobs():
    res = client.get("/api/scraper/jobs")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_lead_engine_capture_endpoint():
    payload = {
        "name": "Integration Test Student",
        "phone": "+91 99999 88888",
        "course": "B.Tech",
        "branch": "Computer Science (CSE)",
        "city": "Jaipur",
        "state": "Rajasthan"
    }
    res = client.post("/api/lead-engine/capture", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Integration Test Student"
    assert "score" in data
    assert "tier" in data

def test_college_voice_session_not_found():
    res = client.post("/api/college-voice/session", json={
        "project_id": "proj_non_existent_random_xyz_999"
    })
    assert res.status_code == 404

