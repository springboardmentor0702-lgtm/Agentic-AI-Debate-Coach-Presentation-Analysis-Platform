from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import User, DebateSession
from schemas import SessionCreate
from security import current_user

router = APIRouter(prefix="/api/sessions", tags=["Debate Sessions"])

SUPPORTED_FORMATS = [
    {"id": "one-on-one", "name": "One-on-One Debate", "description": "Head-to-head traditional debate structure."},
    {"id": "parliamentary", "name": "Parliamentary Debate", "description": "Government vs Opposition style with motions."},
    {"id": "oxford", "name": "Oxford Debate", "description": "Structured proposition vs opposition with audience voting."},
    {"id": "policy", "name": "Policy Debate", "description": "Evidence-heavy debate focusing on policy plan implementation."},
    {"id": "public-forum", "name": "Public Forum Debate", "description": "Current affairs debate accessible to general audiences."},
    {"id": "ai-simulation", "name": "AI Debate Simulation", "description": "Dynamic multi-turn debate against custom AI personas."}
]


def get_owned_session(session_id: int, user: User, db: Session) -> DebateSession:
    session = db.get(DebateSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    # Admins, coaches, educators can view any session; learners can view their own
    if session.user_id != user.id and user.role not in {"admin", "administrator", "coach", "debate_coach", "educator"}:
        raise HTTPException(status_code=403, detail="You do not have access to this session")
    return session


@router.get("/formats")
def get_formats():
    """Return the 6 official debate formats supported by the platform."""
    return {"formats": SUPPORTED_FORMATS}


@router.post("")
def create_session(
    request: SessionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user)
):
    session = DebateSession(
        user_id=user.id,
        topic=request.topic,
        format=request.format,
        position=request.position,
        persona=request.persona,
        status="active",
        turns=[],
        scores={}
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "id": session.id,
        "topic": session.topic,
        "format": session.format,
        "position": session.position,
        "persona": session.persona,
        "status": session.status,
        "created_at": session.created_at.isoformat() if session.created_at else None
    }


@router.get("")
def list_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(current_user)
):
    # If coach/educator/admin, show all sessions or their students'; if learner, show own
    query = db.query(DebateSession)
    if user.role not in {"admin", "administrator", "coach", "debate_coach", "educator"}:
        query = query.filter(DebateSession.user_id == user.id)

    sessions = query.order_by(DebateSession.created_at.desc()).all()
    return [
        {
            "id": session.id,
            "user_id": session.user_id,
            "topic": session.topic,
            "format": session.format,
            "position": session.position,
            "persona": session.persona,
            "status": session.status,
            "turns_count": len(session.turns or []),
            "scores": session.scores,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "completed_at": session.completed_at.isoformat() if session.completed_at else None
        }
        for session in sessions
    ]


@router.get("/{session_id}")
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user)
):
    session = get_owned_session(session_id, user, db)
    return {
        "id": session.id,
        "user_id": session.user_id,
        "topic": session.topic,
        "format": session.format,
        "position": session.position,
        "persona": session.persona,
        "status": session.status,
        "turns": session.turns or [],
        "scores": session.scores or {},
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None
    }


class CompleteSessionPayload(BaseModel):
    scores: Optional[Dict[str, Any]] = None
    turns: Optional[List[Dict[str, Any]]] = None


@router.post("/{session_id}/complete")
def complete_session(
    session_id: int,
    payload: Optional[CompleteSessionPayload] = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user)
):
    session = get_owned_session(session_id, user, db)
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    if payload:
        if payload.scores:
            session.scores = payload.scores
        if payload.turns:
            session.turns = payload.turns

    db.commit()
    db.refresh(session)
    return {
        "message": "Debate session completed",
        "session_id": session.id,
        "status": session.status,
        "scores": session.scores
    }
