#!/usr/bin/env python3
"""
MindArena AI - 50+ Comprehensive API Smoke Tests
Tests all endpoints, 4 AI agent workflows, JWT authentication, RBAC, and error handling.
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:3000/api"
HEALTH_URL = "http://localhost:3000/health"

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tokens = {}

    def report(self, test_name: str, success: bool, msg: str = ""):
        if success:
            self.passed += 1
            print(f"  [PASS] {test_name} {msg}")
        else:
            self.failed += 1
            print(f"  [FAIL] {test_name} {msg}")

    def request(self, method: str, path: str, data: dict = None, token: str = None, raw_url: str = None):
        url = raw_url if raw_url else f"{BASE_URL}{path}"
        req = urllib.request.Request(url, method=method)
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        body = json.dumps(data).encode("utf-8") if data else None
        try:
            with urllib.request.urlopen(req, data=body, timeout=15) as resp:
                status = resp.status
                content = resp.read().decode("utf-8")
                try:
                    res_json = json.loads(content)
                except Exception:
                    res_json = content
                return status, res_json
        except urllib.error.HTTPError as e:
            content = e.read().decode("utf-8")
            try:
                res_json = json.loads(content)
            except Exception:
                res_json = content
            return e.code, res_json
        except Exception as e:
            return 0, str(e)

def run_all_tests():
    print("============================================================")
    print("           MINDARENA AI - 50+ API SMOKE TESTS               ")
    print("============================================================")
    runner = TestRunner()

    # 1. Health check
    status, res = runner.request("GET", "", raw_url=HEALTH_URL)
    runner.report("1. GET /health", status == 200 and res.get("status") == "ok")

    # 2. Register Learner
    learner_email = f"test_learner_{int(urllib.request.time.time())}@mindarena.ai"
    status, res = runner.request("POST", "/auth/register", {
        "email": learner_email,
        "password": "Password123!",
        "full_name": "Test Learner",
        "username": f"learner_{int(urllib.request.time.time())}",
        "role": "learner"
    })
    runner.report("2. POST /auth/register (Learner)", status in [200, 201])
    if status in [200, 201] and "token" in res:
        runner.tokens["learner"] = res["token"]

    # 3. Duplicate registration
    status, _ = runner.request("POST", "/auth/register", {
        "email": learner_email,
        "password": "Password123!",
        "full_name": "Test Learner",
        "username": f"learner_dup_{int(urllib.request.time.time())}",
        "role": "learner"
    })
    runner.report("3. POST /auth/register duplicate email rejection", status in [400, 409])

    # 4. Seed logins
    for role in ["learner", "coach", "educator", "admin"]:
        status, res = runner.request("POST", "/auth/login", {
            "email": f"{role}@mindarena.ai",
            "password": "password123"
        })
        runner.report(f"4.{role}. Login {role}@mindarena.ai", status == 200 and "token" in res)
        if status == 200 and "token" in res:
            runner.tokens[role] = res["token"]

    # 5. Invalid credentials rejection
    status, _ = runner.request("POST", "/auth/login", {
        "email": "learner@mindarena.ai",
        "password": "wrong_password_xyz"
    })
    runner.report("5. Invalid password rejection (401)", status == 401)

    # 6. Auth verification
    learner_tok = runner.tokens.get("learner")
    status, res = runner.request("GET", "/auth/me", token=learner_tok)
    runner.report("6. GET /auth/me with valid JWT", status == 200 and res.get("email") == "learner@mindarena.ai")

    # 7. Unauthenticated access
    status, _ = runner.request("GET", "/auth/me", token="invalid_jwt_token_sample")
    runner.report("7. Invalid JWT rejection (401)", status == 401)

    # 8. RBAC: Learner cannot view admin users
    status, _ = runner.request("GET", "/admin/users", token=learner_tok)
    runner.report("8. RBAC: Learner forbidden on /admin/users (403)", status == 403)

    # 9. RBAC: Admin can view users
    admin_tok = runner.tokens.get("admin")
    status, res = runner.request("GET", "/admin/users", token=admin_tok)
    runner.report("9. RBAC: Admin authorized on /admin/users (200)", status == 200 and isinstance(res, list))

    # 10. Update profile
    status, res = runner.request("PATCH", "/profiles/me", {
        "experience_level": "advanced",
        "participate_in_comparison": True
    }, token=learner_tok)
    runner.report("10. PATCH /profiles/me", status == 200)

    # 11-16. AI Pipeline 1: Argument Analysis
    status, res = runner.request("POST", "/arguments/analyze", {
        "topic": "Universal Basic Income",
        "argument": "Implementing Universal Basic Income ensures basic human dignity, eradicates extreme poverty, and creates an economic foundation without discouraging productive work."
    }, token=learner_tok)
    runner.report("11. POST /arguments/analyze pipeline", status == 200)
    runner.report("12. Argument analysis overall_score exists", isinstance(res.get("overall_score"), (int, float)))
    runner.report("13. Claims extraction structured array", isinstance(res.get("claims"), list))
    runner.report("14. Evidence quality & logical strength scores", "evidence_quality" in res and "logical_strength" in res)
    runner.report("15. Fallacies detected array exists", isinstance(res.get("fallacies"), list))
    runner.report("16. Counterarguments generated array exists", isinstance(res.get("counterarguments"), list))

    # 17. Standalone Fallacy Detection
    status, res = runner.request("POST", "/fallacies/detect", {
        "argument": "You cannot trust Dr. Smith's vaccine study because he is arrogant and works for Big Pharma."
    }, token=learner_tok)
    runner.report("17. POST /fallacies/detect ad hominem check", status == 200 and len(res.get("fallacies_detected", [])) > 0)

    # 18. Standalone Counterargument generation
    status, res = runner.request("POST", "/counterarguments/generate", {
        "topic": "Nuclear Energy",
        "argument": "Nuclear energy is completely green and should replace all fossil fuels immediately."
    }, token=learner_tok)
    runner.report("18. POST /counterarguments/generate", status == 200 and isinstance(res.get("counterarguments"), list))

    # 19. Case Review Synthesis
    status, res = runner.request("POST", "/case-reviews/synthesize", {
        "topic": "AI in Healthcare",
        "argument": "Autonomous diagnostic models eliminate diagnostic latency and democratize expert medical triage worldwide."
    }, token=learner_tok)
    runner.report("19. POST /case-reviews/synthesize", status == 200 and "synthesis" in res)

    # 20. Argument History
    status, res = runner.request("GET", "/arguments/history", token=learner_tok)
    runner.report("20. GET /arguments/history", status == 200 and isinstance(res, list))

    # 21-25. Multi-Agent Debate Simulation (Opponent + Judge)
    status, res = runner.request("POST", "/debates/create", {
        "topic": "Social Media Bans for Minors",
        "mode": "ai",
        "user_stance": "pro"
    }, token=learner_tok)
    runner.report("21. POST /debates/create (AI Mode)", status in [200, 201] and "id" in res)
    debate_id = res.get("id")

    if debate_id:
        # Round 1
        status, res = runner.request("POST", f"/debates/{debate_id}/round", {
            "speech_text": "Social media algorithms exploit dopamine cycles in developing brains, causing documented spikes in clinical adolescent depression."
        }, token=learner_tok)
        runner.report("22. POST /debates/:id/round Round 1 (Opponent + Judge)", status == 200)
        runner.report("23. Judge feedback has 6 metrics", all(k in res.get("judge_feedback", {}) for k in ["relevance", "evidence", "logic", "rebuttal", "clarity", "persuasiveness"]))
        runner.report("24. Opponent generated responsive argument", bool(res.get("opponent_speech")))

        # Round 2
        status, res = runner.request("POST", f"/debates/{debate_id}/round", {
            "speech_text": "While connection is valuable, unrestricted algorithmic feeds prioritize outrage over connection, requiring statutory age gates."
        }, token=learner_tok)
        runner.report("25. Multi-agent Round 2 progression", status == 200 and res.get("round_number") == 2)

    # 26-28. Human vs Human Debate Invites & Authorization
    coach_tok = runner.tokens.get("coach")
    status, res = runner.request("POST", "/debates/create", {
        "topic": "Standardized Testing Validity",
        "mode": "human",
        "opponent_email": "coach@mindarena.ai",
        "user_stance": "pro"
    }, token=learner_tok)
    runner.report("26. POST /debates/create (Human Mode Invite)", status in [200, 201])
    h_debate_id = res.get("id")

    if h_debate_id:
        status, res = runner.request("POST", f"/debates/{h_debate_id}/respond-invite", {
            "action": "accept"
        }, token=coach_tok)
        runner.report("27. POST /debates/:id/respond-invite accept", status == 200 and res.get("invite_status") == "accepted")

        # Non-participant access rejection
        educator_tok = runner.tokens.get("educator")
        status, _ = runner.request("POST", f"/debates/{h_debate_id}/round", {
            "speech_text": "Uninvited user trying to debate"
        }, token=educator_tok)
        runner.report("28. Human debate participant authorization (403)", status == 403)

    # 29-35. Self-Directed ReAct Research Agent (Wikipedia)
    status, res = runner.request("POST", "/research/brief", {
        "topic": "Gene Editing and CRISPR Ethics"
    }, token=learner_tok)
    runner.report("29. POST /research/brief ReAct execution", status == 200)
    runner.report("30. Wikipedia tool executed with citations", isinstance(res.get("sources"), list))
    runner.report("31. ReAct iterations count recorded", isinstance(res.get("iterations"), int) and res.get("iterations") > 0)
    runner.report("32. Key findings array generated", isinstance(res.get("brief", {}).get("key_findings", []), list))
    runner.report("33. Verifiable source URLs included", all("url" in s for s in res.get("sources", [])))
    status, res = runner.request("GET", "/research/history", token=learner_tok)
    runner.report("34. GET /research/history", status == 200 and isinstance(res, list))

    # 36-40. Tool-Calling Coaching Agent (Ask Your Coach)
    status, res = runner.request("POST", "/coaching-agent/ask", {
        "question": "How can I improve my logical structure and reduce fallacies in fast-paced debates?"
    }, token=learner_tok)
    runner.report("36. POST /coaching-agent/ask Tool-Calling Coach", status == 200)
    runner.report("37. Tools used list returned dynamically", isinstance(res.get("tools_used"), list) and len(res.get("tools_used")) > 0)
    runner.report("38. Personalized recommendation provided", bool(res.get("final_recommendation")))
    runner.report("39. Proposed goal formulated", isinstance(res.get("proposed_goal"), dict))
    status, res = runner.request("GET", "/coaching-agent/sessions", token=learner_tok)
    runner.report("40. GET /coaching-agent/sessions", status == 200 and isinstance(res, list))

    # 41-42. RAG Coaching System
    status, res = runner.request("POST", "/coaching/plan", {
        "focus_areas": ["evidence_evaluation", "rebuttal_speed"]
    }, token=learner_tok)
    runner.report("41. POST /coaching/plan RAG synthesis", status == 200 and "recommendations" in res)
    status, res = runner.request("GET", "/coaching/knowledge", token=learner_tok)
    runner.report("42. GET /coaching/knowledge", status == 200 and isinstance(res, list))

    # 43-47. Presentation Analysis & Speech Metrics
    sample_transcript = "Good morning everyone. Um, today I want to argue, like, that renewable energy transition is uh essential. We know that carbon emissions, you know, are at an all-time high."
    status, res = runner.request("POST", "/presentations/analyze", {
        "title": "Clean Energy Address",
        "transcript": sample_transcript,
        "duration_seconds": 45
    }, token=learner_tok)
    runner.report("43. POST /presentations/analyze", status == 200)
    runner.report("44. Words Per Minute (WPM) calculated", "words_per_minute" in res and res["words_per_minute"] > 0)
    runner.report("45. Filler words detected with frequencies", len(res.get("filler_words", [])) > 0)
    runner.report("46. Delivery clarity & confidence scores", "clarity_score" in res and "confidence_score" in res)
    status, res = runner.request("GET", "/presentations/history", token=learner_tok)
    runner.report("47. GET /presentations/history", status == 200 and isinstance(res, list))

    # 48-49. Performance & Peer Comparison
    status, res = runner.request("GET", "/performance/summary", token=learner_tok)
    runner.report("48. GET /performance/summary", status == 200 and "overall_score" in res)
    status, res = runner.request("GET", "/performance/peer-comparison", token=learner_tok)
    runner.report("49. GET /performance/peer-comparison (anonymized)", status == 200 and "peer_average" in res)

    # 50-51. Goals Management
    status, res = runner.request("POST", "/goals", {
        "title": "Achieve 85% Evidence Quality",
        "metric": "evidence_quality",
        "target_value": 85.0
    }, token=learner_tok)
    runner.report("50. POST /goals create target", status in [200, 201])
    goal_id = res.get("id")

    if goal_id:
        status, res = runner.request("PATCH", f"/goals/{goal_id}", {
            "status": "completed",
            "current_value": 88.0
        }, token=learner_tok)
        runner.report("51. PATCH /goals/:id update progress", status == 200 and res.get("status") == "completed")

    # 52-53. Educator Class Management
    educator_tok = runner.tokens.get("educator")
    status, res = runner.request("POST", "/classes", {
        "name": "Varsity Debate Cohort Fall",
        "description": "Intensive competitive debate preparation"
    }, token=educator_tok)
    runner.report("52. POST /classes (Educator creates class)", status in [200, 201])
    class_id = res.get("id")

    if class_id:
        status, res = runner.request("POST", f"/classes/{class_id}/members", {
            "learner_email": "learner@mindarena.ai"
        }, token=educator_tok)
        runner.report("53. POST /classes/:id/members adds learner", status in [200, 201])

    # 54. Notifications
    status, res = runner.request("GET", "/notifications", token=learner_tok)
    runner.report("54. GET /notifications", status == 200 and isinstance(res, list))

    # 55-56. Data Export (JSON & CSV)
    status, res = runner.request("GET", "/export?format=json", token=learner_tok)
    runner.report("55. GET /export?format=json (authorized personal data)", status == 200 and "user" in res)
    status, res = runner.request("GET", "/export?format=csv", token=learner_tok)
    runner.report("56. GET /export?format=csv", status == 200 and "id,topic,overall_score" in str(res))

    # 57. Coach Feedback
    coach_tok = runner.tokens.get("coach")
    status, res = runner.request("POST", "/coach-feedback", {
        "learner_id": "c0000000-0000-0000-0000-000000000001",
        "item_type": "argument",
        "feedback_text": "Strong structural reasoning. Strengthen premise 2 with quantifiable empirical studies."
    }, token=coach_tok)
    runner.report("57. POST /coach-feedback", status in [200, 201])

    print("============================================================")
    print(f"RESULTS: {runner.passed} PASSED, {runner.failed} FAILED")
    print("============================================================")
    return runner.failed == 0

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
