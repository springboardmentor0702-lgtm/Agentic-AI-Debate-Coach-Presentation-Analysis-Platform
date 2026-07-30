from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

import models


def create_notification(
    db: Session,
    user_id: int,
    category: str,
    title: str,
    message: str,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[int] = None,
) -> models.Notification:
    notification = models.Notification(
        user_id=user_id,
        category=category,
        title=title,
        message=message,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_notifications_for_user(db: Session, user_id: int) -> list[models.Notification]:
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == user_id)
        .order_by(models.Notification.created_at.desc())
        .all()
    )


def mark_notification_read(db: Session, notification_id: int) -> models.Notification | None:
    notification = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notification:
        return None
    notification.read = True
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification