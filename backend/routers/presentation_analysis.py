from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from services.speech_engine import speech_engine_service
from routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/presentation-analysis", tags=["Presentation Analysis Engine"])

@router.post("/evaluate", response_model=schemas.PresentationMetricResponse)
def evaluate_presentation(
    payload: schemas.SpeechAnalysisSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(models.DebateSession).filter(
        models.DebateSession.id == payload.session_id,
        models.DebateSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Presentation session not found for this user.")

    metrics = speech_engine_service.analyze_speech(payload.speech_text, payload.audio_duration_seconds or 60.0)
    
    new_metric = models.PresentationMetric(
        session_id=payload.session_id,
        user_id=current_user.id,
        speech_pace_wpm=metrics["speech_pace_wpm"],
        filler_words_count=metrics["filler_words_count"],
        filler_words_list=metrics["filler_words_list"],
        confidence_score=metrics["confidence_score"],
        clarity_score=metrics["clarity_score"],
        engagement_score=metrics["engagement_score"],
        prosody_score=metrics["prosody_score"],
        vocal_variety=metrics["vocal_variety"],
        vocabulary_diversity=metrics["vocabulary_diversity"],
        avg_sentence_length=metrics["avg_sentence_length"],
        pace_feedback=metrics["pace_feedback"]
    )
    db.add(new_metric)
    db.commit()
    db.refresh(new_metric)
    
    return {
        "session_id": payload.session_id,
        "speech_pace_wpm": metrics["speech_pace_wpm"],
        "filler_words_count": metrics["filler_words_count"],
        "filler_words_list": metrics["filler_words_list"],
        "confidence_score": metrics["confidence_score"],
        "clarity_score": metrics["clarity_score"],
        "engagement_score": metrics["engagement_score"],
        "prosody_score": metrics["prosody_score"],
        "vocal_variety": metrics["vocal_variety"],
        "pace_feedback": metrics["pace_feedback"],
        "vocabulary_diversity": metrics["vocabulary_diversity"],
        "avg_sentence_length": metrics["avg_sentence_length"]
    }

@router.get("/history", response_model=list[schemas.PresentationMetricResponse])
def get_presentation_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    metrics = db.query(models.PresentationMetric).filter(
        models.PresentationMetric.user_id == current_user.id
    ).order_by(models.PresentationMetric.created_at.desc()).all()
    return [
        {
            "session_id": metric.session_id,
            "speech_pace_wpm": metric.speech_pace_wpm,
            "filler_words_count": metric.filler_words_count,
            "filler_words_list": metric.filler_words_list,
            "confidence_score": metric.confidence_score,
            "clarity_score": metric.clarity_score,
            "engagement_score": metric.engagement_score,
            "prosody_score": metric.prosody_score,
            "vocal_variety": metric.vocal_variety,
            "pace_feedback": metric.pace_feedback,
            "vocabulary_diversity": metric.vocabulary_diversity,
            "avg_sentence_length": metric.avg_sentence_length
        }
        for metric in metrics
    ]
