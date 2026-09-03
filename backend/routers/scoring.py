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
    payload: schemas.WeightedScoreSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate_session = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.id == payload.session_id, models.DebateSession.user_id == current_user.id)
        .first()
    )
    if not debate_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found for this user.")

    try:
        overall = ai_engine_service.calculate_weighted_score(payload.argument_quality, payload.evidence_use, payload.logical_consistency, payload.rebuttal_effectiveness, payload.communication_skills)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    score_rec = models.PerformanceScore(
        session_id=payload.session_id,
        user_id=current_user.id,
        argument_quality=payload.argument_quality,
        evidence_use=payload.evidence_use,
        logical_consistency=payload.logical_consistency,
        rebuttal_effectiveness=payload.rebuttal_effectiveness,
        communication_skills=payload.communication_skills,
        overall_weighted_score=overall,
    )
    db.add(score_rec)
    db.commit()
    return {
        "session_id": payload.session_id,
        "argument_quality": payload.argument_quality,
        "evidence_use": payload.evidence_use,
        "logical_consistency": payload.logical_consistency,
        "rebuttal_effectiveness": payload.rebuttal_effectiveness,
        "communication_skills": payload.communication_skills,
        "overall_weighted_score": overall,
    }
