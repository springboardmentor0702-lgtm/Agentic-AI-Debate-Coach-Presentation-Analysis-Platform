from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from services.speech_engine import speech_engine_service

router = APIRouter(prefix="/api/v1/presentation-analysis", tags=["Presentation Analysis Engine"])

@router.post("/evaluate", response_model=schemas.PresentationMetricResponse)
def evaluate_presentation(payload: schemas.SpeechAnalysisSubmit, user_id: int = 1, db: Session = Depends(get_db)):
    metrics = speech_engine_service.analyze_speech(payload.speech_text, payload.audio_duration_seconds or 60.0)
    
    new_metric = models.PresentationMetric(
        session_id=payload.session_id,
        user_id=user_id,
        speech_pace_wpm=metrics["speech_pace_wpm"],
        filler_words_count=metrics["filler_words_count"],
        filler_words_list=metrics["filler_words_list"],
        confidence_score=metrics["confidence_score"],
        clarity_score=metrics["clarity_score"],
        engagement_score=metrics["engagement_score"]
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
        "engagement_score": metrics["engagement_score"]
    }
