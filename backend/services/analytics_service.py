"""Real-time analytics for every role on the platform.

Design note
-----------
All four roles (Learner, Debate Coach, Educator, Administrator) return the SAME
envelope: kpis + series + tables + insights. Only the content differs. That is
what makes the analytics "consistent across roles" - the frontend renders one
generic layout and never needs a per-role branch, and a new role can be added
here without touching the UI.

Every number is computed from the live database on each request. Nothing is
cached, hardcoded, or seeded, so the dashboard reflects the current state of
play the moment it is refreshed.

Coach and educator analytics are scoped through the assignment tables in
models.py. Learners without an assignment are intentionally absent from staff
views until a coach or educator assigns them.
"""

from __future__ import annotations

import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional, Sequence

from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from services import agent_bridge

# Import time is close enough to process start for an uptime figure that is
# honest (it measures this API process, and says so in the label).
_PROCESS_START = time.time()

SKILL_DIMENSIONS = (
    ("argument_quality", "Argument Quality"),
    ("evidence_use", "Evidence Use"),
    ("logical_consistency", "Logical Consistency"),
    ("rebuttal_effectiveness", "Rebuttal Effectiveness"),
    ("communication_skills", "Communication"),
)

SCORE_BANDS = (
    (90.0, "90-100"),
    (80.0, "80-89"),
    (70.0, "70-79"),
    (60.0, "60-69"),
    (0.0, "Below 60"),
)

TREND_DAYS = 7
RECENT_LIMIT = 8


# ---------------------------------------------------------------------------
# Small formatting helpers. Kept private so the payload builders stay readable.
# ---------------------------------------------------------------------------
def _avg(values: Sequence[float]) -> Optional[float]:
    clean = [float(v) for v in values if v is not None]
    return round(sum(clean) / len(clean), 1) if clean else None


def _latest_scores(scores: Sequence[models.PerformanceScore]) -> List[models.PerformanceScore]:
    """Use one canonical, newest score per session in all aggregates."""
    latest: Dict[int, models.PerformanceScore] = {}
    for score in scores:
        current = latest.get(score.session_id)
        if current is None or (score.created_at, score.id) > (current.created_at, current.id):
            latest[score.session_id] = score
    return list(latest.values())


def _pct(value: Optional[float]) -> str:
    return "—" if value is None else f"{round(float(value), 1)}%"


def _count(value: Optional[int]) -> str:
    return "0" if not value else f"{int(value):,}"


def _kpi(
    key: str,
    label: str,
    value: Optional[float],
    display: str,
    unit: str = "",
    hint: str = "",
    tone: str = "neutral",
) -> Dict[str, Any]:
    return {
        "key": key,
        "label": label,
        "value": None if value is None else round(float(value), 1),
        "display": display,
        "unit": unit,
        "hint": hint,
        "tone": tone,
    }


def _series(key: str, label: str, points: Iterable[Dict[str, Any]], unit: str = "", kind: str = "bar") -> Dict[str, Any]:
    return {"key": key, "label": label, "kind": kind, "unit": unit, "points": list(points)}


def _table(key: str, title: str, columns: Sequence[str], rows: Sequence[Sequence[Any]], empty_message: str) -> Dict[str, Any]:
    return {
        "key": key,
        "title": title,
        "columns": list(columns),
        "rows": [[("—" if cell is None else str(cell)) for cell in row] for row in rows],
        "empty_message": empty_message,
    }


def _skill_level(average: Optional[float]) -> str:
    if average is None:
        return "Not started"
    if average >= 85:
        return "Level 3 · Master"
    if average >= 70:
        return "Level 2 · Competent"
    return "Level 1 · Novice"


def _daily_counts(timestamps: Iterable[Optional[datetime]], days: int = TREND_DAYS) -> List[Dict[str, Any]]:
    """Activity per day for the trailing window, including days with zero rows."""
    today = datetime.utcnow().date()
    window = [today - timedelta(days=offset) for offset in range(days - 1, -1, -1)]
    tally: Counter = Counter()
    for stamp in timestamps:
        if stamp is not None:
            tally[stamp.date()] += 1
    return [{"label": day.strftime("%d %b"), "value": float(tally.get(day, 0))} for day in window]


def _band_distribution(scores: Sequence[float]) -> List[Dict[str, Any]]:
    tally: Counter = Counter()
    for score in scores:
        for threshold, label in SCORE_BANDS:
            if score >= threshold:
                tally[label] += 1
                break
    return [{"label": label, "value": float(tally.get(label, 0))} for _, label in SCORE_BANDS]


def _fallacy_points(rows: Sequence[Any]) -> List[Dict[str, Any]]:
    return [{"label": str(name), "value": float(total)} for name, total in rows]


def _learner_cohort(db: Session) -> List[models.User]:
    """See the roster assumption in this module's docstring."""
    return db.query(models.User).filter(models.User.role == "Learner").order_by(models.User.full_name.asc()).all()


def _coach_assigned_learners(db: Session, coach: models.User) -> List[models.User]:
    """Return only Learners explicitly assigned to this coach."""
    assignments = (
        db.query(models.CoachAssignment.learner_id)
        .filter(models.CoachAssignment.coach_id == coach.id)
        .all()
    )
    learner_ids = [a[0] for a in assignments]
    if not learner_ids:
        return []
    return (
        db.query(models.User)
        .filter(models.User.id.in_(learner_ids), models.User.role == "Learner")
        .order_by(models.User.full_name.asc())
        .all()
    )


def _educator_cohort_learners(db: Session, educator: models.User) -> List[models.User]:
    """Return only Learners in this educator's cohort."""
    entries = (
        db.query(models.EducatorCohort.learner_id)
        .filter(models.EducatorCohort.educator_id == educator.id)
        .all()
    )
    learner_ids = [e[0] for e in entries]
    if not learner_ids:
        return []
    return (
        db.query(models.User)
        .filter(models.User.id.in_(learner_ids), models.User.role == "Learner")
        .order_by(models.User.full_name.asc())
        .all()
    )


# ---------------------------------------------------------------------------
# Learner
# ---------------------------------------------------------------------------
def _learner_payload(db: Session, user: models.User) -> Dict[str, Any]:
    sessions = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.user_id == user.id)
        .order_by(models.DebateSession.created_at.desc())
        .all()
    )
    scores = (
        db.query(models.PerformanceScore)
        .filter(models.PerformanceScore.user_id == user.id)
        .order_by(models.PerformanceScore.created_at.asc())
        .all()
    )
    metrics = (
        db.query(models.PresentationMetric)
        .filter(models.PresentationMetric.user_id == user.id)
        .order_by(models.PresentationMetric.created_at.asc())
        .all()
    )
    fallacy_rows = (
        db.query(models.FallacyLog.fallacy_type, func.count(models.FallacyLog.id))
        .filter(models.FallacyLog.user_id == user.id)
        .group_by(models.FallacyLog.fallacy_type)
        .order_by(func.count(models.FallacyLog.id).desc())
        .all()
    )
    turns_total = (
        db.query(func.count(models.SimulationTurn.id))
        .filter(models.SimulationTurn.user_id == user.id)
        .scalar()
        or 0
    )

    completed = [s for s in sessions if s.status == "Completed"]
    scores = _latest_scores(scores)
    overall_values = [s.overall_weighted_score for s in scores]
    average_overall = _avg(overall_values)
    grade, band = agent_bridge.grade_for(average_overall or 0.0)
    top_fallacy = str(fallacy_rows[0][0]) if fallacy_rows else None
    fallacy_total = sum(int(total) for _, total in fallacy_rows)

    kpis = [
        _kpi("debates_completed", "Debates Completed", len(completed), _count(len(completed)), hint=f"{len(sessions)} session(s) created in total"),
        _kpi(
            "average_overall_score",
            "Average Overall Score",
            average_overall,
            _pct(average_overall),
            unit="%",
            hint=f"Grade {grade} · {band}" if average_overall is not None else "Complete a session to be graded",
            tone="good" if (average_overall or 0) >= 80 else "warn" if average_overall is not None else "neutral",
        ),
        _kpi("skill_level", "Skill Level", None, _skill_level(average_overall), hint=f"{turns_total} simulation turn(s) argued"),
        _kpi(
            "top_fallacy",
            "Most Frequent Fallacy",
            None,
            top_fallacy or "None detected",
            hint=f"{fallacy_total} fallacy flag(s) across all analyses",
            tone="warn" if top_fallacy else "good",
        ),
    ]

    latest_scores = scores[-1] if scores else None
    skill_points = [
        {
            "label": label,
            "value": round(float(_avg([getattr(s, field) for s in scores]) or 0.0), 1),
        }
        for field, label in SKILL_DIMENSIONS
    ] if scores else []

    series = [
        _series(
            "score_trend",
            "Overall Score Trend",
            [
                {"label": f"S{index}", "value": round(float(score.overall_weighted_score), 1)}
                for index, score in enumerate(scores[-RECENT_LIMIT:], start=max(1, len(scores) - RECENT_LIMIT + 1))
            ],
            unit="%",
            kind="line",
        ),
        _series("skill_matrix", "Rhetorical Skill Matrix", skill_points, unit="%", kind="bar"),
        _series("fallacy_breakdown", "Fallacies Flagged By Type", _fallacy_points(fallacy_rows), kind="bar"),
        _series(
            "pace_trend",
            "Speaking Pace (WPM)",
            [
                {"label": f"P{index}", "value": round(float(metric.speech_pace_wpm), 1)}
                for index, metric in enumerate(metrics[-RECENT_LIMIT:], start=1)
            ],
            unit="WPM",
            kind="line",
        ),
        _series("activity", f"Sessions (last {TREND_DAYS} days)", _daily_counts([s.created_at for s in sessions]), kind="bar"),
    ]

    score_by_session = {score.session_id: score for score in scores}
    tables = [
        _table(
            "recent_sessions",
            "Debate Practice History",
            ["Topic", "Format", "Position", "Score", "Status", "Date"],
            [
                [
                    (session.topic or "")[:60],
                    session.format,
                    session.assigned_position,
                    _pct(getattr(score_by_session.get(session.id), "overall_weighted_score", None)),
                    session.status,
                    session.created_at.strftime("%Y-%m-%d") if session.created_at else "—",
                ]
                for session in sessions[:RECENT_LIMIT]
            ],
            "No debate sessions recorded yet. Start a simulation to populate this table.",
        ),
        _table(
            "presentation_archive",
            "Presentation Prosody Archive",
            ["Pace (WPM)", "Filler Words", "Confidence", "Clarity", "Engagement", "Recorded"],
            [
                [
                    metric.speech_pace_wpm,
                    f"{metric.filler_words_count} ({metric.filler_words_list or 'none'})",
                    _pct(metric.confidence_score),
                    _pct(metric.clarity_score),
                    _pct(metric.engagement_score),
                    metric.created_at.strftime("%Y-%m-%d") if metric.created_at else "—",
                ]
                for metric in reversed(metrics[-RECENT_LIMIT:])
            ],
            "No speech analyses yet. Run a vocal metrics analysis to populate this table.",
        ),
    ]

    insights: List[str] = []
    if not sessions:
        insights.append("Start your first AI debate simulation to unlock personalised analytics.")
    if average_overall is not None:
        weakest = min(
            ((field, label) for field, label in SKILL_DIMENSIONS),
            key=lambda pair: _avg([getattr(s, pair[0]) for s in scores]) or 0.0,
        )
        insights.append(f"Your weakest scoring dimension is {weakest[1]}. Target it in your next session.")
    if top_fallacy:
        insights.append(f"{top_fallacy} is your most frequent logical slip - review the correction guidance for it.")
    if metrics:
        average_wpm = _avg([m.speech_pace_wpm for m in metrics]) or 0.0
        if average_wpm > 160:
            insights.append(f"Average pace is {average_wpm} WPM. Slow toward the 130-150 WPM target band.")
        elif average_wpm and average_wpm < 110:
            insights.append(f"Average pace is {average_wpm} WPM. Lift it toward 130-150 WPM for a more persuasive rhythm.")
        else:
            insights.append(f"Speaking pace is healthy at {average_wpm} WPM.")

    return {
        "scope": "self",
        "kpis": kpis,
        "series": series,
        "tables": tables,
        "insights": insights,
        "detail": {
            "sessions_total": len(sessions),
            "sessions_completed": len(completed),
            "simulation_turns": int(turns_total),
            "grade": grade if average_overall is not None else None,
            "grade_band": band if average_overall is not None else None,
            "latest_score": round(float(latest_scores.overall_weighted_score), 1) if latest_scores else None,
        },
    }


# ---------------------------------------------------------------------------
# Shared cohort maths for Coach and Educator
# ---------------------------------------------------------------------------
def _cohort_facts(db: Session, learners: Optional[List[models.User]] = None) -> Dict[str, Any]:
    if learners is None:
        learners = _learner_cohort(db)
    learner_ids = [learner.id for learner in learners]

    scores: List[models.PerformanceScore] = []
    metrics: List[models.PresentationMetric] = []
    sessions: List[models.DebateSession] = []
    fallacy_rows: List[Any] = []

    if learner_ids:
        scores = db.query(models.PerformanceScore).filter(models.PerformanceScore.user_id.in_(learner_ids)).all()
        metrics = db.query(models.PresentationMetric).filter(models.PresentationMetric.user_id.in_(learner_ids)).all()
        sessions = db.query(models.DebateSession).filter(models.DebateSession.user_id.in_(learner_ids)).all()
        fallacy_rows = (
            db.query(models.FallacyLog.fallacy_type, func.count(models.FallacyLog.id))
            .filter(models.FallacyLog.user_id.in_(learner_ids))
            .group_by(models.FallacyLog.fallacy_type)
            .order_by(func.count(models.FallacyLog.id).desc())
            .all()
        )

    scores_by_user: Dict[int, List[models.PerformanceScore]] = defaultdict(list)
    for score in scores:
        scores_by_user[score.user_id].append(score)

    metrics_by_user: Dict[int, List[models.PresentationMetric]] = defaultdict(list)
    for metric in metrics:
        metrics_by_user[metric.user_id].append(metric)

    sessions_by_user: Dict[int, List[models.DebateSession]] = defaultdict(list)
    for session in sessions:
        sessions_by_user[session.user_id].append(session)

    top_gap_by_user: Dict[int, str] = {}
    if learner_ids:
        gap_rows = (
            db.query(models.FallacyLog.user_id, models.FallacyLog.fallacy_type, func.count(models.FallacyLog.id).label("hits"))
            .filter(models.FallacyLog.user_id.in_(learner_ids))
            .group_by(models.FallacyLog.user_id, models.FallacyLog.fallacy_type)
            .order_by(func.count(models.FallacyLog.id).desc())
            .all()
        )
        for row in gap_rows:
            top_gap_by_user.setdefault(row[0], str(row[1]))

    ranked = []
    for learner in learners:
        learner_scores = _latest_scores(scores_by_user.get(learner.id, []))
        learner_metrics = metrics_by_user.get(learner.id, [])
        average = _avg([s.overall_weighted_score for s in learner_scores])
        grade, band = agent_bridge.grade_for(average or 0.0)
        ranked.append(
            {
                "user": learner,
                "sessions": len(sessions_by_user.get(learner.id, [])),
                "completed": len([s for s in sessions_by_user.get(learner.id, []) if s.status == "Completed"]),
                "average": average,
                "grade": grade if average is not None else "—",
                "band": band if average is not None else "Not graded",
                "logic": _avg([s.logical_consistency for s in learner_scores]),
                "clarity": _avg([m.clarity_score for m in learner_metrics]),
                "pace": _avg([m.speech_pace_wpm for m in learner_metrics]),
                "top_gap": top_gap_by_user.get(learner.id),
            }
        )
    ranked.sort(key=lambda item: (item["average"] is None, -(item["average"] or 0.0)))

    return {
        "learners": learners,
        "ranked": ranked,
        "scores": scores,
        "metrics": metrics,
        "sessions": sessions,
        "fallacy_rows": fallacy_rows,
        "cohort_average": _avg([s.overall_weighted_score for s in scores]),
        "cohort_pace": _avg([m.speech_pace_wpm for m in metrics]),
        "pending": len([s for s in sessions if s.status != "Completed"]),
    }


def _coach_payload(db: Session, user: models.User) -> Dict[str, Any]:
    assigned = _coach_assigned_learners(db, user)
    facts = _cohort_facts(db, learners=assigned)
    ranked = facts["ranked"]
    active_learners = [row for row in ranked if row["sessions"] > 0]
    at_risk = [row for row in ranked if row["average"] is not None and row["average"] < 70]

    kpis = [
        _kpi("roster_size", "Assigned Students", len(facts["learners"]), _count(len(facts["learners"])), hint=f"{len(active_learners)} active this term"),
        _kpi(
            "cohort_average",
            "Cohort Average Score",
            facts["cohort_average"],
            _pct(facts["cohort_average"]),
            unit="%",
            tone="good" if (facts["cohort_average"] or 0) >= 80 else "warn" if facts["cohort_average"] is not None else "neutral",
        ),
        _kpi("pending_evaluations", "Sessions Awaiting Review", facts["pending"], _count(facts["pending"]), hint="Sessions not yet marked Completed", tone="warn" if facts["pending"] else "good"),
        _kpi("at_risk", "At-Risk Students", len(at_risk), _count(len(at_risk)), hint="Scoring below 70% — prioritise for one-to-one coaching", tone="warn" if at_risk else "good"),
    ]

    series = [
        _series("score_distribution", "Cohort Score Distribution", _band_distribution([s.overall_weighted_score for s in facts["scores"]]), kind="bar"),
        _series("fallacy_breakdown", "Cohort Fallacies By Type", _fallacy_points(facts["fallacy_rows"]), kind="bar"),
        _series("activity", f"Cohort Sessions (last {TREND_DAYS} days)", _daily_counts([s.created_at for s in facts["sessions"]]), kind="bar"),
        _series(
            "cohort_skills",
            "Cohort Skill Averages",
            [{"label": label, "value": round(float(_avg([getattr(s, field) for s in facts["scores"]]) or 0.0), 1)} for field, label in SKILL_DIMENSIONS],
            unit="%",
            kind="bar",
        ),
    ]

    tables = [
        _table(
            "student_progress",
            "Assigned Learner Progress",
            ["Student", "Sessions", "Completed", "Average", "Grade", "Top Logic Gap"],
            [
                [row["user"].full_name, row["sessions"], row["completed"], _pct(row["average"]), row["grade"], row["top_gap"] or "None flagged"]
                for row in ranked
            ],
            "No learners assigned yet. Use Roster Management to assign learners.",
        ),
        _table(
            "attention_list",
            "Needs Coaching Attention",
            ["Student", "Average", "Logic", "Pace (WPM)", "Top Logic Gap"],
            [
                [row["user"].full_name, _pct(row["average"]), _pct(row["logic"]), row["pace"], row["top_gap"] or "None flagged"]
                for row in at_risk
            ],
            "No assigned learners are currently below the 70% threshold.",
        ),
    ]

    insights: List[str] = []
    if not assigned:
        insights.append("No learners are assigned to you yet. Use Roster Management to assign learners.")
    if facts["fallacy_rows"]:
        name, hits = facts["fallacy_rows"][0]
        insights.append(f"{name} is the most common cohort-wide fallacy ({int(hits)} flag(s)). Consider a group drill on it.")
    if facts["cohort_pace"] is not None:
        insights.append(f"Cohort speaking pace averages {facts['cohort_pace']} WPM against the 130-150 WPM target.")
    if facts["pending"]:
        insights.append(f"{facts['pending']} session(s) are still open and awaiting completion.")
    if at_risk:
        insights.append(f"{len(at_risk)} student(s) are scoring below 70% and should be prioritised.")

    return {
        "scope": "cohort",
        "kpis": kpis,
        "series": series,
        "tables": tables,
        "insights": insights,
        "detail": {
            "roster_size": len(facts["learners"]),
            "active_learners": len(active_learners),
            "cohort_average": facts["cohort_average"],
            "pending_evaluations": facts["pending"],
            "top_performers": [row["user"].full_name for row in ranked[:5] if row["average"] is not None],
        },
    }


def _educator_payload(db: Session, user: models.User) -> Dict[str, Any]:
    cohort_learners = _educator_cohort_learners(db, user)
    facts = _cohort_facts(db, learners=cohort_learners)
    ranked = facts["ranked"]

    topic_tally: Counter = Counter()
    for session in facts["sessions"]:
        if session.topic:
            topic_tally[session.topic.strip()[:70]] += 1
    format_tally: Counter = Counter(session.format for session in facts["sessions"] if session.format)

    kpis = [
        _kpi("enrolled_students", "Enrolled Students", len(facts["learners"]), _count(len(facts["learners"]))),
        _kpi("active_topics", "Distinct Debate Topics", len(topic_tally), _count(len(topic_tally)), hint=f"{len(format_tally)} debate format(s) in use"),
        _kpi(
            "class_average",
            "Class Debate Average",
            facts["cohort_average"],
            _pct(facts["cohort_average"]),
            unit="%",
            tone="good" if (facts["cohort_average"] or 0) >= 80 else "warn" if facts["cohort_average"] is not None else "neutral",
        ),
        _kpi("class_pace", "Class Speaking Pace", facts["cohort_pace"], "—" if facts["cohort_pace"] is None else f"{facts['cohort_pace']} WPM", unit="WPM", hint="Target band 130-150 WPM"),
    ]

    series = [
        _series("score_distribution", "Class Score Distribution", _band_distribution([s.overall_weighted_score for s in facts["scores"]]), kind="bar"),
        _series("topic_activity", "Sessions Per Topic", [{"label": topic, "value": float(hits)} for topic, hits in topic_tally.most_common(6)], kind="bar"),
        _series("format_mix", "Debate Format Mix", [{"label": fmt, "value": float(hits)} for fmt, hits in format_tally.most_common(6)], kind="bar"),
        _series("fallacy_breakdown", "Class Fallacies By Type", _fallacy_points(facts["fallacy_rows"]), kind="bar"),
    ]

    tables = [
        _table(
            "leaderboard",
            "Student Leaderboard Rankings",
            ["Rank", "Student", "Logic", "Clarity", "Overall", "Grade"],
            [
                [index, row["user"].full_name, _pct(row["logic"]), _pct(row["clarity"]), _pct(row["average"]), row["grade"]]
                for index, row in enumerate(ranked, start=1)
                if row["average"] is not None
            ],
            "No scored sessions yet, so the leaderboard is empty.",
        ),
        _table(
            "topic_coverage",
            "Topic Coverage",
            ["Debate Topic", "Sessions Run"],
            [[topic, hits] for topic, hits in topic_tally.most_common(10)],
            "No debate topics have been assigned or attempted yet.",
        ),
    ]

    insights: List[str] = []
    if not cohort_learners:
        insights.append("No learners in your cohort yet. Use Roster Management to add learners.")
    elif not facts["sessions"]:
        insights.append("No sessions have been run yet, so class analytics are empty.")
    if topic_tally:
        topic, hits = topic_tally.most_common(1)[0]
        insights.append(f"'{topic}' is the most debated topic with {hits} session(s).")
    unscored = len([row for row in ranked if row["average"] is None])
    if unscored:
        insights.append(f"{unscored} enrolled student(s) have no scored session yet.")
    if facts["cohort_average"] is not None:
        insights.append(f"Class average sits at {facts['cohort_average']}% across {len(facts['scores'])} scored session(s).")

    return {
        "scope": "cohort",
        "kpis": kpis,
        "series": series,
        "tables": tables,
        "insights": insights,
        "detail": {
            "total_enrolled_students": len(facts["learners"]),
            "average_class_score": facts["cohort_average"],
            "debate_topics_assigned": [topic for topic, _ in topic_tally.most_common(20)],
            "active_classes": len(topic_tally),
        },
    }


# ---------------------------------------------------------------------------
# Administrator
# ---------------------------------------------------------------------------
def _admin_payload(db: Session, user: models.User) -> Dict[str, Any]:
    engine_status = agent_bridge.status()

    role_rows = db.query(models.User.role, func.count(models.User.id)).group_by(models.User.role).all()
    users_total = sum(int(total) for _, total in role_rows)
    sessions = db.query(models.DebateSession).all()
    scores = db.query(models.PerformanceScore).all()
    turns_total = db.query(func.count(models.SimulationTurn.id)).scalar() or 0
    analyses_total = db.query(func.count(models.ArgumentAnalysis.id)).scalar() or 0
    metrics_total = db.query(func.count(models.PresentationMetric.id)).scalar() or 0
    fallacies_total = db.query(func.count(models.FallacyLog.id)).scalar() or 0

    agents = engine_status.get("agents") or []
    uptime_seconds = max(0.0, time.time() - _PROCESS_START)
    uptime_hours = round(uptime_seconds / 3600.0, 2)

    kpis = [
        _kpi("platform_users_total", "Platform Users", users_total, _count(users_total), hint=f"{len(role_rows)} role(s) in use"),
        _kpi(
            "active_ai_agents",
            "Active AI Agents",
            len(agents),
            f"{len(agents)} loaded" if agents else "Deterministic mode",
            hint=", ".join(agents) if agents else str(engine_status.get("unavailable_reason") or "LLM agent layer not loaded"),
            tone="good" if agents else "warn",
        ),
        _kpi(
            "llm_health",
            "LLM Provider Health",
            None,
            "Configured" if (engine_status.get("groq_key_present") or engine_status.get("gemini_key_present")) else "Local only",
            hint=f"Groq key: {'present' if engine_status.get('groq_key_present') else 'absent'} · Gemini key: {'present' if engine_status.get('gemini_key_present') else 'absent'}",
            tone="good" if (engine_status.get("groq_key_present") or engine_status.get("gemini_key_present")) else "warn",
        ),
        _kpi("api_uptime", "API Process Uptime", uptime_hours, f"{uptime_hours} h", unit="h", hint="Measured from this API process start"),
    ]

    series = [
        _series("users_by_role", "Users By Role", [{"label": str(role), "value": float(total)} for role, total in role_rows], kind="bar"),
        _series("activity", f"Sessions Created (last {TREND_DAYS} days)", _daily_counts([s.created_at for s in sessions]), kind="bar"),
        _series(
            "workload",
            "Engine Workload Totals",
            [
                {"label": "Sessions", "value": float(len(sessions))},
                {"label": "Simulation Turns", "value": float(turns_total)},
                {"label": "Argument Analyses", "value": float(analyses_total)},
                {"label": "Speech Analyses", "value": float(metrics_total)},
                {"label": "Fallacies Logged", "value": float(fallacies_total)},
            ],
            kind="bar",
        ),
        _series("score_distribution", "Platform Score Distribution", _band_distribution([s.overall_weighted_score for s in scores]), kind="bar"),
    ]

    role_sessions: Counter = Counter()
    for session in sessions:
        owner = db.query(models.User.role).filter(models.User.id == session.user_id).scalar()
        role_sessions[str(owner or "Unknown")] += 1

    tables = [
        _table(
            "role_directory",
            "Role Directory",
            ["Role", "Users", "Sessions Created"],
            [[str(role), int(total), role_sessions.get(str(role), 0)] for role, total in role_rows],
            "No users have registered yet.",
        ),
        _table(
            "system_status",
            "System Status",
            ["Component", "Status", "Detail"],
            [
                ["Active engine", str(engine_status.get("active_engine")), "LLM agents when loaded, deterministic engine otherwise"],
                ["LLM agent layer", "Loaded" if engine_status.get("llm_agents_loaded") else "Not loaded", str(engine_status.get("unavailable_reason") or ", ".join(agents))],
                ["Groq API key", "Present" if engine_status.get("groq_key_present") else "Absent", f"Source: {engine_status.get('key_sources', {}).get('GROQ_API_KEY', 'unknown')}"],
                ["Gemini API key", "Present" if engine_status.get("gemini_key_present") else "Absent", f"Source: {engine_status.get('key_sources', {}).get('GEMINI_API_KEY', 'unknown')}"],
                ["Fallback engine", "Ready", str(engine_status.get("fallback_engine"))],
                ["ai-ml package", "Found" if engine_status.get("ai_ml_path_exists") else "Missing", str(engine_status.get("ai_ml_path"))],
            ],
            "Engine status unavailable.",
        ),
    ]

    insights: List[str] = []
    if agents:
        insights.append(f"{len(agents)} LLM agent(s) are live: {', '.join(agents)}.")
    else:
        insights.append(f"Running on the deterministic engine - {engine_status.get('unavailable_reason') or 'LLM agents not loaded'}.")
    insights.append(f"{users_total} user(s) have generated {len(sessions)} session(s) and {int(turns_total)} simulation turn(s).")
    if not (engine_status.get("groq_key_present") or engine_status.get("gemini_key_present")):
        insights.append("No LLM provider key is configured. Add GROQ_API_KEY or GEMINI_API_KEY to enable the agent layer.")

    return {
        "scope": "platform",
        "kpis": kpis,
        "series": series,
        "tables": tables,
        "insights": insights,
        "detail": {
            "platform_users_total": users_total,
            "sessions_total": len(sessions),
            "simulation_turns_total": int(turns_total),
            "argument_analyses_total": int(analyses_total),
            "speech_analyses_total": int(metrics_total),
            "fallacies_logged_total": int(fallacies_total),
            "active_ai_agents": len(agents),
            "agents": agents,
            "llm_api_health": "configured" if (engine_status.get("groq_key_present") or engine_status.get("gemini_key_present")) else "local-only",
            "uptime_hours": uptime_hours,
        },
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
_BUILDERS = {
    "Learner": _learner_payload,
    "Debate Coach": _coach_payload,
    "Educator": _educator_payload,
    "Administrator": _admin_payload,
}

REFRESH_SECONDS = 20


def build_overview(db: Session, user: models.User, as_role: Optional[str] = None) -> Dict[str, Any]:
    """
    Build the analytics envelope for `user`.

    `as_role` lets an Administrator inspect another role's view without changing
    their own account role. Unknown roles fall back to the Learner view rather
    than erroring, so a future role never breaks the dashboard.
    """
    started = time.perf_counter()
    role = as_role if as_role in _BUILDERS else (user.role if user.role in _BUILDERS else "Learner")
    payload = _BUILDERS[role](db, user)
    latency_ms = round((time.perf_counter() - started) * 1000, 1)

    return {
        "role": role,
        "viewer_role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
        "generated_at": datetime.utcnow(),
        "refresh_seconds": REFRESH_SECONDS,
        "query_latency_ms": latency_ms,
        "active_engine": agent_bridge.status().get("active_engine", "deterministic"),
        "scope": payload["scope"],
        "kpis": payload["kpis"],
        "series": payload["series"],
        "tables": payload["tables"],
        "insights": payload["insights"],
        "detail": payload["detail"],
    }


def learner_overview_for(db: Session, learner: models.User) -> Dict[str, Any]:
    """Learner analytics for a specific learner, used by staff drill-down."""
    return build_overview(db, learner, as_role="Learner")


def build_roster(db: Session, current_user: Optional[models.User] = None) -> Dict[str, Any]:
    """Flat learner roster with live aggregates, scoped by caller's role."""
    scoped_learners = None
    if current_user is not None:
        if current_user.role == "Debate Coach":
            scoped_learners = _coach_assigned_learners(db, current_user)
        elif current_user.role == "Educator":
            scoped_learners = _educator_cohort_learners(db, current_user)
        # Administrator and others: None → falls back to all learners
    facts = _cohort_facts(db, learners=scoped_learners)
    return {
        "generated_at": datetime.utcnow(),
        "total": len(facts["learners"]),
        "learners": [
            {
                "user_id": row["user"].id,
                "full_name": row["user"].full_name,
                "email": row["user"].email,
                "role": row["user"].role,
                "experience_level": row["user"].experience_level,
                "sessions_total": row["sessions"],
                "sessions_completed": row["completed"],
                "average_score": row["average"],
                "grade": row["grade"],
                "top_logic_gap": row["top_gap"],
            }
            for row in facts["ranked"]
        ],
    }


if __name__ == "__main__":  # pragma: no cover - manual smoke test
    print("analytics_service exposes:", sorted(_BUILDERS))
    print("Envelope keys: role, user_id, kpis, series, tables, insights, detail")
    print("Refresh interval (s):", REFRESH_SECONDS)
