from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import get_current_user
from services.permissions import can_view_student
import models

router = APIRouter(prefix="/api/v1/dashboards", tags=["Dashboard & Analytics"])


def _owned(user_id: int, current_user: models.User):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only access your own dashboard.")


def _avg(values):
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values), 1) if values else 0.0


def _quick_feedback(recent_scores):
    """A short 2-3 line plain-language summary for the Overview tab: names
    the strongest metric, the weakest metric, and one concrete next step."""
    if not recent_scores:
        return "Complete your first debate session to unlock personalised feedback here."
    metric_labels = [
        ("argument_quality", "argument quality"),
        ("evidence_use", "evidence use"),
        ("logical_consistency", "logical consistency"),
        ("rebuttal_effectiveness", "rebuttal effectiveness"),
        ("communication_skills", "communication skills"),
    ]
    averages = {label: _avg([getattr(s, attr) for s in recent_scores]) for attr, label in metric_labels}
    best_label = max(averages, key=averages.get)
    worst_label = min(averages, key=averages.get)
    if averages[best_label] == averages[worst_label]:
        return f"Your scores are consistent across the board (~{averages[best_label]}%). Push for one standout strength next session."
    return (
        f"Your strongest area is {best_label} ({averages[best_label]}%). "
        f"Focus your next session on {worst_label}, currently your weakest at {averages[worst_label]}%."
    )


@router.get("/learner/me")
def get_learner_dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _build_learner_dashboard(current_user, db)


def _build_learner_dashboard(target_user: models.User, db: Session):
    sessions = db.query(models.DebateSession).filter(models.DebateSession.user_id == target_user.id).all()
    completed = [s for s in sessions if s.status == "Completed"]
    scores = db.query(models.PerformanceScore).filter(models.PerformanceScore.user_id == target_user.id).order_by(models.PerformanceScore.created_at.asc()).all()
    trend = [round(s.overall_weighted_score, 1) for s in scores[-10:]]
    avg = round(sum(trend) / len(trend), 1) if trend else 0.0
    fallacies = db.query(models.FallacyLog).filter(models.FallacyLog.user_id == target_user.id).all()
    counts = {}
    for f in fallacies:
        counts[f.fallacy_type] = counts.get(f.fallacy_type, 0) + 1
    top_fallacy = max(counts, key=counts.get) if counts else "None yet"
    # Per-metric averages, computed separately from the single overall score so that
    # "Logical Consistency" and "Argument Quality" no longer show an identical number
    # on the dashboard - each is now its own real average pulled from PerformanceScore.
    recent_scores = scores[-10:]
    return {
        "role": target_user.role,
        "user_id": target_user.id,
        "name": target_user.full_name,
        "total_debates_completed": len(completed),
        "total_sessions": len(sessions),
        "average_overall_score": avg,
        "average_argument_quality": _avg([s.argument_quality for s in recent_scores]),
        "average_evidence_use": _avg([s.evidence_use for s in recent_scores]),
        "average_logical_consistency": _avg([s.logical_consistency for s in recent_scores]),
        "average_rebuttal_effectiveness": _avg([s.rebuttal_effectiveness for s in recent_scores]),
        "average_communication_skills": _avg([s.communication_skills for s in recent_scores]),
        "recent_performance_trend": trend,
        "top_fallacy": top_fallacy,
        "quick_feedback": _quick_feedback(recent_scores),
        "recommended_exercises": [
            "Run a 60-second voice argument and reduce filler words.",
            "Practice a rebuttal using evidence from a primary source.",
            "Try The Academic opponent for a Socratic cross-examination."
        ]
    }


def _feedback_bullets(score: "models.PerformanceScore"):
    """Turn one session's 5 sub-metrics into two plain-language lists:
    what went well, and what to improve - so a session's feedback clearly
    separates strengths from focus areas instead of one mixed list."""
    metric_labels = [
        ("argument_quality", "argument quality"),
        ("evidence_use", "evidence use"),
        ("logical_consistency", "logical consistency"),
        ("rebuttal_effectiveness", "rebuttal effectiveness"),
        ("communication_skills", "communication skills"),
    ]
    strengths, improvements = [], []
    for attr, label in metric_labels:
        value = getattr(score, attr) or 0
        if value >= 85:
            strengths.append(f"Strong {label} ({round(value)}%). Keep this up.")
        elif value >= 70:
            strengths.append(f"Solid {label} ({round(value)}%), with room to sharpen further.")
        else:
            improvements.append(f"{label.capitalize()} needs work ({round(value)}%) — prioritise this next session.")
    if not improvements:
        improvements.append("No weak areas this session — try a harder debate format to keep growing.")
    return strengths, improvements


@router.get("/learner/feedback")
def get_learner_feedback(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Per-session AI feedback report: the full 5-metric breakdown plus
    generated feedback bullets for each of the user's completed sessions,
    most recent first. Powers the dashboard's FEEDBACK tab.
    NOTE: registered before /learner/{user_id} so "feedback" is never
    mistaken for a numeric user_id path parameter."""
    return _build_learner_feedback(current_user, db)


def _build_learner_feedback(target_user: models.User, db: Session):
    scores = (
        db.query(models.PerformanceScore)
        .filter(models.PerformanceScore.user_id == target_user.id)
        .order_by(models.PerformanceScore.created_at.desc())
        .limit(10)
        .all()
    )
    session_ids = [s.session_id for s in scores]
    sessions_by_id = {}
    if session_ids:
        for sess in db.query(models.DebateSession).filter(models.DebateSession.id.in_(session_ids)).all():
            sessions_by_id[sess.id] = sess

    report = []
    for s in scores:
        sess = sessions_by_id.get(s.session_id)
        strengths, improvements = _feedback_bullets(s)
        report.append({
            "session_id": s.session_id,
            "title": sess.title if sess else f"Session #{s.session_id}",
            "topic": sess.topic if sess else None,
            "date": s.created_at.isoformat() if s.created_at else None,
            "overall_weighted_score": round(s.overall_weighted_score, 1),
            "argument_quality": round(s.argument_quality or 0, 1),
            "evidence_use": round(s.evidence_use or 0, 1),
            "logical_consistency": round(s.logical_consistency or 0, 1),
            "rebuttal_effectiveness": round(s.rebuttal_effectiveness or 0, 1),
            "communication_skills": round(s.communication_skills or 0, 1),
            "strengths": strengths,
            "improvements": improvements,
        })
    return {"count": len(report), "sessions": report}


@router.get("/learner/{user_id}")
def get_learner_dashboard_by_id(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned(user_id, current_user)
    return get_learner_dashboard(current_user, db)


@router.get("/student/{user_id}")
def get_student_dashboard(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Full progress view of one specific student (trend, averages, top
    fallacy) for a Coach/Educator viewing their own assigned student, or an
    Administrator viewing anyone. Powers the "View Progress" button in the
    MY STUDENTS / ALL ACCOUNTS tables."""
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if not can_view_student(current_user, target):
        raise HTTPException(status_code=403, detail="You can only view the progress of your own assigned students.")
    return _build_learner_dashboard(target, db)


@router.get("/student/{user_id}/feedback")
def get_student_feedback(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Same per-session AI feedback report as /learner/feedback, but for a
    specific student, viewable by their mentor Coach/Educator or an Admin."""
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if not can_view_student(current_user, target):
        raise HTTPException(status_code=403, detail="You can only view the feedback of your own assigned students.")
    return _build_learner_feedback(target, db)


@router.get("/coach/me")
def get_coach_dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["Debate Coach", "Educator", "Administrator"]:
        raise HTTPException(status_code=403, detail="Coach dashboard requires a coach, educator, or administrator role.")
    # Administrators still see the whole platform; a Coach/Educator only ever
    # sees the learners assigned to them (mentor_id == their own id).
    student_query = db.query(models.User).filter(models.User.role == "Learner")
    if current_user.role != "Administrator":
        student_query = student_query.filter(models.User.mentor_id == current_user.id)
    student_ids = [s.id for s in student_query.all()]
    evaluations_query = db.query(models.ArgumentAnalysis)
    if current_user.role != "Administrator":
        evaluations_query = evaluations_query.filter(models.ArgumentAnalysis.session_id.in_(
            db.query(models.DebateSession.id).filter(models.DebateSession.user_id.in_(student_ids))
        )) if student_ids else evaluations_query.filter(False)
    evaluations = evaluations_query.count()
    return {"role": current_user.role, "assigned_students_count": len(student_ids), "evaluations_recorded": evaluations, "class_skill_gaps": ["Evidence strength", "Rebuttal effectiveness", "Filler-word control"]}


@router.get("/educator/me")
def get_educator_dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["Educator", "Administrator"]:
        raise HTTPException(status_code=403, detail="Educator dashboard requires an educator or administrator role.")
    student_query = db.query(models.User).filter(models.User.role == "Learner")
    if current_user.role != "Administrator":
        student_query = student_query.filter(models.User.mentor_id == current_user.id)
    students = student_query.all()
    student_ids = [s.id for s in students]
    if student_ids:
        avg = db.query(func.avg(models.PerformanceScore.overall_weighted_score)).filter(models.PerformanceScore.user_id.in_(student_ids)).scalar()
    else:
        avg = None
    learners = len(students)
    return {"role": current_user.role, "active_classes": 1 if learners else 0, "total_enrolled_students": learners, "average_class_score": round(float(avg or 0), 1), "debate_topics_assigned": ["AI Governance", "Climate Policy", "Universal Basic Income"]}


@router.get("/admin")
def get_admin_dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "Administrator":
        raise HTTPException(status_code=403, detail="Administrator access required.")
    return {"role": current_user.role, "platform_users_total": db.query(models.User).count(), "debate_sessions_total": db.query(models.DebateSession).count(), "analyses_total": db.query(models.ArgumentAnalysis).count(), "llm_api_health": "Local analysis engine operational"}
