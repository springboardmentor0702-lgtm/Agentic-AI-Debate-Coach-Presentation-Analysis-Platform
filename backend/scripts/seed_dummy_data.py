"""
scripts/seed_dummy_data.py  (v2 - covers every feature through Segment 26)

Creates a full, realistic dataset for testing every module and every
role: an admin, a debate coach, an educator, and 8 learners with
varied performance histories - plus classes, goals, peer comparison
opt-ins, coach feedback, AI debates, human-vs-human debates in every
state (pending invite, declined, accepted-in-progress, completed),
research briefs, agentic coaching sessions, and counterargument/case
review history - so every dashboard, chart, and history panel has
something real to show immediately.

Run once, from the `backend` directory, with your venv active:
    python scripts/seed_dummy_data.py

Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from your existing .env -
uses the service role key directly, exactly like the real backend
does, so this bypasses RLS the same way genuine server-side calls do.

Deliberately self-contained: does NOT import anything from `app.*`,
specifically to avoid any risk of an import-path bug breaking this
script - only `requests` and the standard library are used.

NOT idempotent: every seeded account uses the domain @seed.test, but
re-running this script does not check for existing seed data first -
running it twice creates duplicate accounts. Use WIPE_OPTIONS.sql
first if you want to re-seed from scratch.
"""
import os
import random
import sys
from datetime import datetime, timedelta, timezone

import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (check your .env file).")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

PASSWORD = "SeedTest123"


def db_insert(table, data):
    resp = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, json=data, timeout=15)
    if not resp.ok:
        print(f"  FAILED inserting into {table}: {resp.status_code} {resp.text}")
        resp.raise_for_status()
    result = resp.json()
    return result[0] if isinstance(result, list) and result else result


def db_update(table, match: dict, data: dict):
    params = {k: f"eq.{v}" for k, v in match.items()}
    resp = requests.patch(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, params=params, json=data, timeout=15)
    resp.raise_for_status()
    result = resp.json()
    return result[0] if isinstance(result, list) and result else result


def create_auth_user(email, full_name):
    resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=HEADERS,
        json={"email": email, "password": PASSWORD, "email_confirm": True},
        timeout=15,
    )
    if not resp.ok:
        print(f"  FAILED creating auth user {email}: {resp.status_code} {resp.text}")
        resp.raise_for_status()
    data = resp.json()
    return data.get("user", data)


def create_person(email, full_name, role, username=None, experience_level="Intermediate"):
    auth_user = create_auth_user(email, full_name)
    profile_data = {"id": auth_user["id"], "full_name": full_name, "role": role, "experience_level": experience_level}
    if username:
        profile_data["username"] = username
    profile = db_insert("profiles", profile_data)
    print(f"  Created {role}: {full_name} <{email}> (username: {username or '-'})")
    return profile


COMPONENT_WEIGHTS = {
    "argument_quality": 0.30, "evidence_usage": 0.20, "logical_consistency": 0.20,
    "rebuttal_effectiveness": 0.15, "communication_skills": 0.15,
}
COMPONENT_LABELS = {
    "argument_quality": "Argument Quality", "evidence_usage": "Evidence Usage",
    "logical_consistency": "Logical Consistency", "rebuttal_effectiveness": "Rebuttal Effectiveness",
    "communication_skills": "Communication Skills",
}


def days_ago_iso(days, hours=0):
    return (datetime.now(timezone.utc) - timedelta(days=days, hours=hours)).isoformat()


def make_snapshot(user_id, scores, days_ago):
    available = {k: v for k, v in scores.items() if v is not None}
    if available:
        weight_sum = sum(COMPONENT_WEIGHTS[k] for k in available)
        overall = round(sum(v * (COMPONENT_WEIGHTS[k] / weight_sum) for k, v in available.items()), 2)
    else:
        overall = None
    components = [
        {"key": k, "label": COMPONENT_LABELS[k], "weight_pct": round(COMPONENT_WEIGHTS[k] * 100),
         "score": scores.get(k), "has_data": scores.get(k) is not None}
        for k in COMPONENT_WEIGHTS
    ]
    return db_insert("performance_snapshots", {
        "user_id": user_id, "overall_score": overall, "components": components, "created_at": days_ago_iso(days_ago),
    })


TOPICS = [
    "This house believes social media should be regulated",
    "Universal basic income would reduce poverty",
    "Standardized testing should be abolished",
    "AI development should be paused for safety review",
    "Remote work is better for productivity than office work",
    "Zoos do more harm than good",
    "College education should be free",
    "Nuclear energy is the best path to decarbonization",
]

ARGUMENT_TEXTS = [
    "Regulation would reduce the spread of misinformation by holding platforms accountable for what they amplify, similar to how broadcast media is held to standards.",
    "A basic income guarantees a floor beneath which no one falls, reducing the administrative overhead of means-tested welfare while giving people real choice.",
    "Standardized tests reduce a student's potential to a single number and often reflect access to test prep resources more than actual ability.",
    "Given how fast capability is advancing, a temporary pause would let safety research catch up before harder-to-reverse deployment decisions are made.",
]


def seed_argument_analysis(user_id, topic, score, days_ago):
    return db_insert("argument_analyses", {
        "user_id": user_id, "topic": topic, "input_text": random.choice(ARGUMENT_TEXTS), "overall_score": score,
        "scores": {
            "clarity": round(score + random.uniform(-0.5, 0.5), 1),
            "relevance": round(score + random.uniform(-0.5, 0.5), 1),
            "evidence_strength": round(score + random.uniform(-1, 0.5), 1),
            "logical_consistency": round(score + random.uniform(-0.5, 0.5), 1),
            "persuasiveness": round(score + random.uniform(-0.5, 0.5), 1),
        },
        "strengths": ["Clear structure", "Directly addresses the topic"],
        "weaknesses": ["Could cite more specific evidence"],
        "summary_feedback": "A solid argument overall, with room to strengthen the evidentiary support.",
        "claims": [{"claim": topic, "type": "policy", "evidence": ["cited example"], "evidence_strength": "moderate", "note": None}],
        "created_at": days_ago_iso(days_ago),
    })


def seed_fallacy_detection(user_id, topic, credibility_score, days_ago):
    return db_insert("fallacy_detections", {
        "user_id": user_id, "topic": topic,
        "input_text": "My opponent clearly doesn't care about this issue, so their argument can't be trusted.",
        "credibility_score": credibility_score,
        "fallacies_detected": [{
            "fallacy_type": "ad_hominem", "quote": "doesn't care about this issue",
            "explanation": "Attacks the opponent's character rather than the substance of their argument.",
            "correction_suggestion": "Address the actual claim being made instead.",
        }] if credibility_score < 7 else [],
        "reasoning_analysis": "The argument relies partly on emotional framing rather than direct evidence.",
        "created_at": days_ago_iso(days_ago),
    })


def seed_counterarguments(user_id, topic, days_ago):
    return db_insert("counterarguments", {
        "user_id": user_id, "topic": topic, "input_text": random.choice(ARGUMENT_TEXTS),
        "counterarguments": [
            {"type": "practical_concern", "counterargument": "Implementation costs could outweigh the projected benefits in the short term.", "rationale": "Budget constraints are a real, immediate obstacle regardless of long-term upside."},
            {"type": "alternative_solution", "counterargument": "A more targeted, means-tested approach could achieve similar goals more efficiently.", "rationale": "Broad measures often waste resources on cases that don't need them."},
        ],
        "challenge_questions": ["What happens to existing programs this would replace?", "How would this be funded sustainably?"],
        "alternative_perspectives": ["A market-based solution might address this without new regulation."],
        "strategy_suggestions": ["Lead with the strongest economic data point before addressing objections."],
        "created_at": days_ago_iso(days_ago),
    })


def seed_case_review(user_id, topic, days_ago):
    return db_insert("case_reviews", {
        "user_id": user_id, "topic": topic, "input_text": random.choice(ARGUMENT_TEXTS),
        "tools_run": ["argument_analysis", "fallacy_detection", "counterarguments"],
        "argument_analysis": {
            "overall_score": 7.2,
            "scores": {"clarity": 7.5, "relevance": 7.8, "evidence_strength": 6.5, "logical_consistency": 7.4, "persuasiveness": 7.0},
            "strengths": ["Clear thesis"], "weaknesses": ["Evidence could be more current"],
            "claims": [{"claim": topic, "type": "policy", "evidence": ["example"], "evidence_strength": "moderate", "note": None}],
            "summary_feedback": "Solid foundation, needs stronger sourcing.",
        },
        "fallacy_detection": {
            "credibility_score": 8.0, "fallacies_detected": [],
            "reasoning_analysis": "No significant fallacies detected in this argument.",
        },
        "counterarguments": {
            "counterarguments": [{"type": "practical_concern", "counterargument": "Cost is a real barrier.", "rationale": "Budgets are finite."}],
            "challenge_questions": ["How is this funded?"],
            "alternative_perspectives": ["A phased rollout could reduce risk."],
            "strategy_suggestions": ["Address cost concerns early."],
        },
        "synthesis": "This is a well-structured argument with solid logical consistency and no major fallacies. The main opportunity for improvement is citing more current, specific evidence, and preemptively addressing the cost objection likely to come from the opposition.",
        "created_at": days_ago_iso(days_ago),
    })


def seed_presentation_analysis(user_id, topic, score, days_ago):
    wpm = random.randint(120, 160)
    transcript = "So, basically, I think this is a really important issue that we need to think about carefully..."
    # duration_seconds was missing entirely from the original version of
    # this script - a real input this table needs (the frontend sends
    # it, and pace/wpm is computed from it), most likely NOT NULL with
    # no default. Estimated from word count and the sampled pace so
    # the numbers are at least internally consistent.
    word_count = len(transcript.split())
    duration_seconds = round(word_count / (wpm / 60))
    return db_insert("presentation_analyses", {
        "user_id": user_id, "topic": topic,
        "transcript": transcript,
        "duration_seconds": duration_seconds,
        "overall_score": score,
        "pace": {"wpm": wpm, "assessment": "good pace"},
        "filler_words": {"total": random.randint(2, 10), "breakdown": {"um": 3, "like": 2, "basically": 1}},
        "scores": {
            "confidence": round(score + random.uniform(-0.5, 0.5), 1),
            "clarity": round(score + random.uniform(-0.5, 0.5), 1),
            "engagement": round(score + random.uniform(-0.5, 0.5), 1),
        },
        "strengths": ["Good pacing", "Clear opening"], "improvements": ["Reduce filler words"],
        "summary_feedback": "Solid delivery - work on trimming filler words for a more polished feel.",
        "created_at": days_ago_iso(days_ago),
    })


def seed_ai_debate(user_id, topic, user_score, days_ago):
    session = db_insert("debate_sessions", {
        "user_id": user_id, "topic": topic, "format": "one_on_one", "user_position": "For", "ai_position": "Against",
        "status": "active", "round_count": 1, "mode": "ai_simulation", "created_at": days_ago_iso(days_ago),
    })
    db_insert("debate_rounds", {
        "session_id": session["id"], "user_id": user_id, "round_number": 1,
        "user_argument": random.choice(ARGUMENT_TEXTS),
        "opponent_argument": "There are strong counterarguments worth considering here, particularly around unintended consequences.",
        "judge_feedback": {
            "round_winner": "user" if user_score >= 7 else "opponent",
            "user_score": user_score, "opponent_score": round(10 - user_score + random.uniform(-1, 1), 1),
            "feedback": "A well-structured round with clear position-taking.",
            "key_moment": "The opening claim set up the rest of the argument effectively.",
        },
        "created_at": days_ago_iso(days_ago),
    })
    return session


def seed_research_brief(user_id, topic, position, days_ago):
    return db_insert("research_briefs", {
        "user_id": user_id, "topic": topic, "position": position,
        "brief": {
            "key_facts": [
                {"fact": f"There is substantial academic literature examining {topic.lower()}.", "source_url": "https://en.wikipedia.org/wiki/Special:Search"},
                {"fact": "Multiple pilot programs have produced mixed but informative results.", "source_url": None},
            ],
            "counter_evidence": ["Critics point to implementation cost as the primary obstacle."],
            "suggested_angle": f"Frame around long-term outcomes rather than short-term cost for the {position or 'assigned'} side.",
        },
        "queries_used": [f"{topic} evidence", f"{topic} criticism"],
        "sources": [{"title": topic, "snippet": "Overview and background.", "url": "https://en.wikipedia.org/wiki/Special:Search"}],
        "iterations": 2,
        "created_at": days_ago_iso(days_ago),
    })


def seed_coaching_agent_session(user_id, question, days_ago, with_goal=False):
    return db_insert("coaching_agent_sessions", {
        "user_id": user_id, "question": question,
        "response": "Based on your recent history, focus on strengthening evidence usage - your arguments are clear and well-structured, but citing more specific, current sources would raise your overall credibility.",
        "tools_used": ["get_performance_history", "check_active_goals"],
        "iterations": 2,
        "proposed_goal": {"metric": "evidence_usage", "target_value": 7.5, "rationale": "Your weakest scored area right now, and the most improvable with focused practice."} if with_goal else None,
        "created_at": days_ago_iso(days_ago),
    })


def main():
    print("Seeding dummy data (v2 - covers every feature through Segment 26)...\n")

    print("Staff accounts:")
    admin = create_person("admin@seed.test", "Jordan Admin", "admin", username="jordan_admin")
    coach = create_person("coach@seed.test", "Taylor Coach", "debate_coach", username="taylor_coach")
    educator = create_person("educator@seed.test", "Morgan Educator", "educator", username="morgan_edu")

    print("\nLearners:")
    learner_specs = [
        ("Alex Chen", "alex_chen", "Advanced", 8.5),
        ("Sam Rivera", "sam_rivera", "Advanced", 7.8),
        ("Jordan Lee", "jordan_lee", "Intermediate", 6.9),
        ("Casey Kim", "casey_kim", "Intermediate", 6.2),
        ("Riley Patel", "riley_patel", "Intermediate", 5.5),
        ("Morgan Diaz", None, "Beginner", 4.8),
        ("Jamie Fox", "jamie_fox", "Beginner", 4.0),
        ("Drew Nguyen", "drew_nguyen", "Beginner", 3.2),
    ]
    learners = []
    for i, (name, username, level, base_score) in enumerate(learner_specs):
        email = f"learner{i+1}@seed.test"
        profile = create_person(email, name, "learner", username=username, experience_level=level)
        learners.append({**profile, "base_score": base_score})

    print("\nSeeding activity history across every tool...")
    for idx, learner in enumerate(learners):
        uid = learner["id"]
        base = learner["base_score"]

        for i, days_ago in enumerate([21, 10, 2]):
            score = round(min(10, max(0, base - 0.6 + i * 0.4 + random.uniform(-0.3, 0.3))), 1)
            seed_argument_analysis(uid, random.choice(TOPICS), score, days_ago)

        for days_ago in [14, 4]:
            score = round(min(10, max(0, base + random.uniform(-1, 0.5))), 1)
            seed_fallacy_detection(uid, random.choice(TOPICS), score, days_ago)

        # Counterarguments and case reviews - missing from the original
        # seed script entirely; every learner gets at least one of each.
        seed_counterarguments(uid, random.choice(TOPICS), days_ago=random.choice([6, 12]))
        seed_case_review(uid, random.choice(TOPICS), days_ago=random.choice([8, 15]))

        if learner is not learners[-1] and learner is not learners[-2]:
            score = round(min(10, max(0, base + random.uniform(-1, 1))), 1)
            seed_presentation_analysis(uid, random.choice(TOPICS), score, 7)

        debate_score = round(min(10, max(0, base + random.uniform(-1, 1))), 1)
        seed_ai_debate(uid, random.choice(TOPICS), debate_score, 5)

        # Research briefs and coaching agent sessions (Segments 24-25) -
        # every learner gets at least one of each, one learner gets a
        # coaching session with an actual proposed goal attached.
        seed_research_brief(uid, random.choice(TOPICS), random.choice(["For", "Against"]), days_ago=random.choice([3, 9]))
        seed_coaching_agent_session(
            uid, "What should I focus on to improve?", days_ago=random.choice([2, 6]),
            with_goal=(idx == 2),
        )

        for days_ago, adjustment in [(20, -0.8), (10, -0.3), (1, 0.0)]:
            scores = {
                "argument_quality": round(min(10, max(0, base + adjustment + random.uniform(-0.3, 0.3))), 1),
                "evidence_usage": round(min(10, max(0, base + adjustment + random.uniform(-0.5, 0.3))), 1),
                "logical_consistency": round(min(10, max(0, base + adjustment + random.uniform(-0.3, 0.3))), 1),
                "rebuttal_effectiveness": round(min(10, max(0, base + adjustment + random.uniform(-0.5, 0.5))), 1),
                "communication_skills": None if learner in (learners[-1], learners[-2]) else round(
                    min(10, max(0, base + adjustment + random.uniform(-0.5, 0.5))), 1
                ),
            }
            make_snapshot(uid, scores, days_ago)

        if learner not in (learners[-1],):
            db_update("profiles", {"id": uid}, {"participate_in_comparison": True})

    # Consecutive-day activity for 2 learners specifically, so the
    # Practice Streaks feature (Segment 26) has something real to show
    # rather than the sparse, scattered dates above (which don't form
    # a meaningful streak on their own).
    print("\nSeeding consecutive-day activity for streak testing...")
    for days_ago in [0, 1, 2, 3, 4]:
        seed_argument_analysis(learners[0]["id"], random.choice(TOPICS), round(learners[0]["base_score"] + random.uniform(-0.3, 0.3), 1), days_ago)
    print(f"  {learners[0]['full_name']}: 5-day consecutive streak")
    for days_ago in [0, 1]:
        seed_fallacy_detection(learners[2]["id"], random.choice(TOPICS), round(learners[2]["base_score"] + random.uniform(-0.3, 0.3), 1), days_ago)
    print(f"  {learners[2]['full_name']}: 2-day consecutive streak")

    print("\nCreating a class with a coach and a roster...")
    debate_class = db_insert("classes", {"name": "Varsity Debate - Fall", "created_by": coach["id"]})
    for learner in learners[:5]:
        db_insert("class_members", {"class_id": debate_class["id"], "learner_id": learner["id"]})
    print(f"  Created class '{debate_class['name']}' with 5 members")

    print("\nCreating goals (self-set and coach-assigned)...")
    db_insert("goals", {"user_id": learners[2]["id"], "metric": "argument_quality", "target_value": 8.0, "status": "active"})
    db_insert("goals", {"user_id": learners[3]["id"], "metric": "overall_score", "target_value": 7.5, "status": "active"})
    db_insert("goals", {"user_id": learners[4]["id"], "metric": "evidence_usage", "target_value": 7.0, "status": "active", "assigned_by": coach["id"]})
    db_insert("goals", {"user_id": learners[5]["id"], "metric": "communication_skills", "target_value": 6.5, "status": "active", "assigned_by": coach["id"]})
    print("  Created 4 goals (2 self-set, 2 assigned by the coach)")

    print("\nCreating coach feedback...")
    first_analysis = seed_argument_analysis(learners[0]["id"], TOPICS[0], 8.2, 1)
    db_insert("coach_feedback", {
        "coach_id": coach["id"], "learner_id": learners[0]["id"], "item_type": "argument_analysis", "item_id": first_analysis["id"],
        "feedback_text": "Strong use of evidence here - try citing a specific source next time to make it even more concrete.",
    })
    print("  Created 1 feedback entry")

    print("\nCreating human-vs-human debates in every state...")

    # 1. Accepted, in-progress (one judged round, waiting on the next)
    hvh_active = db_insert("debate_sessions", {
        "user_id": learners[0]["id"], "opponent_id": learners[1]["id"], "topic": TOPICS[1], "format": "policy",
        "user_position": "For", "ai_position": "Against", "status": "active", "round_count": 1,
        "mode": "human_vs_human", "invite_status": "accepted",
    })
    db_insert("debate_rounds", {
        "session_id": hvh_active["id"], "user_id": learners[0]["id"], "round_number": 1,
        "user_argument": ARGUMENT_TEXTS[1],
        "opponent_argument": "A basic income without addressing housing costs directly risks just inflating rents rather than improving real welfare.",
        "judge_feedback": {
            "round_winner": "opponent", "user_score": 6.5, "opponent_score": 7.5,
            "feedback": "The opponent's point about housing costs was a sharp, well-targeted rebuttal.",
            "key_moment": "The housing cost counterpoint went unaddressed.",
        },
    })
    print(f"  1. Accepted, in-progress: {learners[0]['full_name']} vs {learners[1]['full_name']}")

    # 2. Pending invite (not yet responded to)
    db_insert("debate_sessions", {
        "user_id": learners[2]["id"], "opponent_id": learners[3]["id"], "topic": TOPICS[2], "format": "oxford",
        "user_position": "Against", "ai_position": "For", "status": "active", "round_count": 0,
        "mode": "human_vs_human", "invite_status": "pending",
    })
    print(f"  2. Pending invite: {learners[2]['full_name']} invited {learners[3]['full_name']}")

    # 3. Declined invite
    db_insert("debate_sessions", {
        "user_id": learners[4]["id"], "opponent_id": learners[5]["id"], "topic": TOPICS[3], "format": "public_forum",
        "user_position": "For", "ai_position": "Against", "status": "active", "round_count": 0,
        "mode": "human_vs_human", "invite_status": "declined",
    })
    print(f"  3. Declined invite: {learners[4]['full_name']} invited {learners[5]['full_name']}")

    # 4. Completed (ended), multiple rounds
    hvh_done = db_insert("debate_sessions", {
        "user_id": learners[6]["id"], "opponent_id": learners[7]["id"], "topic": TOPICS[4], "format": "one_on_one",
        "user_position": "For", "ai_position": "Against", "status": "completed", "round_count": 2,
        "mode": "human_vs_human", "invite_status": "accepted",
    })
    db_insert("debate_rounds", {
        "session_id": hvh_done["id"], "user_id": learners[6]["id"], "round_number": 1,
        "user_argument": ARGUMENT_TEXTS[0], "opponent_argument": "Remote work erodes mentorship opportunities that happen informally in person.",
        "judge_feedback": {"round_winner": "user", "user_score": 7.5, "opponent_score": 6.0, "feedback": "Strong opening.", "key_moment": "Clear data point on productivity."},
    })
    db_insert("debate_rounds", {
        "session_id": hvh_done["id"], "user_id": learners[6]["id"], "round_number": 2,
        "user_argument": "Mentorship can be structured deliberately rather than left to chance, which benefits more people than informal hallway conversations ever did.",
        "opponent_argument": "Structured mentorship still can't replicate the spontaneous problem-solving that happens when teams share physical space.",
        "judge_feedback": {"round_winner": "tie", "user_score": 7.0, "opponent_score": 7.0, "feedback": "Both sides landed a real point here.", "key_moment": "Neither side directly rebutted the other's core claim."},
    })
    print(f"  4. Completed, 2 rounds: {learners[6]['full_name']} vs {learners[7]['full_name']}")

    print("\n" + "=" * 60)
    print("DONE. Login credentials (all use the same password):")
    print(f"  Password for every account: {PASSWORD}")
    print("=" * 60)
    print(f"  Admin:      admin@seed.test")
    print(f"  Coach:      coach@seed.test")
    print(f"  Educator:   educator@seed.test")
    for i, (name, username, level, _) in enumerate(learner_specs):
        print(f"  Learner:    learner{i+1}@seed.test  ({name}, {level})")
    print("=" * 60)


if __name__ == "__main__":
    main()
