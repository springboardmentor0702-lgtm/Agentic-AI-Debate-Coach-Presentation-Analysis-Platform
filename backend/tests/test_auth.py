import pytest


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "debate-coach-api"


def test_user_registration(client):
    payload = {
        "name": "Alex Debater",
        "email": f"alex_{pytest.__version__}@test.com",
        "password": "SecurePassword123!",
        "role": "learner"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code in [200, 409]
    if response.status_code == 200:
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "learner"


def test_user_login(client, test_user):
    payload = {
        "email": "test_debater@example.com",
        "password": "password123"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test_debater@example.com"


def test_user_me(client, test_user):
    response = client.get("/api/auth/me", headers=test_user["headers"])
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test_debater@example.com"
    assert "experience_level" in data
