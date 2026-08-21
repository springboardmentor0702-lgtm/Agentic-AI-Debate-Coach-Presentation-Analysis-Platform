from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routers.auth import get_current_user, require_role

router = APIRouter(prefix="/api/v1/dashboards", tags=["Dashboard & Analytics"])


def _require_self(user_id: int, current_user: models.User) -> None:
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own dashboard.")


@router.get("/learner/{user_id}", response_model=schemas.LearnerDashboardResponse)
def get_learner_dashboard(
    user_id: int,
    current_user: models.User = Depends(require_role(["Learner"])),
    db: Session = Depends(get_db),
):
    _require_self(user_id, current_user)
    completed = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.user_id == user_id, models.DebateSession.status == "Completed")
        .count()
    )
    score_rows = (
        db.query(models.PerformanceScore)
        .filter(models.PerformanceScore.user_id == user_id)
        .order_by(models.PerformanceScore.created_at.asc())
        .all()
    )
    latest_scores = score_rows[-10:]
    average_score = sum(item.overall_weighted_score for item in score_rows) / len(score_rows) if score_rows else 0.0
    metrics = db.query(models.PresentationMetric).filter(models.PresentationMetric.user_id == user_id).all()
    average_wpm = sum(item.speech_pace_wpm for item in metrics) / len(metrics) if metrics else None
    average_fillers = sum(item.filler_words_count for item in metrics) / len(metrics) if metrics else None
    fallacy_counts = (
        db.query(models.FallacyLog.fallacy_type, func.count(models.FallacyLog.id))
        .filter(models.FallacyLog.user_id == user_id)
        .group_by(models.FallacyLog.fallacy_type)
        .order_by(func.count(models.FallacyLog.id).desc())
        .all()
    )
    unread = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == user_id, models.Notification.is_read.is_(False))
        .count()
    )
    recommendations = []
    if average_wpm is None:
        recommendations.append("Complete a presentation analysis to establish your speaking baseline.")
    elif average_wpm > 160:
        recommendations.append("Practice deliberate pauses and target a speaking pace below 160 WPM.")
    elif average_wpm < 110:
        recommendations.append("Build a more dynamic delivery by gradually increasing your speaking pace.")
    else:
        recommendations.append("Maintain your current speaking pace and vary emphasis between claims.")
    if average_fillers is not None and average_fillers >= 3:
        recommendations.append("Replace filler words with silent pauses during rebuttal preparation.")
    if fallacy_counts:
        recommendations.append(f"Review {fallacy_counts[0][0]} examples and rewrite the affected claims.")
    if not recommendations:
        recommendations.append("Start your first debate simulation to receive personalized coaching.")

    return {
        "role": "Learner",
        "user_id": user_id,
        "total_debates_completed": completed,
        "average_overall_score": round(average_score, 2),
        "recent_performance_trend": [round(item.overall_weighted_score, 2) for item in latest_scores],
        "top_fallacy_avoided": fallacy_counts[0][0] if fallacy_counts else None,
        "recommended_exercises": recommendations[:5],
        "total_presentations": len(metrics),
        "average_speech_pace_wpm": round(average_wpm, 2) if average_wpm is not None else None,
        "average_filler_words": round(average_fillers, 2) if average_fillers is not None else None,
        "unread_notifications": unread,
    }


@router.get("/coach/{user_id}", response_model=schemas.CoachDashboardResponse)
def get_coach_dashboard(
    user_id: int,
    current_user: models.User = Depends(require_role(["Debate Coach", "Educator", "Administrator"])),
    db: Session = Depends(get_db),
):
    _require_self(user_id, current_user)
    learners = db.query(models.User).filter(models.User.role == "Learner").all()
    learner_scores = []
    for learner in learners:
        avg = (
            db.query(func.avg(models.PerformanceScore.overall_weighted_score))
            .filter(models.PerformanceScore.user_id == learner.id)
            .scalar()
        )
        if avg is not None:
            learner_scores.append({"user_id": learner.id, "full_name": learner.full_name, "average_score": round(float(avg), 2)})
    learner_scores.sort(key=lambda item: item["average_score"], reverse=True)
    gap_rows = (
        db.query(models.FallacyLog.fallacy_type, func.count(models.FallacyLog.id))
        .filter(models.FallacyLog.user_id.in_([learner.id for learner in learners]) if learners else False)
        .group_by(models.FallacyLog.fallacy_type)
        .order_by(func.count(models.FallacyLog.id).desc())
        .limit(5)
        .all()
    )
    completed_sessions = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.status == "Completed")
        .all()
    )
    pending = sum(1 for session in completed_sessions if not session.feedback)
    feedback = (
        db.query(models.CoachFeedback)
        .filter(models.CoachFeedback.coach_id == current_user.id)
        .order_by(models.CoachFeedback.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "role": "Debate Coach",
        "assigned_students_count": len(learners),
        "top_performers": learner_scores[:5],
        "class_skill_gaps": [row[0] for row in gap_rows],
        "pending_evaluations": pending,
        "recent_feedback": feedback,
    }


@router.get("/educator/{user_id}", response_model=schemas.EducatorDashboardResponse)
def get_educator_dashboard(
    user_id: int,
    current_user: models.User = Depends(require_role(["Educator", "Administrator"])),
    db: Session = Depends(get_db),
):
    _require_self(user_id, current_user)
    levels = db.query(models.User.experience_level, func.count(models.User.id)).group_by(models.User.experience_level).all()
    topics = (
        db.query(models.DebateSession.topic, func.count(models.DebateSession.id))
        .group_by(models.DebateSession.topic)
        .order_by(func.count(models.DebateSession.id).desc())
        .limit(10)
        .all()
    )
    avg_score = db.query(func.avg(models.PerformanceScore.overall_weighted_score)).scalar()
    return {
        "role": "Educator",
        "active_classes": 1 if db.query(models.User).count() else 0,
        "total_enrolled_students": db.query(models.User).filter(models.User.role == "Learner").count(),
        "average_class_score": round(float(avg_score or 0), 2),
        "debate_topics_assigned": [topic for topic, _ in topics],
        "learner_count_by_level": {level or "Unknown": count for level, count in levels},
    }


@router.get("/admin", response_model=schemas.AdminDashboardResponse)
def get_admin_dashboard(
    current_user: models.User = Depends(require_role(["Administrator"])),
    db: Session = Depends(get_db),
):
    return {
        "role": "Administrator",
        "platform_users_total": db.query(models.User).count(),
        "active_ai_agents": 1,
        "llm_api_health": "Configured" if __import__("config").settings.AI_PROVIDER != "heuristic" else "Heuristic fallback active",
        "system_latency_ms": None,
        "uptime_percentage": None,
        "sessions_total": db.query(models.DebateSession).count(),
        "completed_sessions_total": db.query(models.DebateSession).filter(models.DebateSession.status == "Completed").count(),
    }
