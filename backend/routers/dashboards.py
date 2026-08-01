from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db

router = APIRouter(prefix="/api/v1/dashboards", tags=["Dashboard & Analytics"])

@router.get("/learner/{user_id}")
def get_learner_dashboard(user_id: int, db: Session = Depends(get_db)):
    return {
        "role": "Learner",
        "user_id": user_id,
        "total_debates_completed": 14,
        "average_overall_score": 88.5,
        "recent_performance_trend": [82, 85, 87, 89, 91],
        "top_fallacy_avoided": "Straw Man",
        "recommended_exercises": [
            "Speed Debate: Technology Ethics",
            "Fallacy Shielding Level 3",
            "Vocal Pacing Baseline Test"
        ]
    }

@router.get("/coach/{user_id}")
def get_coach_dashboard(user_id: int, db: Session = Depends(get_db)):
    return {
        "role": "Debate Coach",
        "assigned_students_count": 28,
        "top_performers": ["Alex Mercer", "Sofia Chen", "David Kim"],
        "class_skill_gaps": ["Straw Man detection", "Rebuttal evidence strength"],
        "pending_evaluations": 4
    }

@router.get("/educator/{user_id}")
def get_educator_dashboard(user_id: int, db: Session = Depends(get_db)):
    return {
        "role": "Educator",
        "active_classes": 3,
        "total_enrolled_students": 72,
        "average_class_score": 84.2,
        "debate_topics_assigned": ["AI Governance", "Climate Policy", "Universal Basic Income"]
    }

@router.get("/admin")
def get_admin_dashboard():
    return {
        "role": "Administrator",
        "platform_users_total": 1420,
        "active_ai_agents": 8,
        "llm_api_health": "100% Operational",
        "system_latency_ms": 142,
        "uptime_percentage": 99.98
    }
