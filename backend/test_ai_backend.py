import os
import unittest
from pathlib import Path


TEST_DB = Path(__file__).with_name(".test_ai_backend.db")
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["SECRET_KEY"] = "test-secret-key"

from fastapi.testclient import TestClient

from main import app
from database import SessionLocal
import models
from services.ai_engine import AIEngine


class BackendAndAIIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        first = cls.client.post(
            "/api/v1/auth/register",
            json={"email": "intern@example.com", "password": "strong-pass-123", "full_name": "Intern User"},
        )
        cls.assertEqual = unittest.TestCase.assertEqual
        if first.status_code not in (200, 400):
            raise AssertionError(first.text)
        login = cls.client.post(
            "/api/v1/auth/login",
            json={"email": "intern@example.com", "password": "strong-pass-123"},
        )
        if login.status_code != 200:
            raise AssertionError(login.text)
        cls.token = login.json()["access_token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}"}
        cls.user_id = login.json()["user_id"]

    def test_deterministic_argument_analysis_and_fallacy_explanation(self):
        engine = AIEngine()
        argument = "Everyone knows this policy always works because an expert said it does."
        first = engine.analyze_argument(argument)
        second = engine.analyze_argument(argument)
        self.assertEqual(first, second)
        self.assertEqual({item["fallacy_type"] for item in first["fallacies"]}, {"Appeal to Authority", "Hasty Generalization"})
        self.assertGreaterEqual(first["logical_consistency"], 0)
        self.assertLessEqual(first["logical_consistency"], 100)

    def test_authenticated_session_analysis_and_persistence(self):
        session_response = self.client.post(
            "/api/v1/sessions/create",
            headers=self.headers,
            json={"title": "Test debate", "topic": "Should AI be regulated?"},
        )
        self.assertEqual(session_response.status_code, 200, session_response.text)
        session_id = session_response.json()["id"]

        analysis_response = self.client.post(
            "/api/v1/argument-analysis/evaluate",
            headers=self.headers,
            json={
                "session_id": session_id,
                "speech_text": "According to a 2025 study, transparent audits reduce risk by 30 percent.",
            },
        )
        self.assertEqual(analysis_response.status_code, 200, analysis_response.text)
        self.assertIn("counterarguments", analysis_response.json())

        speech_response = self.client.post(
            "/api/v1/presentation-analysis/evaluate",
            headers=self.headers,
            json={
                "session_id": session_id,
                "speech_text": "We should examine the evidence and compare alternatives.",
                "audio_duration_seconds": 30,
            },
        )
        self.assertEqual(speech_response.status_code, 200, speech_response.text)
        self.assertGreaterEqual(speech_response.json()["speech_pace_wpm"], 0)

    def test_simulation_turns_are_persisted_and_indexed(self):
        session_response = self.client.post(
            "/api/v1/sessions/create",
            headers=self.headers,
            json={"title": "Simulation", "topic": "Remote work"},
        )
        session_id = session_response.json()["id"]
        payload = {"session_id": session_id, "user_argument": "Remote work improves access to talent.", "opponent_persona": "The Academic"}
        first = self.client.post("/api/v1/simulation/turn", headers=self.headers, json=payload)
        second = self.client.post("/api/v1/simulation/turn", headers=self.headers, json=payload)
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(first.json()["turn_index"], 1)
        self.assertEqual(second.json()["turn_index"], 2)

        db = SessionLocal()
        try:
            turns = db.query(models.SimulationTurn).filter(models.SimulationTurn.session_id == session_id).all()
            self.assertEqual(len(turns), 2)
        finally:
            db.close()

    def test_session_ownership_is_enforced(self):
        other = self.client.post(
            "/api/v1/auth/register",
            json={"email": "other@example.com", "password": "strong-pass-456", "full_name": "Other User"},
        )
        self.assertIn(other.status_code, (200, 400))
        other_login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "other@example.com", "password": "strong-pass-456"},
        )
        other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}
        session_response = self.client.post(
            "/api/v1/sessions/create",
            headers=self.headers,
            json={"title": "Private", "topic": "Ownership"},
        )
        session_id = session_response.json()["id"]
        forbidden = self.client.get(f"/api/v1/sessions/{session_id}", headers=other_headers)
        self.assertEqual(forbidden.status_code, 404)

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")


if __name__ == "__main__":
    unittest.main()
