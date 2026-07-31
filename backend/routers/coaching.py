from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/v1/coaching", tags=["Recommendation & Coaching Engine"])

@router.get("/plan/{user_id}", response_model=schemas.CoachingPlanResponse)
def get_coaching_plan(user_id: int, db: Session = Depends(get_db)):
    return {
        "user_id": user_id,
        "skill_gap_summary": "Strong core argument construction; needs targeted reduction in Ad Hominem reflexes and filler words during high-pressure cross-examination.",
        "targeted_recommendations": [
            "Practice Socratic cross-examination drill with 'The Academic' persona.",
            "Complete 3 sessions of vocal pacing exercises aiming for 140 WPM.",
            "Review Ad Hominem replacement strategies."
        ],
        "learning_path_steps": [
            "Module 1: Claims & Premise Structuring (Completed)",
            "Module 2: Real-time Fallacy Shielding (Active)",
            "Module 3: Parliamentary Flow & Cross-fire Mastery (Upcoming)"
        ],
        "progress_status": "Level 4 - Advanced Rhetorician"
    }
