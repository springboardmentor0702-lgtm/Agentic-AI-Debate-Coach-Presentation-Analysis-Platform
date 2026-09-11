from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_user
from ..models import DebateSession


def owned_session(session_id: str, db: Session = Depends(get_db),
                  user=Depends(get_current_user)) -> DebateSession:
    s = db.query(DebateSession).filter(
        DebateSession.id == session_id, DebateSession.user_id == user.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    return s
