from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from services.score_service import save_session_score
import models
import schemas


router = APIRouter(prefix="/api/v1/sessions", tags=["Debate Session Management"])


def _session_response(session: models.DebateSession) -> dict:
    latest_score = session.performance_scores[-1] if session.performance_scores else None
    return {
        "id": session.id,
        "user_id": session.user_id,
        "title": session.title,
        "topic": session.topic,
        "format": session.format,
        "assigned_position": session.assigned_position,
        "status": session.status,
        "scheduled_at": session.scheduled_at,
        "created_at": session.created_at,
        "performance_score": {
            "session_id": session.id,
            "argument_quality": latest_score.argument_quality,
            "evidence_use": latest_score.evidence_use,
            "logical_consistency": latest_score.logical_consistency,
            "rebuttal_effectiveness": latest_score.rebuttal_effectiveness,
            "communication_skills": latest_score.communication_skills,
            "overall_weighted_score": latest_score.overall_weighted_score,
        } if latest_score else None,
        "presentation_metrics": [
            {
                "session_id": session.id,
                "speech_pace_wpm": metric.speech_pace_wpm,
                "filler_words_count": metric.filler_words_count,
                "filler_words_list": metric.filler_words_list,
                "confidence_score": metric.confidence_score,
                "clarity_score": metric.clarity_score,
                "engagement_score": metric.engagement_score,
            }
            for metric in session.presentation_metrics
        ],
    }


@router.post("/create", response_model=schemas.DebateSessionResponse)
def create_debate_session(
    session_data: schemas.DebateSessionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate_session = models.DebateSession(
        user_id=current_user.id,
        title=session_data.title.strip(),
        topic=session_data.topic.strip(),
        format=session_data.format or "AI Simulation",
        assigned_position=session_data.assigned_position or "Affirmative",
        status=session_data.status or "Active",
        scheduled_at=session_data.scheduled_at or datetime.utcnow(),
    )
    db.add(debate_session)
    db.commit()
    db.refresh(debate_session)
    return debate_session


@router.post("/{session_id}/complete")
def complete_debate_session(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate_session = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.id == session_id, models.DebateSession.user_id == current_user.id)
        .first()
    )
    if not debate_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found.")

    debate_session.status = "Completed"
    score = save_session_score(db, debate_session)
    db.commit()
    return {
        "message": "Debate session successfully completed and performance scores recorded.",
        "session_id": session_id,
        "overall_weighted_score": score.overall_weighted_score,
        "logical_consistency": score.logical_consistency,
        "rebuttal_effectiveness": score.rebuttal_effectiveness,
    }


@router.get("/user/me", response_model=List[schemas.DebateSessionResponse])
def get_my_sessions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(models.DebateSession).filter(models.DebateSession.user_id == current_user.id).order_by(models.DebateSession.created_at.desc()).all()
    return [_session_response(session) for session in sessions]


@router.get("/user/{user_id}", response_model=List[schemas.DebateSessionResponse])
def get_user_sessions(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own sessions.")
    sessions = db.query(models.DebateSession).filter(models.DebateSession.user_id == current_user.id).order_by(models.DebateSession.created_at.desc()).all()
    return [_session_response(session) for session in sessions]


@router.get("/{session_id}", response_model=schemas.DebateSessionResponse)
def get_session_by_id(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate_session = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.id == session_id, models.DebateSession.user_id == current_user.id)
        .first()
    )
    if not debate_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found.")
    return _session_response(debate_session)
