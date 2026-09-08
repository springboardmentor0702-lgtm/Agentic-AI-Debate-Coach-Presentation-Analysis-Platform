from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
import models, schemas
from routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/sessions", tags=["Debate Session Management"])

@router.post("/create", response_model=schemas.DebateSessionResponse)
def create_debate_session(
    session_data: schemas.DebateSessionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = models.DebateSession(
        user_id=current_user.id,
        title=session_data.title,
        topic=session_data.topic,
        format=session_data.format or "AI Simulation",
        assigned_position=session_data.assigned_position or "Affirmative",
        scheduled_at=session_data.scheduled_at or datetime.utcnow(),
        status=session_data.status or "Active"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.post("/{session_id}/recording", response_model=schemas.DebateRecordingResponse)
def add_recording(
    session_id: int,
    recording_data: schemas.DebateRecordingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(models.DebateSession).filter(
        models.DebateSession.id == session_id,
        models.DebateSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found for this user.")
    recording = models.DebateRecording(
        session_id=session_id,
        user_id=current_user.id,
        transcript=recording_data.transcript,
        audio_url=recording_data.audio_url,
        duration_seconds=recording_data.duration_seconds or 0.0
    )
    db.add(recording)
    session.status = "Completed"
    db.commit()
    db.refresh(recording)
    return recording

@router.get("/{session_id}/recordings", response_model=List[schemas.DebateRecordingResponse])
def get_recordings(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session or (session.user_id != current_user.id and current_user.role not in ["Debate Coach", "Educator", "Administrator"]):
        raise HTTPException(status_code=403, detail="Recording access denied.")
    return db.query(models.DebateRecording).filter(models.DebateRecording.session_id == session_id).all()

@router.get("/mine", response_model=List[schemas.DebateSessionResponse])
def get_my_sessions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.DebateSession).filter(
        models.DebateSession.user_id == current_user.id
    ).order_by(models.DebateSession.created_at.desc()).all()

@router.get("/admin/all")
def get_all_sessions_for_admin(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "Administrator":
        raise HTTPException(status_code=403, detail="Administrator access is required.")
    sessions = db.query(models.DebateSession).join(models.User).order_by(
        models.DebateSession.created_at.desc()
    ).all()
    return [
        {
            "id": session.id,
            "user_id": session.user_id,
            "user_name": session.user.full_name,
            "user_email": session.user.email,
            "title": session.title,
            "topic": session.topic,
            "format": session.format,
            "assigned_position": session.assigned_position,
            "status": session.status,
            "created_at": session.created_at
        }
        for session in sessions
    ]

@router.get("/coach/all")
def get_all_sessions_for_coach(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["Debate Coach", "Administrator"]:
        raise HTTPException(status_code=403, detail="Coach access is required.")
    sessions = db.query(models.DebateSession).join(models.User).order_by(
        models.DebateSession.created_at.desc()
    ).all()
    return [
        {
            "id": session.id,
            "user_id": session.user_id,
            "user_name": session.user.full_name,
            "title": session.title,
            "topic": session.topic,
            "format": session.format,
            "assigned_position": session.assigned_position,
            "status": session.status,
            "created_at": session.created_at
        }
        for session in sessions
    ]

@router.get("/user/{user_id}", response_model=List[schemas.DebateSessionResponse])
def get_user_sessions(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.DebateSession).filter(models.DebateSession.user_id == user_id).all()

@router.get("/{session_id}", response_model=schemas.DebateSessionResponse)
def get_session_by_id(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    return session
