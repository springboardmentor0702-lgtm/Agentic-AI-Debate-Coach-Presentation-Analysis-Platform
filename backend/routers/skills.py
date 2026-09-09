from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import get_current_user
import models

router = APIRouter(prefix="/api/v1/skills", tags=["Skill Tracking & Learning Goals"])

def avg(vals):
    vals = [float(v) for v in vals if v is not None]
    return round(sum(vals)/len(vals), 1) if vals else 0.0

@router.get("/me")
def get_my_skills(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    analyses = db.query(models.ArgumentAnalysis).filter(models.ArgumentAnalysis.user_id == current_user.id).all()
    turns = db.query(models.SimulationTurn).filter(models.SimulationTurn.user_id == current_user.id).all()
    metrics = db.query(models.PresentationMetric).filter(models.PresentationMetric.user_id == current_user.id).all()
    return {
        "user_id": current_user.id,
        "experience_level": current_user.experience_level,
        "learning_goals": current_user.learning_goals,
        "skills": {
            "argument_construction": avg([a.persuasiveness_score for a in analyses]),
            "evidence_usage": avg([a.evidence_strength for a in analyses]),
            "logical_consistency": avg([a.logical_consistency for a in analyses]),
            "rebuttal_effectiveness": avg([t.rebuttal_strength_percent for t in turns]),
            "vocal_clarity": avg([m.clarity_score for m in metrics]),
            "confidence": avg([m.confidence_score for m in metrics]),
            "engagement": avg([m.engagement_score for m in metrics]),
        },
        "history_counts": {"debates": db.query(models.DebateSession).filter(models.DebateSession.user_id == current_user.id).count(), "analyses": len(analyses), "presentations": len(metrics)},
    }

@router.put("/goals")
def update_goals(learning_goals: str, coaching_preferences: str | None = None, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.learning_goals = learning_goals.strip()
    if coaching_preferences is not None:
        current_user.coaching_preferences = coaching_preferences.strip()
    db.commit()
    return {"status": "updated", "learning_goals": current_user.learning_goals, "coaching_preferences": current_user.coaching_preferences}
