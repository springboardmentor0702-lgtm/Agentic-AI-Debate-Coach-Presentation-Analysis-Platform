from fastapi import APIRouter
from fastapi import Depends

from pydantic import BaseModel

from models import User
from security import current_user


router = APIRouter(
    prefix="/api/scoring",
    tags=["Performance Scoring"]
)


class ScoreRequest(BaseModel):

    argument_quality: float
    reasoning_quality: float
    evidence_strength: float
    clarity_relevance: float
    persuasiveness: float


def clamp(value: float) -> float:

    return max(
        0,
        min(100, value)
    )


@router.post("")
def calculate_score(
    request: ScoreRequest,

    user: User = Depends(current_user)
):

    argument = clamp(
        request.argument_quality
    )

    reasoning = clamp(
        request.reasoning_quality
    )

    evidence = clamp(
        request.evidence_strength
    )

    clarity = clamp(
        request.clarity_relevance
    )

    persuasion = clamp(
        request.persuasiveness
    )

    overall = (
        argument * 0.30
        +
        reasoning * 0.20
        +
        evidence * 0.20
        +
        clarity * 0.15
        +
        persuasion * 0.15
    )

    overall = round(
        overall,
        2
    )

    if overall >= 85:

        level = "Excellent"

    elif overall >= 70:

        level = "Strong"

    elif overall >= 55:

        level = "Developing"

    else:

        level = "Needs Improvement"

    return {

        "overall_score":
            overall,

        "performance_level":
            level,

        "breakdown": {

            "argument_quality": argument,

            "reasoning_quality": reasoning,

            "evidence_strength": evidence,

            "clarity_relevance": clarity,

            "persuasiveness": persuasion
        },

        "weights": {

            "argument_quality": 30,

            "reasoning_quality": 20,

            "evidence_strength": 20,

            "clarity_relevance": 15,

            "persuasiveness": 15
        }
    }
