from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Notification
from schemas import NotificationCreate
from security import current_user

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notification & Engagement"]
)


@router.get("")
def list_notifications(
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    if not notifications:
        # Generate default onboarding & engagement alerts for the user
        defaults = [
            Notification(
                user_id=user.id,
                title="Debate Reminder",
                message="Your scheduled Oxford Debate simulation is ready for practice.",
                notification_type="reminder"
            ),
            Notification(
                user_id=user.id,
                title="Coaching Feedback Alert",
                message="Coach analysis ready: Rebuttal responsiveness improved by 12% in your last turn.",
                notification_type="feedback"
            ),
            Notification(
                user_id=user.id,
                title="Skill Milestone Unlocked",
                message="Milestone achieved: Logic Defender badge (0 Fallacies detected in 3 consecutive debates).",
                notification_type="milestone"
            ),
            Notification(
                user_id=user.id,
                title="Platform Announcement",
                message="New AI Opponent Persona 'Socratic Inquirer' is now available in debate simulations!",
                notification_type="announcement"
            )
        ]
        for n in defaults:
            db.add(n)
        db.commit()
        notifications = defaults

    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else datetime.utcnow().isoformat()
        }
        for n in notifications
    ]


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    notification = db.get(Notification, notification_id)
    if not notification or notification.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    return {"message": "Notification marked as read", "id": notification.id}


@router.post("")
def create_notification(
    payload: NotificationCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    n = Notification(
        user_id=payload.user_id,
        title=payload.title,
        message=payload.message,
        notification_type=payload.notification_type,
        is_read=False
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return {"id": n.id, "message": "Notification created successfully"}
