from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/v1/sessions", tags=["Debate Session Management"])

@router.post("/create", response_model=schemas.DebateSessionResponse)
def create_debate_session(session_data: schemas.DebateSessionCreate, user_id: int = 1, db: Session = Depends(get_db)):
    session = models.DebateSession(
        user_id=user_id,
        title=session_data.title,
        topic=session_data.topic,
        format=session_data.format or "AI Simulation",
        assigned_position=session_data.assigned_position or "Affirmative",
        status=session_data.status or "Active",
        scheduled_at=session_data.scheduled_at or datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.post("/{session_id}/complete")
def complete_debate_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    
    session.status = "Completed"
    
    # Save a practice record/performance score for user dashboard tracking
    score = models.PerformanceScore(
        session_id=session.id,
        user_id=session.user_id,
        argument_quality=84.0,
        evidence_use=80.0,
        logical_consistency=88.5,
        rebuttal_effectiveness=82.0,
        communication_skills=85.0,
        overall_weighted_score=84.2
    )
    db.add(score)
    db.commit()
    db.refresh(session)
    
    return {"message": "Debate session successfully completed and performance scores recorded!", "session_id": session_id}

@router.get("/user/{user_id}", response_model=List[schemas.DebateSessionResponse])
def get_user_sessions(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.DebateSession).filter(models.DebateSession.user_id == user_id).all()

@router.get("/{session_id}", response_model=schemas.DebateSessionResponse)
def get_session_by_id(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    return session