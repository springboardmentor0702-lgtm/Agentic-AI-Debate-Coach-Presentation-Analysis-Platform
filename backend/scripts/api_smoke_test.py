"""
scripts/api_smoke_test.py

Automated API smoke test - logs in as each seeded role and hits the
real, running backend across every module, printing PASS/FAIL per
check with a summary at the end. Complements TEST_PLAN.md (which is
for judging whether the AI's actual OUTPUT is any good) - this script
only checks that endpoints respond correctly, are reachable, and are
properly role-gated. It doesn't judge response quality.

Run with the backend actually running (`uvicorn app.main:app --reload`
in another terminal) and the seed script already applied:
    python scripts/api_smoke_test.py

Reads SUPABASE_URL and SUPABASE_ANON_KEY from your existing .env (the
anon key, not the service key - this authenticates as a real user the
same way the frontend does, via Supabase's password grant, not as an
admin bypassing everything).

Assumes seed_dummy_data.py has already been run - every login below
matches what that script creates.
"""
import os
import sys

import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
PASSWORD = "SeedTest123"

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be set (check your .env file).")
    sys.exit(1)

results = {"pass": 0, "fail": 0}


def login(email: str) -> str:
    """Real password-grant login against Supabase Auth, exactly like the frontend does."""
    resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": PASSWORD},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def check(label, method, path, token=None, expect=200, json_body=None, params=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        resp = requests.request(
            method, f"{BACKEND_URL}{path}", headers=headers, json=json_body, params=params, timeout=30
        )
    except requests.exceptions.ConnectionError:
        print(f"  [FAIL] {label} -- could not connect to {BACKEND_URL}. Is the backend running?")
        results["fail"] += 1
        return None

    ok = resp.status_code == expect
    status = "PASS" if ok else "FAIL"
    results["pass" if ok else "fail"] += 1
    detail = "" if ok else f" (expected {expect}, got {resp.status_code}: {resp.text[:150]})"
    print(f"  [{status}] {label}{detail}")
    return resp


def section(title):
    print(f"\n--- {title} ---")


def main():
    print("=" * 60)
    print("ClashLab API Smoke Test")
    print(f"Backend: {BACKEND_URL}")
    print("=" * 60)

    section("Health check")
    check("Health endpoint reachable", "GET", "/health", expect=200)

    section("Logging in as each seeded role")
    try:
        learner_token = login("learner1@seed.test")
        print("  [PASS] Logged in as learner1@seed.test")
        results["pass"] += 1
    except Exception as e:
        print(f"  [FAIL] Could not log in as learner1@seed.test: {e}")
        print("  Has seed_dummy_data.py been run? Aborting - nothing else can be tested without a valid login.")
        sys.exit(1)

    coach_token = login("coach@seed.test")
    educator_token = login("educator@seed.test")
    admin_token = login("admin@seed.test")
    learner2_token = login("learner2@seed.test")
    print("  [PASS] Logged in as coach, educator, admin, and a second learner")
    results["pass"] += 1

    # =========== LEARNER-FACING MODULES ===========

    section("Profile")
    check("GET /profiles/me", "GET", "/profiles/me", learner_token)

    section("Argument Analysis")
    check("POST /arguments/analyze", "POST", "/arguments/analyze", learner_token, json_body={
        "text": "Renewable energy investment reduces long-term costs despite higher upfront spending.",
        "topic": "Renewable energy",
    })
    check("GET /arguments/history", "GET", "/arguments/history", learner_token)

    section("Fallacy Detection")
    check("POST /fallacies/detect", "POST", "/fallacies/detect", learner_token, json_body={
        "text": "Everyone knows this policy is bad, so it must be bad.",
        "topic": "Test topic",
    })
    check("GET /fallacies/history", "GET", "/fallacies/history", learner_token)

    section("Counterarguments")
    check("POST /counterarguments/generate", "POST", "/counterarguments/generate", learner_token, json_body={
        "text": "Universal basic income would reduce poverty.",
        "topic": "UBI",
    })
    check("GET /counterarguments/history", "GET", "/counterarguments/history", learner_token)

    section("Full Case Review")
    check("POST /case-review/run", "POST", "/case-review/run", learner_token, json_body={
        "text": "Nuclear energy is the safest path to decarbonization given modern reactor designs.",
        "topic": "Nuclear energy",
    })
    check("GET /case-review/history", "GET", "/case-review/history", learner_token)

    section("Presentation Analysis")
    check("GET /presentation/history", "GET", "/presentation/history", learner_token)

    section("Debate Prep Research (Segment 24)")
    check("GET /research/history", "GET", "/research/history", learner_token)
    # Not calling POST /research/prepare here by default - it makes a
    # real external Wikipedia call plus multiple LLM calls, slower and
    # not idempotent to run repeatedly. Uncomment to include it:
    # check("POST /research/prepare", "POST", "/research/prepare", learner_token, json_body={"topic": "Nuclear energy"})

    section("Coaching Plan (fixed pipeline, Segment 9)")
    check("GET /coaching/history", "GET", "/coaching/history", learner_token)

    section("Ask Your Coach (agentic, Segment 25)")
    check("GET /coaching-agent/history", "GET", "/coaching-agent/history", learner_token)

    section("AI Debate Simulation")
    session_resp = check("POST /debates/sessions (AI mode)", "POST", "/debates/sessions", learner_token, json_body={
        "topic": "This house believes remote work is better for productivity",
        "format": "one_on_one",
        "user_position": "For",
    })
    if session_resp:
        session_id = session_resp.json()["id"]
        check("POST round to AI session", "POST", f"/debates/sessions/{session_id}/rounds", learner_token, json_body={
            "user_argument": "Remote work eliminates commute time, giving employees measurably more focused hours.",
        })
        check("GET the AI session back", "GET", f"/debates/sessions/{session_id}", learner_token)
        check("POST /end on the AI session", "POST", f"/debates/sessions/{session_id}/end", learner_token)
    check("GET /debates/sessions (list)", "GET", "/debates/sessions", learner_token)
    check("GET /debates/formats", "GET", "/debates/formats", learner_token)
    check("GET /debates/invites", "GET", "/debates/invites", learner_token)

    section("Human-vs-Human invite flow")
    hvh_resp = check("POST /debates/sessions (invite by username)", "POST", "/debates/sessions", learner_token, json_body={
        "topic": "This house believes zoos do more harm than good",
        "format": "public_forum",
        "user_position": "Against",
        "opponent_username": "sam_rivera",
    })
    if hvh_resp:
        hvh_id = hvh_resp.json()["id"]
        check("Opponent sees the invite", "GET", "/debates/invites", learner2_token)
        check("Opponent accepts", "POST", f"/debates/sessions/{hvh_id}/respond", learner2_token, json_body={"accept": True})
        check("Creator opens round 1", "POST", f"/debates/sessions/{hvh_id}/rounds", learner_token, json_body={
            "user_argument": "Zoos prioritize entertainment value over the psychological wellbeing of captive animals.",
        })
        check("Opponent responds, triggering judging", "POST", f"/debates/sessions/{hvh_id}/rounds", learner2_token, json_body={
            "user_argument": "Modern accredited zoos fund critical conservation research that directly protects wild populations.",
        })

    section("Performance & Goals")
    check("GET /scoring/performance", "GET", "/scoring/performance", learner_token)
    check("GET /scoring/history", "GET", "/scoring/history", learner_token)
    check("GET /goals", "GET", "/goals", learner_token)
    goal_resp = check("POST /goals", "POST", "/goals", learner_token, json_body={
        "metric": "rebuttal_effectiveness", "target_value": 7.5,
    })
    if goal_resp:
        check("DELETE the goal just created", "DELETE", f"/goals/{goal_resp.json()['id']}", learner_token)

    section("Peer Comparison")
    check("GET /comparison", "GET", "/comparison", learner_token)

    section("Easy Wins Bundle (Segment 26)")
    check("GET /streaks/me", "GET", "/streaks/me", learner_token)
    check("GET /topics", "GET", "/topics", learner_token)
    check("GET /topics/categories", "GET", "/topics/categories", learner_token)
    check("GET /topics/random", "GET", "/topics/random", learner_token)
    check("GET /export/me", "GET", "/export/me", learner_token)

    section("Notifications")
    check("GET /notifications", "GET", "/notifications", learner_token)

    section("Dashboards")
    check("GET /dashboards/learner/activity", "GET", "/dashboards/learner/activity", learner_token)

    # =========== ROLE-GATING: a learner must be BLOCKED from coach/admin routes ===========

    section("Role gating - a learner must be blocked from coach/admin-only routes")
    check("Learner blocked from /dashboards/coach/students", "GET", "/dashboards/coach/students", learner_token, expect=403)
    check("Learner blocked from /classes", "GET", "/classes", learner_token, expect=403)
    check("Learner blocked from /dashboards/admin/overview", "GET", "/dashboards/admin/overview", learner_token, expect=403)

    # =========== COACH-FACING MODULES ===========

    section("Coach Dashboard")
    students_resp = check("GET /dashboards/coach/students", "GET", "/dashboards/coach/students", coach_token)
    if students_resp and students_resp.json():
        first_learner_id = students_resp.json()[0]["id"]
        check("GET a specific learner's detail", "GET", f"/dashboards/coach/students/{first_learner_id}", coach_token)

    section("Classes (Segment 21)")
    classes_resp = check("GET /classes", "GET", "/classes", coach_token)
    if classes_resp and classes_resp.json():
        class_id = classes_resp.json()[0]["id"]
        check("GET class roster", "GET", f"/classes/{class_id}/roster", coach_token)
        check("GET class trend", "GET", f"/classes/{class_id}/trend", coach_token)

    section("Class report as Educator too")
    check("Educator can also see /classes", "GET", "/classes", educator_token)

    # =========== ADMIN-FACING MODULES ===========

    section("Admin")
    check("GET /dashboards/admin/overview", "GET", "/dashboards/admin/overview", admin_token)
    check("GET /dashboards/admin/llm-stats", "GET", "/dashboards/admin/llm-stats", admin_token)
    check("GET /dashboards/admin/settings", "GET", "/dashboards/admin/settings", admin_token)

    section("Role gating - coach must be blocked from admin-only routes")
    check("Coach blocked from /dashboards/admin/overview", "GET", "/dashboards/admin/overview", coach_token, expect=403)

    # =========== SUMMARY ===========

    print("\n" + "=" * 60)
    print(f"RESULTS: {results['pass']} passed, {results['fail']} failed")
    print("=" * 60)
    if results["fail"] > 0:
        print("\nSome checks failed - scroll up to see which ones, and paste")
        print("the [FAIL] lines back if you want help diagnosing any of them.")
        sys.exit(1)
    else:
        print("\nEverything checked out.")


if __name__ == "__main__":
    main()
