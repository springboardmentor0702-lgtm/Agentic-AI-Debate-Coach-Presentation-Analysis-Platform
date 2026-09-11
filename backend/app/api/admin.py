from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.database import get_db
from ..core.security import require_roles
from ..models import User, DebateSession, DebateTurn, SessionScore, Notification, Report, DebateTopic
from ..services.ai_client import STATS

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
def list_users(admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    return [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role,
             "created_at": str(u.created_at)}
            for u in db.query(User).order_by(User.created_at).all()]


class RoleIn(BaseModel):
    role: str


@router.put("/users/{user_id}/role")
def set_role(user_id: str, body: RoleIn,
             admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    if body.role not in {"learner", "coach", "educator", "admin"}:
        raise HTTPException(400, "Invalid role")
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    u.role = body.role
    db.commit()
    return {"ok": True}


@router.delete("/users/{user_id}")
def delete_user(user_id: str, admin: User = Depends(require_roles("admin")),
                db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(400, "You cannot delete your own account")
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    sids = [s.id for s in db.query(DebateSession).filter(DebateSession.user_id == u.id).all()]
    if sids:
        db.query(SessionScore).filter(SessionScore.session_id.in_(sids)).delete(synchronize_session=False)
        db.query(Report).filter(Report.session_id.in_(sids)).delete(synchronize_session=False)
        db.query(DebateTurn).filter(DebateTurn.session_id.in_(sids)).delete(synchronize_session=False)
        db.query(DebateSession).filter(DebateSession.id.in_(sids)).delete(synchronize_session=False)
    db.query(Notification).filter(Notification.user_id == u.id).delete(synchronize_session=False)
    db.delete(u)
    db.commit()
    return {"ok": True}


@router.get("/stats")
def stats(admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    return {"users": db.query(User).count(), "topics": db.query(DebateTopic).count(),
            "sessions": db.query(DebateSession).count(), "turns": db.query(DebateTurn).count(),
            "scores": db.query(SessionScore).count(), "reports": db.query(Report).count(),
            "notifications": db.query(Notification).count(),
            "ai_engine": {"mode": "openai" if settings.OPENAI_API_KEY else "heuristic",
                          "model": settings.OPENAI_MODEL, "llm_calls": STATS}}
