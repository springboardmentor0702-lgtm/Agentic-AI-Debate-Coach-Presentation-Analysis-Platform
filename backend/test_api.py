import json
import os
import urllib.error
import urllib.request
import unittest
import uuid

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")


@unittest.skipUnless(os.getenv("RUN_LIVE_API_TESTS") == "1", "Set RUN_LIVE_API_TESTS=1 with a running API server to execute live smoke tests.")
class TestLogosAPI(unittest.TestCase):
    session_id = None
    token = None
    headers = {}

    @classmethod
    def setUpClass(cls):
        email = f"integration-{uuid.uuid4().hex[:8]}@logos.ai"
        cls._request("/api/v1/auth/register", "POST", {
            "email": email,
            "password": "integration-password-123",
            "full_name": "Integration User",
        })
        login = cls._request("/api/v1/auth/login", "POST", {
            "email": email,
            "password": "integration-password-123",
        })
        cls.token = login["access_token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    @classmethod
    def _request(cls, path, method="GET", payload=None, headers=None):
        request_headers = {"Content-Type": "application/json", **(headers or {})}
        data = json.dumps(payload).encode() if payload is not None else None
        request = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=request_headers, method=method)
        with urllib.request.urlopen(request) as response:
            body = response.read()
            return json.loads(body.decode()) if body else {}

    def test_01_health(self):
        self.assertEqual(self._request("/health")["status"], "healthy")

    def test_02_debate_session_endpoints(self):
        payload = {
            "title": "Integration Test Debate Session",
            "topic": "Space exploration should be prioritized over deep ocean research.",
            "format": "Parliamentary Debate",
            "assigned_position": "Affirmative",
            "status": "Active",
        }
        result = self._request("/api/v1/sessions/create", "POST", payload, self.headers)
        self.assertEqual(result["topic"], payload["topic"])
        TestLogosAPI.session_id = result["id"]
        sessions = self._request("/api/v1/sessions/user/me", headers=self.headers)
        self.assertTrue(any(item["id"] == self.session_id for item in sessions))

    def test_03_ai_simulation_turn(self):
        result = self._request("/api/v1/simulation/turn", "POST", {
            "session_id": self.session_id,
            "user_argument": "Autonomous vehicles must be held to strict liability to align manufacturer incentives.",
            "opponent_persona": "The Contrarian",
        }, self.headers)
        self.assertIn("opponent_rebuttal", result)
        self.assertEqual(result["turn_index"], 1)

    def test_04_argument_evaluation(self):
        result = self._request("/api/v1/argument-analysis/evaluate", "POST", {
            "session_id": self.session_id,
            "speech_text": "Either we implement carbon taxes immediately or the planet will burn completely in five years.",
        }, self.headers)
        self.assertIn("fallacies", result)

    def test_05_presentation_analysis(self):
        result = self._request("/api/v1/presentation-analysis/evaluate", "POST", {
            "session_id": self.session_id,
            "speech_text": "Um, basically, we need to, like, look at the studies to understand the impact.",
            "audio_duration_seconds": 30.0,
        }, self.headers)
        self.assertGreaterEqual(result["speech_pace_wpm"], 0)

    def test_06_coaching_plan(self):
        profile = self._request("/api/v1/auth/profile/me", headers=self.headers)
        result = self._request(f"/api/v1/coaching/plan/{profile['id']}", headers=self.headers)
        self.assertIn("targeted_recommendations", result)

    def test_07_complete_session(self):
        result = self._request(f"/api/v1/sessions/{self.session_id}/complete", "POST", headers=self.headers)
        self.assertEqual(result["session_id"], self.session_id)


if __name__ == "__main__":
    unittest.main()
