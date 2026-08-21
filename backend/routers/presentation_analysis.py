from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from routers.auth import get_current_user
from services.speech_engine import speech_engine_service
import models
import schemas


router = APIRouter(prefix="/api/v1/presentation-analysis", tags=["Presentation Analysis Engine"])


ALLOWED_AUDIO_TYPES = {
    "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/x-m4a",
    "audio/webm", "audio/ogg", "application/octet-stream",
}


def _persist_metric(db: Session, session_id: int, user_id: int, metric_data: dict) -> None:
    persisted_fields = {
        key: metric_data[key]
        for key in (
            "speech_pace_wpm", "filler_words_count", "filler_words_list",
            "confidence_score", "clarity_score", "engagement_score",
            "duration_seconds", "pause_count", "silence_ratio_percent", "average_volume_percent",
        )
        if key in metric_data
    }
    db.add(models.PresentationMetric(session_id=session_id, user_id=user_id, **persisted_fields))
    db.commit()


def _owned_session(session_id: int, user_id: int, db: Session) -> models.DebateSession:
    debate_session = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.id == session_id, models.DebateSession.user_id == user_id)
        .first()
    )
    if not debate_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found for this user.")
    return debate_session


@router.post("/evaluate", response_model=schemas.PresentationMetricResponse)
def evaluate_presentation(
    payload: schemas.SpeechAnalysisSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _owned_session(payload.session_id, current_user.id, db)
    try:
        metric_data = speech_engine_service.analyze_speech(payload.speech_text, payload.audio_duration_seconds or 60.0)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    _persist_metric(db, payload.session_id, current_user.id, metric_data)
    return {"session_id": payload.session_id, **metric_data}


@router.post("/analyze-audio", response_model=schemas.PresentationMetricResponse)
async def analyze_uploaded_audio(
    session_id: int = Form(..., gt=0),
    transcript: str = Form(default="", max_length=50000),
    audio_file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _owned_session(session_id, current_user.id, db)
    if audio_file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Upload an audio file in WAV, MP3, M4A, WebM, or OGG format.")
    max_bytes = settings.MAX_AUDIO_FILE_MB * 1024 * 1024
    content = await audio_file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"Audio file exceeds the {settings.MAX_AUDIO_FILE_MB} MB limit.")
    if not content:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Audio file cannot be empty.")

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    temporary_path = upload_dir / f"analysis_{current_user.id}_{uuid4().hex}.audio"
    temporary_path.write_bytes(content)
    try:
        metric_data = speech_engine_service.analyze_audio(temporary_path, transcript)
        _persist_metric(db, session_id, current_user.id, metric_data)
        return {"session_id": session_id, **metric_data}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    finally:
        temporary_path.unlink(missing_ok=True)
