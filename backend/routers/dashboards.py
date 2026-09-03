from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user, require_role
import models

router = APIRouter(prefix="/api/v1/dashboards", tags=["Dashboard & Analytics"])


def _owned(user_id: int, current_user: models.User) -> None:
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own dashboard.")


@router.get("/learner/{user_id}")
def get_learner_dashboard(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned(user_id, current_user)
    sessions = db.query(models.DebateSession).filter_by(user_id=user_id).all()
    scores = db.query(models.PerformanceScore).filter_by(user_id=user_id).order_by(models.PerformanceScore.created_at.asc()).all()
    fallacy = db.query(models.FallacyLog.fallacy_type, func.count(models.FallacyLog.id)).filter_by(user_id=user_id).group_by(models.FallacyLog.fallacy_type).order_by(func.count(models.FallacyLog.id).desc()).first()
    return {"role": current_user.role, "user_id": user_id, "total_debates_completed": sum(s.status == "Completed" for s in sessions), "average_overall_score": round(sum(s.overall_weighted_score for s in scores) / len(scores), 1) if scores else None, "recent_performance_trend": [s.overall_weighted_score for s in scores[-5:]], "top_fallacy_detected": fallacy[0] if fallacy else None, "recommended_exercises": []}


@router.get("/coach/{user_id}")
def get_coach_dashboard(user_id: int, current_user: models.User = Depends(require_role(["Debate Coach", "Administrator"])), db: Session = Depends(get_db)):
    _owned(user_id, current_user)
    students = db.query(models.User).filter(models.User.role == "Learner").all()
    return {"role": current_user.role, "assigned_students_count": len(students), "top_performers": [u.full_name for u in students[:5]], "class_skill_gaps": [], "pending_evaluations": db.query(models.DebateSession).filter(models.DebateSession.status != "Completed").count()}


@router.get("/educator/{user_id}")
def get_educator_dashboard(user_id: int, current_user: models.User = Depends(require_role(["Educator", "Administrator"])), db: Session = Depends(get_db)):
    _owned(user_id, current_user)
    scores = db.query(models.PerformanceScore).all()
    topics = [row[0] for row in db.query(models.DebateSession.topic).distinct().limit(20).all()]
    return {"role": current_user.role, "active_classes": 0, "total_enrolled_students": db.query(models.User).filter(models.User.role == "Learner").count(), "average_class_score": round(sum(s.overall_weighted_score for s in scores) / len(scores), 1) if scores else None, "debate_topics_assigned": topics}


@router.get("/admin")
def get_admin_dashboard(current_user: models.User = Depends(require_role(["Administrator"])), db: Session = Depends(get_db)):
    import os
    provider_configured = bool(os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_API_KEY"))
    return {"role": current_user.role, "platform_users_total": db.query(models.User).count(), "active_ai_agents": None, "llm_api_health": "configured" if provider_configured else "local-only", "system_latency_ms": None, "uptime_percentage": None}
