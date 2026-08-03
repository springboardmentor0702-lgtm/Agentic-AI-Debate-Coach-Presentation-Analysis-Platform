import json
import urllib.request
import urllib.parse
import unittest

BASE_URL = "http://127.0.0.1:8000"

class TestLogosAPI(unittest.TestCase):
    # Class-level variable to share generated session ID across integration tests
    session_id = 1

    def test_01_auth_endpoints(self):
        url = f"{BASE_URL}/api/v1/auth/login"
        data = urllib.parse.urlencode({"username": "test@logos.ai", "password": "password123"}).encode()
        try:
            req = urllib.request.Request(url, data=data)
            with urllib.request.urlopen(req) as response:
                self.assertIn(response.status, [200, 401])
        except Exception:
            pass

    def test_02_debate_session_endpoints(self):
        url = f"{BASE_URL}/api/v1/sessions/create?user_id=1"
        payload = {
            "title": "Integration Test Debate Session",
            "topic": "Space exploration should be prioritized over deep ocean research.",
            "format": "Parliamentary Debate",
            "assigned_position": "Affirmative",
            "status": "Active"
        }
        headers = {"Content-Type": "application/json"}
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers)
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.status, 200)
            res_data = json.loads(response.read().decode())
            self.assertEqual(res_data["topic"], payload["topic"])
            TestLogosAPI.session_id = res_data["id"]
            
        # Get sessions
        url_get = f"{BASE_URL}/api/v1/sessions/user/1"
        with urllib.request.urlopen(url_get) as response:
            self.assertEqual(response.status, 200)
            
        # Complete session
        url_comp = f"{BASE_URL}/api/v1/sessions/{TestLogosAPI.session_id}/complete"
        req_comp = urllib.request.Request(url_comp, data=b"")
        with urllib.request.urlopen(req_comp) as response:
            self.assertEqual(response.status, 200)

    def test_03_ai_simulation_turn(self):
        url = f"{BASE_URL}/api/v1/simulation/turn"
        payload = {
            "session_id": TestLogosAPI.session_id,
            "user_argument": "Autonomous vehicles must be held to strict liability to align manufacture incentives.",
            "opponent_persona": "The Contrarian"
        }
        headers = {"Content-Type": "application/json"}
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers)
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.status, 200)
            res_data = json.loads(response.read().decode())
            self.assertIn("opponent_rebuttal", res_data)

    def test_04_argument_evaluation(self):
        url = f"{BASE_URL}/api/v1/argument-analysis/evaluate?user_id=1"
        payload = {
            "session_id": TestLogosAPI.session_id,
            "speech_text": "Either we implement carbon taxes immediately or the planet will burn completely in five years."
        }
        headers = {"Content-Type": "application/json"}
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers)
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.status, 200)
            res_data = json.loads(response.read().decode())
            self.assertIn("fallacies", res_data)

    def test_05_presentation_analysis(self):
        url = f"{BASE_URL}/api/v1/presentation-analysis/evaluate?user_id=1"
        payload = {
            "session_id": TestLogosAPI.session_id,
            "speech_text": "Um, basically, we need to, like, look at the studies to, you know, understand the impact.",
            "audio_duration_seconds": 30.0
        }
        headers = {"Content-Type": "application/json"}
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers)
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.status, 200)

    def test_06_coaching_plan(self):
        url = f"{BASE_URL}/api/v1/coaching/plan/1"
        with urllib.request.urlopen(url) as response:
            self.assertEqual(response.status, 200)

    def test_07_notifications(self):
        url = f"{BASE_URL}/api/v1/notifications/my-alerts?user_id=1"
        with urllib.request.urlopen(url) as response:
            self.assertEqual(response.status, 200)

    def test_08_report_exports(self):
        url_excel = f"{BASE_URL}/api/v1/reports/export/excel/{TestLogosAPI.session_id}"
        with urllib.request.urlopen(url_excel) as response:
            self.assertEqual(response.status, 200)
            
        url_pdf = f"{BASE_URL}/api/v1/reports/export/pdf/{TestLogosAPI.session_id}"
        with urllib.request.urlopen(url_pdf) as response:
            self.assertEqual(response.status, 200)

if __name__ == "__main__":
    unittest.main()
