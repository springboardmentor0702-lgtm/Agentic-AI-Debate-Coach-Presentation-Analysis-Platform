from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_user, require_roles
from ..models import User, Notification, DebateSession, DebateTopic
from ..services.notifications_service import notify

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Debate reminders (Module 12): sessions scheduled within the next 24h
    now = datetime.utcnow()
    upcoming = db.query(DebateSession).filter(
        DebateSession.user_id == user.id,
        DebateSession.status == "scheduled",
        DebateSession.scheduled_at.isnot(None),
        DebateSession.scheduled_at <= now + timedelta(hours=24),
        DebateSession.scheduled_at >= now - timedelta(hours=1),
    ).all()
    for s in upcoming:
        topic = db.get(DebateTopic, s.topic_id)
        notify(db, user.id, "reminder", "Debate session reminder",
               f'Your debate "{topic.title if topic else ""}" is scheduled for {s.scheduled_at}.',
               dedupe_key=f"reminder:{s.id}")
    db.commit()

    rows = db.query(Notification).filter(Notification.user_id == user.id) \
        .order_by(Notification.created_at.desc()).limit(40).all()
    unread = db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read == False).count()
    return {"unread_count": unread,
            "items": [{"id": n.id, "type": n.type, "title": n.title, "message": n.message,
                       "is_read": n.is_read, "created_at": str(n.created_at)} for n in rows]}


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    n = db.query(Notification).filter(
        Notification.id == notification_id, Notification.user_id == user.id).first()
    if not n:
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    return {"ok": True}


@router.post("/read-all")
def read_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read == False) \
        .update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"ok": True}


class AnnounceIn(BaseModel):
    title: str
    message: str = ""


@router.post("/announce")
def announce(body: AnnounceIn, admin: User = Depends(require_roles("admin")),
             db: Session = Depends(get_db)):
    for u in db.query(User).all():
        db.add(Notification(user_id=u.id, type="announcement",
                            title=body.title, message=body.message))
    db.commit()
    return {"ok": True, "sent_to": db.query(User).count()}
