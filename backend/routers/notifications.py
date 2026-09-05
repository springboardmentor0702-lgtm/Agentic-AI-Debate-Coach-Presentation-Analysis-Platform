from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import get_db
from routers.auth import get_current_user_optional, get_current_user
import models
import schemas

router = APIRouter(prefix="/api/v1/notifications", tags=["Notification & Engagement System"])


def create_notification(
    db: Session,
    user_id: int,
    category: str,
    title: str,
    message: str
) -> models.Notification:
    """Helper to record a persistent notification tied to a user action."""
    notification = models.Notification(
        user_id=user_id,
        category=category,
        title=title,
        message=message,
        read=False,
        created_at=datetime.utcnow()
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.get("/my-alerts")
def get_user_notifications(
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    target_user_id = current_user.id if current_user else (user_id or 1)
    notifications_list = []

    # 1. Fetch Scheduled Debate Reminders
    scheduled_sessions = db.query(models.DebateSession).filter(
        models.DebateSession.user_id == target_user_id,
        models.DebateSession.status == "Scheduled"
    ).order_by(models.DebateSession.scheduled_at.asc()).all()

    for idx, sess in enumerate(scheduled_sessions):
        scheduled_time_str = sess.scheduled_at.strftime('%b %d, %Y at %H:%M') if sess.scheduled_at else "Upcoming"
        notifications_list.append({
            "id": 1000 + sess.id,
            "category": "Debate",
            "title": "Upcoming Scheduled Practice",
            "message": f"Your debate session '{sess.topic[:45]}...' is scheduled for {scheduled_time_str}.",
            "timestamp": scheduled_time_str,
            "read": False
        })

    # 2. Fetch Persistent Notifications from Database
    db_notifications = db.query(models.Notification).filter(
        models.Notification.user_id == target_user_id
    ).order_by(models.Notification.created_at.desc()).limit(30).all()

    for notif in db_notifications:
        time_diff = datetime.utcnow() - notif.created_at
        if time_diff.total_seconds() < 60:
            time_str = "Just now"
        elif time_diff.total_seconds() < 3600:
            time_str = f"{int(time_diff.total_seconds() // 60)}m ago"
        elif time_diff.total_seconds() < 86400:
            time_str = f"{int(time_diff.total_seconds() // 3600)}h ago"
        else:
            time_str = notif.created_at.strftime('%b %d, %Y')

        notifications_list.append({
            "id": notif.id,
            "category": notif.category,
            "title": notif.title,
            "message": notif.message,
            "timestamp": time_str,
            "read": notif.read
        })

    # 3. If brand new user with 0 notifications, seed a welcome notification
    if not notifications_list:
        welcome_notif = create_notification(
            db=db,
            user_id=target_user_id,
            category="System",
            title="Welcome to LOGOS.AI",
            message="Your agentic rhetoric and speech analytics suite is ready. Initialize your first debate or vocal matrix session."
        )
        notifications_list.append({
            "id": welcome_notif.id,
            "category": welcome_notif.category,
            "title": welcome_notif.title,
            "message": welcome_notif.message,
            "timestamp": "Just now",
            "read": False
        })

    return notifications_list


@router.post("/read/{notification_id}")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if notif:
        notif.read = True
        db.commit()
        return {"status": "success", "message": f"Notification {notification_id} marked as read."}
    return {"status": "success", "message": "Notification updated."}


@router.post("/create")
def trigger_notification(
    category: str,
    title: str,
    message: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = create_notification(
        db=db,
        user_id=current_user.id,
        category=category,
        title=title,
        message=message
    )
    return {"status": "created", "id": notif.id}
