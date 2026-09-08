"""AI Debate Opponent & Simulation Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from backend.database import get_db, DebateSession
from backend.schemas import DebateSessionRequest, DebateSessionResponse, DebateReplyRequest

router = APIRouter(
    prefix="/debate",
    tags=["Debate"],
    responses={404: {"description": "Not found"}},
)


@router.post("/start", response_model=DebateSessionResponse)
def start_debate_session(
    request: DebateSessionRequest,
    db: Session = Depends(get_db)
):
    """
    Start a new debate simulation session.
    
    - **topic**: The debate topic
    - **opponent_stance**: The AI opponent's position (for/against)
    - **difficulty**: Difficulty level (beginner/intermediate/advanced)
    """
    try:
        session = DebateSession(
            topic=request.topic,
            opponent_stance=request.opponent_stance,
            difficulty=request.difficulty,
            user_argument=None,
            transcript=[],
            status="active"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
        return DebateSessionResponse(
            id=session.id,
            topic=session.topic,
            opponent_stance=session.opponent_stance,
            difficulty=session.difficulty,
            status=session.status,
            transcript=session.transcript or [],
            message="Debate session started successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reply/{session_id}")
def get_opponent_reply(
    session_id: str,
    request: DebateReplyRequest,
    db: Session = Depends(get_db)
):
    """
    Get AI opponent's response to user's argument.
    
    - **session_id**: The debate session ID
    - **user_argument**: The user's argument/response
    """
    try:
        session = db.query(DebateSession).filter(DebateSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Debate session not found")
        
        # Store user argument
        session.user_argument = request.user_argument
        db.commit()
        
        return {
            "status": "success",
            "session_id": session_id,
            "user_argument": request.user_argument,
            "opponent_reply": "AI opponent response - endpoint ready for implementation",
            "transcript": session.transcript or []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}", response_model=DebateSessionResponse)
def get_debate_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve a debate session by ID."""
    session = db.query(DebateSession).filter(DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")
    
    return DebateSessionResponse(
        id=session.id,
        topic=session.topic,
        opponent_stance=session.opponent_stance,
        difficulty=session.difficulty,
        status=session.status,
        transcript=session.transcript or [],
        message="Session retrieved successfully"
    )


@router.post("/session/{session_id}/end")
def end_debate_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """End a debate session."""
    try:
        session = db.query(DebateSession).filter(DebateSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Debate session not found")
        
        session.status = "completed"
        db.commit()
        
        return {"status": "success", "message": "Debate session ended"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def debate_health():
    """Check debate module health."""
    return {
        "status": "healthy",
        "module": "Debate Simulation Engine",
        "version": "1.0.0"
    }
