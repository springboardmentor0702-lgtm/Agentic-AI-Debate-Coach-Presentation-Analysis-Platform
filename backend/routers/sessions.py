from datetime import datetime

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from database import get_db

from models import (
    User,
    DebateSession
)

from schemas import SessionCreate

from security import current_user


router = APIRouter(
    prefix="/api/sessions",
    tags=["Debate Sessions"]
)


# --------------------------------
# OWNED SESSION
# --------------------------------

def get_owned_session(
    session_id: int,
    user: User,
    db: Session
):

    session = db.get(
        DebateSession,
        session_id
    )

    if not session:

        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    if session.user_id != user.id:

        raise HTTPException(
            status_code=403,
            detail="You do not own this session"
        )

    return session


# --------------------------------
# CREATE SESSION
# --------------------------------

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
        status="active"
    )

    db.add(session)

    db.commit()

    db.refresh(session)

    return {
        "id": session.id,
        "topic": session.topic,
        "format": session.format,
        "position": session.position,
        "status": session.status
    }


# --------------------------------
# LIST SESSIONS
# --------------------------------

@router.get("")
def list_sessions(
    db: Session = Depends(get_db),

    user: User = Depends(current_user)
):

    sessions = (
        db.query(DebateSession)
        .filter(
            DebateSession.user_id == user.id
        )
        .order_by(
            DebateSession.created_at.desc()
        )
        .all()
    )

    return [
        {
            "id": session.id,
            "topic": session.topic,
            "format": session.format,
            "position": session.position,
            "status": session.status,
            "created_at": session.created_at
        }

        for session in sessions
    ]


# --------------------------------
# GET SESSION
# --------------------------------

@router.get("/{session_id}")
def get_session(
    session_id: int,

    db: Session = Depends(get_db),

    user: User = Depends(current_user)
):

    session = get_owned_session(
        session_id,
        user,
        db
    )

    return {
        "id": session.id,
        "topic": session.topic,
        "format": session.format,
        "position": session.position,
        "status": session.status,
        "created_at": session.created_at
    }


# --------------------------------
# COMPLETE SESSION
# --------------------------------

@router.post("/{session_id}/complete")
def complete_session(
    session_id: int,

    db: Session = Depends(get_db),

    user: User = Depends(current_user)
):

    session = get_owned_session(
        session_id,
        user,
        db
    )

    session.status = "completed"

    session.completed_at = datetime.utcnow()

    db.commit()

    return {
        "message": "Debate session completed",
        "session_id": session.id,
        "status": session.status
    }
