import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, LearningPath, DebateScore, PresentationAnalysis
from ..schemas import LearningPathResponse, RecommendationResponse
from .auth import get_current_user

router = APIRouter(prefix="/coaching", tags=["Recommendation & Coaching Engine"])

DEFAULT_MILESTONES = [
    {
        "id": 1,
        "title": "Module 1: Foundations of Propositional Logic",
        "description": "Master premise-warrant-impact structures and eliminate non-sequiturs.",
        "duration": "1 week",
        "completed": True,
        "drills": ["Toulmin Argument Construction", "Premise Isolation Workout"]
    },
    {
        "id": 2,
        "title": "Module 2: Advanced Fallacy Neutralization",
        "description": "Identify and counter Straw Man, False Dilemma, and Slippery Slope maneuvers in real time.",
        "duration": "1 week",
        "completed": False,
        "drills": ["Rapid-Fire Fallacy Detection Lab", "Cross-Examination Defense Drill"]
    },
    {
        "id": 3,
        "title": "Module 3: Evidence Grounding & Empirical Rebuttals",
        "description": "Strengthen warrants with verified statistics, meta-analyses, and policy impact metrics.",
        "duration": "2 weeks",
        "completed": False,
        "drills": ["Evidence Clash Simulation", "Statistical Bias Exposure Drill"]
    },
    {
        "id": 4,
        "title": "Module 4: Rhetorical Delivery & Vocal Command",
        "description": "Optimize pacing to 140-155 WPM, eradicate vocal fillers, and master strategic pause deployment.",
        "duration": "1 week",
        "completed": False,
        "drills": ["60-Second Zero-Filler Challenge", "Cadence & Pacing Workout"]
    },
    {
        "id": 5,
        "title": "Module 5: Championship Debate Simulation Mastery",
        "description": "Complete full-length Oxford & Parliamentary rounds against elite AI opponent personas.",
        "duration": "2 weeks",
        "completed": False,
        "drills": ["AI Opponent Grand Final Round", "Adjudicator Ballot Defense"]
    }
]

@router.get("/learning-path", response_model=LearningPathResponse)
def get_or_create_learning_path(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    path = db.query(LearningPath).filter(LearningPath.user_id == current_user.id).first()
    if not path:
        path = LearningPath(
            user_id=current_user.id,
            title="Comprehensive Debate & Presentation Mastery Pathway",
            description="A personalized agentic curriculum targeting argumentation quality, fallacy resistance, and confident speech delivery.",
            progress_percentage=25.0,
            status="in_progress",
            current_level="Intermediate Debater",
            target_level="Championship Orator",
            milestones_json=json.dumps(DEFAULT_MILESTONES)
        )
        db.add(path)
        db.commit()
        db.refresh(path)

    return {
        "id": path.id,
        "user_id": path.user_id,
        "title": path.title,
        "description": path.description,
        "progress_percentage": path.progress_percentage,
        "status": path.status,
        "current_level": path.current_level,
        "target_level": path.target_level,
        "milestones": json.loads(path.milestones_json) if path.milestones_json else DEFAULT_MILESTONES,
        "created_at": path.created_at
    }

@router.put("/learning-path/milestone/{milestone_id}/toggle")
def toggle_milestone(
    milestone_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    path = db.query(LearningPath).filter(LearningPath.user_id == current_user.id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")

    milestones = json.loads(path.milestones_json) if path.milestones_json else DEFAULT_MILESTONES
    for m in milestones:
        if m["id"] == milestone_id:
            m["completed"] = not m.get("completed", False)
            break

    completed_count = sum(1 for m in milestones if m.get("completed", False))
    path.progress_percentage = round((completed_count / max(1, len(milestones))) * 100.0, 1)
    path.milestones_json = json.dumps(milestones)
    db.commit()

    return {"progress_percentage": path.progress_percentage, "milestones": milestones}

@router.get("/recommendations", response_model=RecommendationResponse)
def get_coaching_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Analyze user's past scores and presentation runs
    past_scores = db.query(DebateScore).filter(DebateScore.user_id == current_user.id).all()
    past_speeches = db.query(PresentationAnalysis).filter(PresentationAnalysis.user_id == current_user.id).all()

    skill_gaps = []
    tips = []

    avg_evidence = sum(s.evidence_usage for s in past_scores) / max(1, len(past_scores)) if past_scores else 68.0
    avg_rebuttal = sum(s.rebuttal_effectiveness for s in past_scores) / max(1, len(past_scores)) if past_scores else 72.0
    avg_fillers = sum(p.filler_words_count for p in past_speeches) / max(1, len(past_speeches)) if past_speeches else 4.0

    if avg_evidence < 78.0:
        skill_gaps.append("Empirical Evidence Grounding (Under-indexed on verifiable citations)")
        tips.append("Before every debate turn, ensure you state at least one verified study, empirical metric, or historical case study.")

    if avg_rebuttal < 78.0:
        skill_gaps.append("Direct Clash & Rebuttal Depth (Tendency to bypass opponent's core premise)")
        tips.append("Adopt the 4-step refutation method: 'They say... But we say... Because... Therefore...'")

    if avg_fillers > 3.0:
        skill_gaps.append("Vocal Filler Discipline (High frequency of vocal bridges: 'um', 'like', 'basically')")
        tips.append("Practice the 'Breathe Rather Than Bridge' rule: replace filler vocalizations with silent 1-second pauses.")

    if not skill_gaps:
        skill_gaps = ["Advanced Synthesis & Adjudicator Ballot Framing"]
        tips.append("Focus on crystallization speech techniques and defining explicit voting criteria in final speeches.")

    exercises = [
        {
            "name": "The Socratic Cross-Examination Gauntlet",
            "type": "Debate Simulation",
            "opponent": "Prof. Sophia Lin",
            "duration": "10 minutes",
            "benefit": "Sharpen your defense against presupposition attacks."
        },
        {
            "name": "60-Second Zero Filler Sprint",
            "type": "Presentation Drill",
            "target": "<1 filler word / min",
            "duration": "5 minutes",
            "benefit": "Dramatically improves perceived confidence and executive presence."
        },
        {
            "name": "5-Point Fallacy Rebuttal Lab",
            "type": "Argument Workout",
            "target": "Counter Straw Man & False Dilemma",
            "duration": "8 minutes",
            "benefit": "Enables instant counter-punching when opponents commit fallacies."
        }
    ]

    return {
        "user_id": current_user.id,
        "skill_gaps": skill_gaps,
        "recommended_exercises": exercises,
        "personalized_coaching_tips": tips
    }
