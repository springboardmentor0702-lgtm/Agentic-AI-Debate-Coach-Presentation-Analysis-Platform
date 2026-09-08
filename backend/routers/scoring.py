from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from services.ai_engine import ai_engine_service
import models
import schemas


router = APIRouter(prefix="/api/v1/scoring", tags=["Performance Scoring Engine"])


@router.post("/calculate", response_model=schemas.WeightedScoreResponse)
def calculate_score(
    session_id: int,
    arg_quality: float = 85.0,
    evidence: float = 80.0,
    logic: float = 90.0,
    rebuttal: float = 88.0,
    comms: float = 82.0,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate_session = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.id == session_id, models.DebateSession.user_id == current_user.id)
        .first()
    )
    if not debate_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found for this user.")

    try:
        overall = ai_engine_service.calculate_weighted_score(arg_quality, evidence, logic, rebuttal, comms)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    score_rec = models.PerformanceScore(
        session_id=session_id,
        user_id=current_user.id,
        argument_quality=arg_quality,
        evidence_use=evidence,
        logical_consistency=logic,
        rebuttal_effectiveness=rebuttal,
        communication_skills=comms,
        overall_weighted_score=overall,
    )
    db.add(score_rec)
    db.commit()
    return {
        "session_id": session_id,
        "argument_quality": arg_quality,
        "evidence_use": evidence,
        "logical_consistency": logic,
        "rebuttal_effectiveness": rebuttal,
        "communication_skills": comms,
        "overall_weighted_score": overall,
    }
