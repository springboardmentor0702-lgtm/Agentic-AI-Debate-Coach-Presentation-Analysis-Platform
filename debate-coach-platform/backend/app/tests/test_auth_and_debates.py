import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"

from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import create_app


def setup_module():
    Base.metadata.create_all(bind=engine)


def teardown_module():
    Base.metadata.drop_all(bind=engine)


def test_register_and_login_user():
    app = create_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Jane Doe",
            "email": "jane@example.com",
            "password": "StrongPass123!",
            "role": "LEARNER",
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["user"]["email"] == "jane@example.com"
    assert "access_token" in body
    assert "refresh_token" in body

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "jane@example.com", "password": "StrongPass123!"},
    )
    assert login.status_code == 200, login.text
    assert login.json()["user"]["email"] == "jane@example.com"


def test_create_debate_requires_auth():
    app = create_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/debates",
        json={
            "title": "AI in Education",
            "topic": "Should AI replace teachers?",
            "format": "ONE_ON_ONE",
            "user_position": "AGAINST",
            "ai_position": "FOR",
        },
    )
    assert response.status_code == 401


def test_create_debate_after_login():
    app = create_app()
    client = TestClient(app)

    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "John Student",
            "email": "john@example.com",
            "password": "StrongPass123!",
            "role": "LEARNER",
        },
    )

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "john@example.com", "password": "StrongPass123!"},
    )
    token = login.json()["access_token"]

    response = client.post(
        "/api/v1/debates",
        json={
            "title": "AI in Education",
            "topic": "Should AI replace teachers?",
            "format": "ONE_ON_ONE",
            "user_position": "AGAINST",
            "ai_position": "FOR",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["topic"] == "Should AI replace teachers?"


def test_greetings_and_nonsense_are_rejected_for_debate_topic():
    app = create_app()
    client = TestClient(app)

    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Maria Student",
            "email": "maria@example.com",
            "password": "StrongPass123!",
            "role": "LEARNER",
        },
    )

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "maria@example.com", "password": "StrongPass123!"},
    )
    token = login.json()["access_token"]

    debate = client.post(
        "/api/v1/debates",
        json={
            "title": "AI in Education",
            "topic": "Should AI replace teachers?",
            "format": "ONE_ON_ONE",
            "user_position": "AGAINST",
            "ai_position": "FOR",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    debate_id = debate.json()["id"]

    for message in ["hello hello", "asdf asdf", "stupid words"]:
        response = client.post(
            f"/api/v1/debates/{debate_id}/message",
            json={"message": message},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200, response.text
        body = response.json()
        assert "debate subject" in body["ai_response"].lower()
        assert body["argument_analysis"]["clarity_score"] == 0
        assert body["argument_analysis"]["relevance_score"] == 0


def test_valid_turn_gets_opponent_reply_and_final_feedback_has_strengths_and_weaknesses():
    app = create_app()
    client = TestClient(app)

    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Debate Feedback User",
            "email": "debate-feedback@example.com",
            "password": "StrongPass123!",
            "role": "LEARNER",
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "debate-feedback@example.com", "password": "StrongPass123!"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    debate = client.post(
        "/api/v1/debates",
        json={
            "title": "Climate Debate",
            "topic": "Should governments prioritize climate action over economic growth?",
            "format": "ONE_ON_ONE",
            "user_position": "FOR",
            "ai_position": "AGAINST",
        },
        headers=headers,
    )
    debate_id = debate.json()["id"]

    turn = client.post(
        f"/api/v1/debates/{debate_id}/message",
        json={"message": "Governments should prioritize climate action because delayed action creates greater long-term economic costs."},
        headers=headers,
    )
    assert turn.status_code == 200, turn.text
    assert "Your claim needs clearer evidence" not in turn.json()["ai_response"]
    assert "climate" in turn.json()["ai_response"].lower()

    completion = client.post(f"/api/v1/debates/{debate_id}/complete", headers=headers)
    assert completion.status_code == 200, completion.text
    final_analysis = completion.json()["argument_analysis"]
    assert final_analysis["strengths"]
    assert final_analysis["weaknesses"]
