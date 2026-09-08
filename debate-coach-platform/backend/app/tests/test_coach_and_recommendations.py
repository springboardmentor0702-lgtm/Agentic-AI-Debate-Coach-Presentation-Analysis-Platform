from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import create_app


def setup_module():
    Base.metadata.create_all(bind=engine)


def teardown_module():
    Base.metadata.drop_all(bind=engine)


def test_ai_coach_returns_contextual_response():
    app = create_app()
    client = TestClient(app)

    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Coach User",
            "email": "coach@example.com",
            "password": "StrongPass123!",
            "role": "LEARNER",
        },
    )

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "coach@example.com", "password": "StrongPass123!"},
    )
    token = login.json()["access_token"]

    response = client.post(
        "/api/v1/analysis/coach",
        json={
            "message": "How can I improve my rebuttal?",
            "context": {
                "topic": "AI in education",
                "position": "against",
                "last_feedback": "Your rebuttal needs stronger evidence and a clearer link to the topic."
            },
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert "response" in body
    assert "practice_prompt" in body
    assert "focus_areas" in body


def test_recommendations_endpoint_for_user():
    app = create_app()
    client = TestClient(app)

    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Rec User",
            "email": "rec@example.com",
            "password": "StrongPass123!",
            "role": "LEARNER",
        },
    )

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "rec@example.com", "password": "StrongPass123!"},
    )
    token = login.json()["access_token"]

    response = client.get(
        "/api/v1/analytics/me/recommendations",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert "weak_areas" in body
    assert "recommendations" in body
    assert "practice_plan" in body


def test_richer_debate_summary_endpoint():
    app = create_app()
    client = TestClient(app)

    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Summary User",
            "email": "summary@example.com",
            "password": "StrongPass123!",
            "role": "LEARNER",
        },
    )

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "summary@example.com", "password": "StrongPass123!"},
    )
    token = login.json()["access_token"]

    response = client.post(
        "/api/v1/analysis/debate-summary",
        json={
            "transcript": "I believe AI in education should be used carefully because it helps teachers personalize learning. For example, a teacher can use AI to grade essays faster and adapt lessons. However, excessive automation may reduce human connection, so the best model is hybrid learning.",
            "topic": "AI in education",
            "position": "against full replacement",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["overall_score"] > 0
    assert "category_scores" in body
    assert "speech_metrics" in body
    assert "fallacies" in body
