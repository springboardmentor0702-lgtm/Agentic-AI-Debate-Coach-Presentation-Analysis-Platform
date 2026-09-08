import uuid

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_endpoints():
    assert client.get("/health/live").status_code == 200
    assert client.get("/health/ready").status_code == 200


def test_fallacy_catalog_is_available():
    response = client.get("/api/v1/fallacy-detection/supported-fallacies")
    assert response.status_code == 200
    assert any(item["name"] == "False Dilemma" for item in response.json())


def test_fallacy_audit_requires_authentication():
    response = client.post("/api/v1/fallacy-detection/audit", params={"speech_text": "either this or collapse"})
    assert response.status_code == 401


def test_authenticated_learner_can_create_and_record_session():
    email = f"test-{uuid.uuid4().hex}@example.com"
    registration = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "TestPass123!",
        "full_name": "API Test Learner",
        "role": "Learner"
    })
    assert registration.status_code == 200
    token = registration.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    session = client.post("/api/v1/sessions/create", headers=headers, json={
        "title": "API Test Session",
        "topic": "Test topic",
        "format": "Oxford Debate"
    })
    assert session.status_code == 200
    recording = client.post(f"/api/v1/sessions/{session.json()['id']}/recording", headers=headers, json={
        "transcript": "Test transcript",
        "duration_seconds": 12
    })
    assert recording.status_code == 200