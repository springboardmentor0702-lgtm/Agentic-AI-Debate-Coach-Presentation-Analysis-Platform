from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from routers.auth import get_current_user
from database import get_mongo_db
import models

BACKEND_ROOT = Path(__file__).resolve().parents[1]
AI_ML_ROOT = BACKEND_ROOT.parent / "ai-ml"
for _path in (BACKEND_ROOT, AI_ML_ROOT):
    if str(_path) not in sys.path:
        sys.path.insert(0, str(_path))

try:
    from app.agents.speech_to_text_agent import SpeechToTextAgent
except Exception as exc:  # keep backend bootable if optional STT deps are absent
    SpeechToTextAgent = None
    _STT_IMPORT_ERROR = exc
else:
    _STT_IMPORT_ERROR = None

router = APIRouter(prefix="/api/v1/debate", tags=["Speech To Text"] )

MAX_AUDIO_BYTES = 25 * 1024 * 1024
ALLOWED_EXTENSIONS = {".webm", ".wav", ".mp3", ".m4a", ".mp4", ".mpeg", ".mpga", ".ogg", ".flac"}


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    if SpeechToTextAgent is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Whisper STT is unavailable. Install ai-ml/requirements-stt.txt. {_STT_IMPORT_ERROR}",
        )

    suffix = Path(audio.filename or "argument.webm").suffix.lower() or ".webm"
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported audio format.")

    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio recording.")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds the 25 MB limit.")

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp.write(data)
            temp_path = temp.name

        transcript = SpeechToTextAgent().run(temp_path)
        if not transcript:
            raise HTTPException(status_code=422, detail="Whisper could not detect speech in the recording.")
        mongo = get_mongo_db()
        if mongo is not None:
            try:
                mongo.transcripts.insert_one({"user_id": current_user.id, "filename": audio.filename, "transcript": transcript})
            except Exception:
                pass
        return {"success": True, "transcript": transcript, "filename": audio.filename, "stored_in_secondary_db": mongo is not None}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
