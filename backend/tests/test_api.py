from fastapi.testclient import TestClient
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.argument_engine import argument_engine
from app.services.fallacy_engine import fallacy_engine
from app.services.counterargument_engine import counterargument_engine
from app.services.speech_engine import speech_engine

client = TestClient(app)

def test_root_and_health():
    res = client.get("/")
    assert res.status_code == 200
    assert "Agentic AI Debate Coach" in res.json()["platform"]

    h = client.get("/health")
    assert h.status_code == 200
    assert h.json()["status"] == "healthy"

def test_demo_logins_and_rbac():
    # 1. Login as Learner
    r_learner = client.post("/api/v1/auth/demo-login/learner")
    assert r_learner.status_code == 200
    learner_token = r_learner.json()["access_token"]
    assert r_learner.json()["user"]["role"] == "Learner"

    # 2. Login as Admin
    r_admin = client.post("/api/v1/auth/demo-login/admin")
    assert r_admin.status_code == 200
    admin_token = r_admin.json()["access_token"]
    assert r_admin.json()["user"]["role"] == "Administrator"

    # 3. Test RBAC: Learner should NOT be allowed to view admin dashboard or update roles
    headers_learner = {"Authorization": f"Bearer {learner_token}"}
    r_forbidden = client.put("/api/v1/users/1/role?new_role=Administrator", headers=headers_learner)
    assert r_forbidden.status_code == 403

    # 4. Test Admin authorization
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    r_admin_dash = client.get("/api/v1/analytics/admin-dashboard", headers=headers_admin)
    assert r_admin_dash.status_code == 200
    assert "users_by_role" in r_admin_dash.json()

def test_argument_analysis():
    r_learner = client.post("/api/v1/auth/demo-login/learner")
    token = r_learner.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "text": "We must transition to renewable energy because recent scientific studies demonstrate that solar and wind reduce grid emissions by 65%, which directly halts atmospheric degradation."
    }
    res = client.post("/api/v1/arguments/analyze", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["clarity_score"] > 50
    assert data["evidence_strength_score"] > 50
    assert data["logical_consistency_score"] > 50
    assert len(data["claim"]) > 0

def test_fallacy_detection_all_types():
    r_learner = client.post("/api/v1/auth/demo-login/learner")
    token = r_learner.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test Ad Hominem
    res_adhominem = client.post("/api/v1/fallacies/detect", json={
        "text": "Don't listen to him, he is a corrupt idiot who has no clue what he is talking about."
    }, headers=headers)
    assert res_adhominem.status_code == 200
    fallacies = [f["fallacy_type"] for f in res_adhominem.json()["detected_fallacies"]]
    assert "Ad Hominem" in fallacies

    # Test False Dilemma
    res_dilemma = client.post("/api/v1/fallacies/detect", json={
        "text": "Either you support our strict policy or you hate this country and want total chaos."
    }, headers=headers)
    assert res_dilemma.status_code == 200
    fallacies = [f["fallacy_type"] for f in res_dilemma.json()["detected_fallacies"]]
    assert "False Dilemma" in fallacies

    # Test Slippery Slope
    res_slope = client.post("/api/v1/fallacies/detect", json={
        "text": "If we allow this, next thing you know our whole society will inevitably collapse into ruin."
    }, headers=headers)
    assert res_slope.status_code == 200
    fallacies = [f["fallacy_type"] for f in res_slope.json()["detected_fallacies"]]
    assert "Slippery Slope" in fallacies

def test_counterargument_generation_5_types():
    r_learner = client.post("/api/v1/auth/demo-login/learner")
    token = r_learner.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "text": "A universal carbon tax should be instituted worldwide immediately to solve climate warming.",
        "context": "Climate Policy Debate"
    }
    res = client.post("/api/v1/counterarguments/generate", json=payload, headers=headers)
    assert res.status_code == 200
    rebuttals = res.json()["rebuttals"]
    assert len(rebuttals) == 5
    types = [r["argument_type"] for r in rebuttals]
    assert "Logical Rebuttals" in types
    assert "Evidence-Based Rebuttals" in types
    assert "Ethical Counterarguments" in types
    assert "Practical Counterarguments" in types
    assert "Policy Counterarguments" in types

def test_speech_presentation_metrics():
    r_learner = client.post("/api/v1/auth/demo-login/learner")
    token = r_learner.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    transcript = "Um, good afternoon everyone. Today I, uh, want to talk about, like, basically the future of our economic systems. To be honest, we need reform."
    payload = {
        "title": "Opening Speech",
        "transcript": transcript,
        "duration_seconds": 30.0
    }
    res = client.post("/api/v1/presentation/analyze", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["speech_pace_wpm"] > 0
    assert data["filler_words_count"] >= 3
    assert "um" in data["filler_words_breakdown"]
    assert "like" in data["filler_words_breakdown"]
    assert "basically" in data["filler_words_breakdown"]
    assert 0 <= data["confidence_score"] <= 100
    assert 0 <= data["clarity_score"] <= 100
    assert 0 <= data["engagement_score"] <= 100

def test_exact_weighted_scoring_model():
    r_learner = client.post("/api/v1/auth/demo-login/learner")
    token = r_learner.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/api/v1/debates/", json={
        "title": "Scoring Validation Debate",
        "topic": "Universal Healthcare Mandate",
        "format": "Oxford Debate",
        "user_position": "Affirmative",
        "opponent_type": "AI",
        "ai_persona": "Dr. Eleanor Vance (Empirical Scholar)"
    }, headers=headers)
    session_id = create_res.json()["id"]

    # (0.30 * 90) + (0.20 * 80) + (0.20 * 85) + (0.15 * 70) + (0.15 * 90)
    # = 27.0 + 16.0 + 17.0 + 10.5 + 13.5 = 84.0
    score_res = client.post("/api/v1/scoring/evaluate", json={
        "session_id": session_id,
        "argument_quality": 90.0,
        "evidence_usage": 80.0,
        "logical_consistency": 85.0,
        "rebuttal_effectiveness": 70.0,
        "communication_skills": 90.0
    }, headers=headers)

    assert score_res.status_code == 200
    data = score_res.json()
    assert abs(data["overall_score"] - 84.0) < 0.2
    assert data["grade"] in ["B+", "A"]

def test_ai_simulation_turn():
    r_learner = client.post("/api/v1/auth/demo-login/learner")
    token = r_learner.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/api/v1/debates/", json={
        "title": "Simulation Test Debate",
        "topic": "AI Copyright and Fair Use",
        "format": "Oxford Debate",
        "user_position": "Affirmative",
        "opponent_type": "AI",
        "ai_persona": "Dr. Eleanor Vance (Empirical Scholar)"
    }, headers=headers)
    session_id = create_res.json()["id"]

    sim_res = client.post("/api/v1/simulation/turn", json={
        "session_id": session_id,
        "user_argument": "Training generative AI models on publicly available digital media constitutes transformative fair use because it extracts generalizable latent concepts rather than reproducing identical copyrighted works."
    }, headers=headers)

    assert sim_res.status_code == 200
    data = sim_res.json()
    assert "user_turn" in data
    assert "ai_turn" in data
    assert len(data["ai_turn"]["content"]) > 30
    assert len(data["live_coaching_hint"]) > 0
    assert "ai_feedback" in data
    assert data["ai_feedback"] is not None
    assert "praise" in data["ai_feedback"]
    assert "constructive_tip" in data["ai_feedback"]
    assert "suggested_reply" in data["ai_feedback"]
    assert isinstance(data["ai_feedback"]["difficult_words"], list)

def test_glossary_and_plain_english_definitions():
    r_learner = client.post("/api/v1/auth/demo-login/learner")
    token = r_learner.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/arguments/glossary", headers=headers)
    assert res.status_code == 200
    terms = res.json()
    assert len(terms) >= 15
    warrant = next((t for t in terms if t["term"].lower() == "warrant"), None)
    assert warrant is not None
    assert "simple_name" in warrant
    assert "plain_english" in warrant
    assert "example" in warrant

    # Test word extraction
    exp_res = client.post("/api/v1/arguments/glossary/explain", json={
        "text": "This policy relies on a questionable warrant and creates negative externalities for citizens."
    }, headers=headers)
    assert exp_res.status_code == 200
    explained = exp_res.json()
    assert len(explained) >= 2

def test_report_export_pdf_csv():
    r_learner = client.post("/api/v1/auth/demo-login/learner")
    token = r_learner.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test PDF export
    pdf_res = client.post("/api/v1/reports/export", json={
        "report_type": "debate",
        "format": "pdf"
    }, headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.json()["format"] == "pdf"
    assert "download_url" in pdf_res.json()

    # Test CSV export
    csv_res = client.post("/api/v1/reports/export", json={
        "report_type": "debate",
        "format": "csv"
    }, headers=headers)
    assert csv_res.status_code == 200
    assert csv_res.json()["format"] == "csv"

if __name__ == "__main__":
    print("--- Running Test Suite for Agentic AI Debate Coach Platform ---")
    test_root_and_health()
    print("[PASS] test_root_and_health")
    test_demo_logins_and_rbac()
    print("[PASS] test_demo_logins_and_rbac")
    test_argument_analysis()
    print("[PASS] test_argument_analysis")
    test_fallacy_detection_all_types()
    print("[PASS] test_fallacy_detection_all_types")
    test_counterargument_generation_5_types()
    print("[PASS] test_counterargument_generation_5_types")
    test_speech_presentation_metrics()
    print("[PASS] test_speech_presentation_metrics")
    test_exact_weighted_scoring_model()
    print("[PASS] test_exact_weighted_scoring_model")
    test_ai_simulation_turn()
    print("[PASS] test_ai_simulation_turn")
    test_glossary_and_plain_english_definitions()
    print("[PASS] test_glossary_and_plain_english_definitions")
    test_report_export_pdf_csv()
    print("[PASS] test_report_export_pdf_csv")
    print("\n==========================================")
    print("SUCCESS: ALL 10 AUTOMATED SUITES PASSED!")
    print("==========================================")
