from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from services.speech_engine import speech_engine_service
import models
import schemas


router = APIRouter(
    prefix="/api/v1/presentation-analysis",
    tags=["Presentation Analysis Engine"]
)


@router.post(
    "/evaluate",
    response_model=schemas.PresentationMetricResponse
)
def evaluate_presentation(
    payload: schemas.SpeechAnalysisSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate_session = (
        db.query(models.DebateSession)
        .filter(
            models.DebateSession.id == payload.session_id,
            models.DebateSession.user_id == current_user.id
        )
        .first()
    )

    if not debate_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debate session not found for this user."
        )

    try:
        metric_data = speech_engine_service.analyze_speech(
            payload.speech_text,
            payload.audio_duration_seconds or 60.0
        )
        metric_data["audio_duration_seconds"] = float(payload.audio_duration_seconds or 60.0)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc)
        ) from exc

    metric = models.PresentationMetric(
        session_id=payload.session_id,
        user_id=current_user.id,
        **metric_data
    )

    db.add(metric)
    db.commit()
    db.refresh(metric)

    return {
        "session_id": payload.session_id,
        **metric_data
    }


@router.get(
    "/user/me"
)
def get_my_presentation_metrics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return presentation-analysis records belonging to
    the currently authenticated learner.
    """

    metrics = (
        db.query(models.PresentationMetric)
        .filter(
            models.PresentationMetric.user_id == current_user.id
        )
        .order_by(
            models.PresentationMetric.created_at.desc()
        )
        .all()
    )

    results = []

    for metric in metrics:

        # Retrieve the related debate session so the frontend
        # can display its topic/title.
        session = (
            db.query(models.DebateSession)
            .filter(
                models.DebateSession.id == metric.session_id
            )
            .first()
        )

        results.append({
            "id": metric.id,
            "session_id": metric.session_id,
            "title": (
                session.title
                if session
                else f"Presentation Analysis #{metric.id}"
            ),
            "topic": (
                session.topic
                if session
                else None
            ),
            "speech_pace_wpm": metric.speech_pace_wpm,
            "filler_words_count": metric.filler_words_count,
            "filler_words_list": metric.filler_words_list,
            "confidence_score": metric.confidence_score,
            "clarity_score": metric.clarity_score,
            "engagement_score": metric.engagement_score,
            "created_at": metric.created_at.isoformat()
            if metric.created_at
            else None
        })

    return results

