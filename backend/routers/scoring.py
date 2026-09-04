from fastapi import APIRouter, Depends
from pydantic import BaseModel

from models import User
from security import current_user

router = APIRouter(
    prefix="/api/scoring",
    tags=["Performance Scoring"]
)


class ScoreRequest(BaseModel):
    argument_quality: float = 75.0
    evidence_usage: float = 75.0
    logical_consistency: float = 75.0
    rebuttal_effectiveness: float = 75.0
    communication_skills: float = 75.0


def clamp(value: float) -> float:
    return max(0.0, min(100.0, float(value)))


@router.post("")
def calculate_score(
    request: ScoreRequest,
    user: User = Depends(current_user)
):
    """
    Weighted Scoring Model as specified in Section 4, Module 9:
    Debate Performance Score =
      Argument Quality (30%)
    + Evidence Usage (20%)
    + Logical Consistency (20%)
    + Rebuttal Effectiveness (15%)
    + Communication Skills (15%)
    """
    arg = clamp(request.argument_quality)
    evi = clamp(request.evidence_usage)
    log = clamp(request.logical_consistency)
    reb = clamp(request.rebuttal_effectiveness)
    com = clamp(request.communication_skills)

    overall = (
        arg * 0.30
        + evi * 0.20
        + log * 0.20
        + reb * 0.15
        + com * 0.15
    )
    overall = round(overall, 2)

    if overall >= 85:
        level = "Master Debater (Excellent)"
        recommendation = "Exceptional argumentation structure. Focus on advanced rhetoric and high-level nuanced counterarguments."
    elif overall >= 70:
        level = "Proficient (Strong)"
        recommendation = "Strong overall presentation. Tighten evidence citations and anticipate opposing edge-case rebuttals."
    elif overall >= 55:
        level = "Competent (Developing)"
        recommendation = "Solid foundation. Practice structured rebuttal techniques and reduce logical gaps between premises."
    else:
        level = "Novice (Needs Improvement)"
        recommendation = "Prioritize clear thesis statements, avoid common logical fallacies, and support each claim with verifiable evidence."

    return {
        "overall_score": overall,
        "performance_level": level,
        "recommendation": recommendation,
        "breakdown": {
            "argument_quality": arg,
            "evidence_usage": evi,
            "logical_consistency": log,
            "rebuttal_effectiveness": reb,
            "communication_skills": com
        },
        "weights": {
            "argument_quality": 30,
            "evidence_usage": 20,
            "logical_consistency": 20,
            "rebuttal_effectiveness": 15,
            "communication_skills": 15
        },
        "formula": "30% Argument Quality + 20% Evidence Usage + 20% Logical Consistency + 15% Rebuttal Effectiveness + 15% Communication Skills"
    }
