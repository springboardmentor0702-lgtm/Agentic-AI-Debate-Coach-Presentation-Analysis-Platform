from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import get_current_user, require_role
import models

router = APIRouter(prefix="/api/v1/dashboards", tags=["Dashboard & Analytics"])


def _avg(values):
    nums = [float(v) for v in values if v is not None]
    return round(sum(nums) / len(nums), 1) if nums else 0.0


@router.get("/learner/me")
def learner_dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(models.DebateSession).filter(models.DebateSession.user_id == current_user.id).all()
    completed = [s for s in sessions if s.status == "Completed"]
    scores = db.query(models.PerformanceScore).filter(models.PerformanceScore.user_id == current_user.id).all()
    recent = sorted(scores, key=lambda x: x.created_at or 0)[-10:]
    return {
        "role": current_user.role,
        "user_id": current_user.id,
        "total_debates_completed": len(completed),
        "average_overall_score": _avg([s.overall_weighted_score for s in scores]),
        "recent_performance_trend": [round(float(s.overall_weighted_score), 1) for s in recent],
        "recommended_exercises": [
            "Speed Debate: Technology Ethics",
            "Fallacy Shielding Level 3",
            "Vocal Pacing Baseline Test",
        ],
    }


@router.get("/coach/me")
def coach_dashboard(current_user: models.User = Depends(require_role(["Debate Coach", "Administrator"])), db: Session = Depends(get_db)):
    students = db.query(models.User).filter(models.User.role == "Learner").all()
    pending = db.query(models.DebateSession).filter(models.DebateSession.status == "Active").count()
    return {
        "role": current_user.role,
        "assigned_students_count": len(students),
        "student_names": [u.full_name for u in students[:20]],
        "class_skill_gaps": ["Fallacy detection", "Evidence strength", "Rebuttal effectiveness"],
        "pending_evaluations": pending,
    }


@router.get("/educator/me")
def educator_dashboard(current_user: models.User = Depends(require_role(["Educator", "Administrator"])), db: Session = Depends(get_db)):
    students = db.query(models.User).filter(models.User.role == "Learner").count()
    scores = db.query(models.PerformanceScore).all()
    return {
        "role": current_user.role,
        "active_classes": 1 if students else 0,
        "total_enrolled_students": students,
        "average_class_score": _avg([s.overall_weighted_score for s in scores]),
        "debate_topics_assigned": ["AI Governance", "Climate Policy", "Universal Basic Income"],
    }


@router.get("/admin/me")
def admin_dashboard(current_user: models.User = Depends(require_role(["Administrator"])), db: Session = Depends(get_db)):
    users = db.query(models.User).count()
    sessions = db.query(models.DebateSession).count()
    return {
        "role": current_user.role,
        "platform_users_total": users,
        "total_sessions": sessions,
        "active_ai_agents": 4,
        "llm_api_health": "Local deterministic engine operational",
        "system_latency_ms": 0,
        "uptime_percentage": 100.0,
    }

# Backward-compatible endpoints
@router.get("/learner/{user_id}")
def learner_dashboard_legacy(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only access your own dashboard.")
    return learner_dashboard(current_user, db)

@router.get("/coach/{user_id}")
def coach_dashboard_legacy(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != current_user.id and current_user.role != "Administrator":
        raise HTTPException(status_code=403, detail="Access denied.")
    return coach_dashboard(current_user, db)

@router.get("/educator/{user_id}")
def educator_dashboard_legacy(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != current_user.id and current_user.role != "Administrator":
        raise HTTPException(status_code=403, detail="Access denied.")
    return educator_dashboard(current_user, db)

@router.get("/admin")
def admin_dashboard_legacy(current_user: models.User = Depends(require_role(["Administrator"])), db: Session = Depends(get_db)):
    return admin_dashboard(current_user, db)
