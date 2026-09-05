import sys
import json
from pathlib import Path

backend_dir = r"C:\Users\nargi\OneDrive\Pictures\Desktop\MERAZ\Agentic AI Debate Coach\backend"
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models

client = TestClient(app)

print("=" * 60)
print("STARTING END-TO-END VERIFICATION: LEARNER & COACH PORTALS")
print("=" * 60)

# 1. LOGIN AS LEARNER
print("\n[1] Testing Learner Authentication...")
res_learner_login = client.post("/api/v1/auth/login", json={
    "email": "hardwilldayan69@gmail.com",
    "password": "Dayan@123"
})
print("Learner login status:", res_learner_login.status_code)
assert res_learner_login.status_code == 200, f"Learner login failed: {res_learner_login.text}"
learner_token = res_learner_login.json()["access_token"]
learner_id = res_learner_login.json()["user_id"]
learner_headers = {"Authorization": f"Bearer {learner_token}"}
print(f"-> Logged in as Learner: {res_learner_login.json()['full_name']} (ID: {learner_id}, Role: {res_learner_login.json()['role']})")

# 2. LOGIN AS COACH
print("\n[2] Testing Coach Authentication...")
res_coach_login = client.post("/api/v1/auth/login", json={
    "email": "mdmerazrazakhan@gmail.com",
    "password": "Dayan@123"
})
print("Coach login status:", res_coach_login.status_code)
assert res_coach_login.status_code == 200, f"Coach login failed: {res_coach_login.text}"
coach_token = res_coach_login.json()["access_token"]
coach_id = res_coach_login.json()["user_id"]
coach_headers = {"Authorization": f"Bearer {coach_token}"}
print(f"-> Logged in as Coach: {res_coach_login.json()['full_name']} (ID: {coach_id}, Role: {res_coach_login.json()['role']})")

# 3. RUN LEARNER VOICE / SPEECH ANALYSIS
print("\n[3] Testing Learner Speech Evaluation (/api/v1/presentation-analysis/evaluate)...")
speech_payload = {
    "speech_text": "Good morning esteemed judges and opponents. Today, we stand firmly in favor of advancing artificial intelligence governance. Unregulated automation poses existential risks to data privacy, systemic bias, and labor markets. According to recent international policy studies, implementing proactive audits reduces catastrophic algorithmic failures by over 40 percent. Therefore, we must establish rigorous, independent compliance frameworks.",
    "audio_duration_seconds": 25.0
}
res_speech = client.post("/api/v1/presentation-analysis/evaluate", headers=learner_headers, json=speech_payload)
print("Speech evaluation status:", res_speech.status_code)
assert res_speech.status_code == 200, f"Speech evaluation failed: {res_speech.text}"
speech_data = res_speech.json()
session_id = speech_data.get("session_id")
print(f"-> Session ID created: {session_id}")
print(f"-> WPM: {speech_data.get('speech_pace_wpm')}")
print(f"-> Filler words: {speech_data.get('filler_words_count')} ({speech_data.get('filler_words_list')})")
print(f"-> Clarity Score: {speech_data.get('clarity_score')}%")
print(f"-> Confidence Score: {speech_data.get('confidence_score')}%")
print(f"-> Overall Score: {speech_data.get('overall_score')}%")

# 4. RUN ARGUMENT ANALYSIS WITH FALLACY DETECTION
print("\n[4] Testing Learner Argument & Fallacy Analysis (/api/v1/argument-analysis/evaluate)...")
arg_payload = {
    "session_id": session_id,
    "speech_text": "Either we implement carbon taxes immediately or the planet will burn completely in five years because an expert said so."
}
res_arg = client.post("/api/v1/argument-analysis/evaluate", headers=learner_headers, json=arg_payload)
print("Argument analysis status:", res_arg.status_code)
assert res_arg.status_code == 200, f"Argument analysis failed: {res_arg.text}"
arg_data = res_arg.json()
print(f"-> Fallacies detected: {[f['fallacy_type'] for f in arg_data.get('fallacies', [])]}")
print(f"-> Counterarguments count: {len(arg_data.get('counterarguments', []))}")

# 5. RUN AI SIMULATION DEBATE TURN
print("\n[5] Testing AI Simulation Debate Turn (/api/v1/simulation/turn)...")
sim_payload = {
    "session_id": session_id,
    "user_argument": "Strict liability frameworks ensure technology firms internalize the social costs of their models.",
    "opponent_persona": "The Pragmatist"
}
res_sim = client.post("/api/v1/simulation/turn", headers=learner_headers, json=sim_payload)
print("Simulation turn status:", res_sim.status_code)
assert res_sim.status_code == 200, f"Simulation turn failed: {res_sim.text}"
sim_data = res_sim.json()
print(f"-> Turn Index: {sim_data.get('turn_index')}")
print(f"-> Opponent Rebuttal: {sim_data.get('opponent_rebuttal')[:80]}...")
print(f"-> Coaching Tip: {sim_data.get('coaching_tip')[:80]}...")

# 6. VERIFY DATA INTEGRITY IN DATABASE
print("\n[6] Verifying Database Data Integrity...")
db = SessionLocal()
db_session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
assert db_session is not None, "Session not found in DB!"
print(f"-> DB Session found: Title='{db_session.title}', Topic='{db_session.topic[:50]}...', Format='{db_session.format}', Status='{db_session.status}'")

db_metric = db.query(models.PresentationMetric).filter(models.PresentationMetric.session_id == session_id).first()
assert db_metric is not None, "Presentation metric not found in DB!"
print(f"-> DB PresentationMetric: WPM={db_metric.speech_pace_wpm}, Fillers={db_metric.filler_words_count}, Clarity={db_metric.clarity_score}")

db_score = db.query(models.PerformanceScore).filter(models.PerformanceScore.session_id == session_id).first()
assert db_score is not None, "Performance score not found in DB!"
print(f"-> DB PerformanceScore: Overall={db_score.overall_weighted_score}, Logical={db_score.logical_consistency}")

db_notifs = db.query(models.Notification).filter(models.Notification.user_id == learner_id).order_by(models.Notification.id.desc()).all()
print(f"-> Learner Notifications in DB: {len(db_notifs)} notification(s). Latest: '{db_notifs[0].title}'")
db.close()

# 7. CHECK COACH SECTION REFLECTION
print("\n[7] Checking Coach Overview (/api/v1/coaching/coach/overview)...")
res_coach_overview = client.get("/api/v1/coaching/coach/overview", headers=coach_headers)
print("Coach overview status:", res_coach_overview.status_code)
assert res_coach_overview.status_code == 200, f"Coach overview failed: {res_coach_overview.text}"
ov_data = res_coach_overview.json()
print(f"-> Assigned Students: {ov_data.get('assigned_students')}")
print(f"-> Class Performance Average: {ov_data.get('class_performance_average')}%")
print(f"-> Pending Evaluations: {ov_data.get('pending_evaluations')}")
print(f"-> Top Class Pain Points: {ov_data.get('top_class_pain_points')}")

print("\n[8] Checking Coach Students Roster (/api/v1/coaching/coach/students)...")
res_coach_students = client.get("/api/v1/coaching/coach/students", headers=coach_headers)
print("Coach students status:", res_coach_students.status_code)
assert res_coach_students.status_code == 200, f"Coach students failed: {res_coach_students.text}"
students_roster = res_coach_students.json()
print(f"-> Total students in roster: {len(students_roster)}")

# Locate Dayan in the coach roster
dayan_entry = next((s for s in students_roster if s["id"] == learner_id), None)
assert dayan_entry is not None, f"Learner (ID {learner_id}) not found in Coach Roster!"
print("-> FOUND LEARNER IN COACH ROSTER:")
print(f"   * Name: {dayan_entry['name']}")
print(f"   * Email: {dayan_entry['email']}")
print(f"   * Topic: {dayan_entry['topic']}")
print(f"   * Total Sessions: {dayan_entry['total_sessions']}")
print(f"   * Grade: {dayan_entry['grade']}")
print(f"   * Score: {dayan_entry['score']}%")
print(f"   * Top Logic Gap / Metric: {dayan_entry['gap']}")
print(f"   * Last Active: {dayan_entry['last_active']}")

# 9. DISPATCH COACH RECOMMENDATION TO LEARNER
print("\n[9] Dispatching Coaching Recommendation from Coach to Learner (/api/v1/coaching/coach/feedback)...")
feedback_payload = {
    "student_id": learner_id,
    "feedback": "Outstanding opening argument Dayan! Keep your speech pace around 140 WPM and use strategic pauses during counterarguments."
}
res_feedback = client.post("/api/v1/coaching/coach/feedback", headers=coach_headers, json=feedback_payload)
print("Feedback dispatch status:", res_feedback.status_code)
assert res_feedback.status_code == 200, f"Feedback dispatch failed: {res_feedback.text}"
print(f"-> Coach feedback response: {res_feedback.json()['message']}")

# 10. VERIFY STUDENT RECEIVED COACH FEEDBACK
print("\n[10] Verifying Learner Received Feedback in Notifications & Coaching Plan...")
res_learner_notifs = client.get("/api/v1/notifications/my-alerts", headers=learner_headers)
notifs = res_learner_notifs.json()
latest_notif = notifs[0] if notifs else None
assert latest_notif is not None and "Coach" in latest_notif.get("title", ""), "Coach notification not received!"
print(f"-> Learner Notification Received: '{latest_notif['title']}' - '{latest_notif['message']}'")

res_plan = client.get("/api/v1/coaching/plan/me", headers=learner_headers)
plan_data = res_plan.json()
print(f"-> Learner Dynamic Coaching Plan: Status='{plan_data.get('progress_status')}'")
print(f"-> Targeted Recommendations: {plan_data.get('targeted_recommendations')[:2]}")

print("\n" + "=" * 60)
print("ALL 10 END-TO-END TESTS PASSED WITH 100% DATA INTEGRITY!")
print("=" * 60)
