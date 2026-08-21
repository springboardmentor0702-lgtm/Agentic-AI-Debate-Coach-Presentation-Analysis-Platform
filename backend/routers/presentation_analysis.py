from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from services.speech_engine import speech_engine_service
import models
import schemas


router = APIRouter(prefix="/api/v1/presentation-analysis", tags=["Presentation Analysis Engine"])


@router.post("/evaluate", response_model=schemas.PresentationMetricResponse)
def evaluate_presentation(
    payload: schemas.SpeechAnalysisSubmit,
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
        metric_data = speech_engine_service.analyze_speech(payload.speech_text, payload.audio_duration_seconds or 60.0)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    metric = models.PresentationMetric(session_id=payload.session_id, user_id=current_user.id, **metric_data)
    db.add(metric)
    db.commit()
    return {"session_id": payload.session_id, **metric_data}
