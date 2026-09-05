import os
import io
import struct
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
from routers.auth import hash_password
from migrations import CURRENT_SCHEMA_VERSION, run_migrations


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

    def test_audio_upload_analysis_returns_real_signal_metrics(self):
        session_response = self.client.post(
            "/api/v1/sessions/create",
            headers=self.headers,
            json={"title": "Audio analysis", "topic": "Speech analytics"},
        )
        self.assertEqual(session_response.status_code, 200, session_response.text)
        session_id = session_response.json()["id"]
        sample_rate = 16000
        samples = []
        for index in range(sample_rate):
            amplitude = 12000 if index < sample_rate // 2 else 0
            samples.append(struct.pack("<h", amplitude if index % 80 < 40 else -amplitude))
        audio = io.BytesIO()
        import wave
        with wave.open(audio, "wb") as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(sample_rate); wav.writeframes(b"".join(samples))
        response = self.client.post(
            "/api/v1/presentation-analysis/analyze-audio",
            headers=self.headers,
            data={"session_id": str(session_id), "transcript": "This is a clear argument."},
            files={"audio_file": ("speech.wav", audio.getvalue(), "audio/wav")},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertGreater(response.json()["duration_seconds"], 0)
        self.assertIn("pause_count", response.json())
        self.assertIn("average_volume_percent", response.json())
        db = SessionLocal()
        try:
            metric = (
                db.query(models.PresentationMetric)
                .filter(models.PresentationMetric.session_id == session_id)
                .order_by(models.PresentationMetric.id.desc())
                .first()
            )
            self.assertIsNotNone(metric)
            self.assertGreater(metric.duration_seconds, 0)
            self.assertIsNotNone(metric.pause_count)
        finally:
            db.close()

    def test_public_registration_cannot_self_assign_privileged_role(self):
        response = self.client.post(
            "/api/v1/auth/register",
            json={"email": "admin-attempt@example.com", "password": "strong-pass-789", "full_name": "Role Test", "role": "Administrator"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["role"], "Learner")

    def test_report_exports_are_authenticated_and_nonempty(self):
        session_response = self.client.post(
            "/api/v1/sessions/create",
            headers=self.headers,
            json={"title": "Report", "topic": "Export quality"},
        )
        session_id = session_response.json()["id"]
        summary = self.client.get(f"/api/v1/reports/export/summary/{session_id}", headers=self.headers)
        pdf = self.client.get(f"/api/v1/reports/export/pdf/{session_id}", headers=self.headers)
        excel = self.client.get(f"/api/v1/reports/export/excel/{session_id}", headers=self.headers)
        self.assertEqual(summary.status_code, 200, summary.text)
        self.assertEqual(pdf.status_code, 200, pdf.text)
        self.assertEqual(excel.status_code, 200, excel.text)
        self.assertTrue(pdf.content.startswith(b"%PDF"))
        self.assertGreater(len(excel.content), 100)

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

    def test_workflow_progress_and_oauth_exclusion(self):
        db = SessionLocal()
        try:
            user = db.query(models.User).filter(models.User.id == self.user_id).first()
            user.role = "Learner"
            db.commit()
        finally:
            db.close()
        progress = self.client.put(
            "/api/v1/workflows/progress/me",
            headers=self.headers,
            json={"skill": "Rebuttal", "score": 82.5, "practice_count": 3, "streak_days": 2},
        )
        self.assertEqual(progress.status_code, 200, progress.text)
        self.assertEqual(progress.json()["skill"], "Rebuttal")
        listed = self.client.get("/api/v1/workflows/progress/me", headers=self.headers)
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertTrue(any(item["skill"] == "Rebuttal" for item in listed.json()))

        db = SessionLocal()
        try:
            coach = models.User(
                email="coach-progress@example.com",
                hashed_password=hash_password("strong-coach-pass-123"),
                full_name="Progress Coach",
                role="Debate Coach",
            )
            db.add(coach)
            db.flush()
            db.add(models.CoachAssignment(coach_id=coach.id, learner_id=self.user_id, status="Active"))
            db.commit()
            coach_id = coach.id
        finally:
            db.close()
        coach_login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "coach-progress@example.com", "password": "strong-coach-pass-123"},
        )
        self.assertEqual(coach_login.status_code, 200, coach_login.text)
        coach_headers = {"Authorization": f"Bearer {coach_login.json()['access_token']}"}
        coach_progress = self.client.get(f"/api/v1/workflows/progress/{self.user_id}", headers=coach_headers)
        self.assertEqual(coach_progress.status_code, 200, coach_progress.text)
        self.assertTrue(any(item["skill"] == "Rebuttal" for item in coach_progress.json()))
        self.assertGreater(coach_id, 0)

        oauth = self.client.post("/api/v1/auth/oauth2/login?provider=Google")
        self.assertEqual(oauth.status_code, 404)

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")

    def test_schema_migrations_are_versioned_and_idempotent(self):
        self.assertEqual(run_migrations(__import__("database").engine), CURRENT_SCHEMA_VERSION)
        self.assertEqual(run_migrations(__import__("database").engine), CURRENT_SCHEMA_VERSION)

    def test_admin_user_management_is_protected_and_safe(self):
        db = SessionLocal()
        try:
            current_user = db.query(models.User).filter(models.User.id == self.user_id).first()
            current_user.role = "Administrator"
            db.commit()
        finally:
            db.close()

        listed = self.client.get("/api/v1/auth/admin/users", headers=self.headers)
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertTrue(all("hashed_password" not in user for user in listed.json()))

        demote_self = self.client.patch(
            f"/api/v1/auth/admin/users/{self.user_id}/role",
            headers=self.headers,
            json={"role": "Learner"},
        )
        self.assertEqual(demote_self.status_code, 400)


if __name__ == "__main__":
    unittest.main()
