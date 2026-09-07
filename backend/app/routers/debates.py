from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, DebateSession, DebateTurn
from ..schemas import DebateSessionCreate, DebateSessionResponse, DebateTurnCreate, DebateTurnResponse
from .auth import get_current_user

router = APIRouter(prefix="/debates", tags=["Debate Session Management"])

@router.post("/", response_model=DebateSessionResponse)
def create_debate_session(
    session_in: DebateSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = DebateSession(
        user_id=current_user.id,
        title=session_in.title,
        topic=session_in.topic,
        format=session_in.format,
        user_position=session_in.user_position,
        opponent_type=session_in.opponent_type,
        ai_persona=session_in.ai_persona,
        duration_minutes=session_in.duration_minutes,
        status="active"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/", response_model=List[DebateSessionResponse])
def get_user_debates(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(DebateSession)
    if current_user.role == "Learner":
        query = query.filter(DebateSession.user_id == current_user.id)
    if status_filter:
        query = query.filter(DebateSession.status == status_filter)
    return query.order_by(DebateSession.created_at.desc()).all()

@router.get("/{session_id}", response_model=DebateSessionResponse)
def get_debate_details(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(DebateSession).filter(DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")
    if current_user.role == "Learner" and session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this debate session")
    return session

@router.post("/{session_id}/turns", response_model=DebateTurnResponse)
def add_debate_turn(
    session_id: int,
    turn_in: DebateTurnCreate,
    speaker: str = "User",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(DebateSession).filter(DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")
    
    current_turn_count = db.query(DebateTurn).filter(DebateTurn.session_id == session_id).count()
    new_turn = DebateTurn(
        session_id=session_id,
        speaker=speaker,
        turn_number=current_turn_count + 1,
        content=turn_in.content,
        audio_path=turn_in.audio_path
    )
    db.add(new_turn)
    db.commit()
    db.refresh(new_turn)
    return new_turn

@router.put("/{session_id}/complete", response_model=DebateSessionResponse)
def complete_debate_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(DebateSession).filter(DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")
    
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session
