from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/notifications", tags=["Notification & Engagement System"])


def _ensure_notification(
    db: Session,
    user_id: int,
    category: str,
    title: str,
    message: str,
    source_type: str | None = None,
    source_id: int | None = None,
) -> None:
    query = db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.category == category,
        models.Notification.source_type == source_type,
        models.Notification.source_id == source_id,
    )
    if not query.first():
        db.add(
            models.Notification(
                user_id=user_id,
                category=category,
                title=title,
                message=message,
                source_type=source_type,
                source_id=source_id,
            )
        )


def _materialize_system_notifications(db: Session, user: models.User) -> None:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    scheduled = (
        db.query(models.DebateSession)
        .filter(
            models.DebateSession.user_id == user.id,
            models.DebateSession.status == "Scheduled",
            models.DebateSession.scheduled_at >= now,
        )
        .order_by(models.DebateSession.scheduled_at.asc())
        .limit(10)
        .all()
    )
    for session in scheduled:
        when = session.scheduled_at.strftime("%Y-%m-%d %H:%M UTC") if session.scheduled_at else "unscheduled"
        _ensure_notification(
            db,
            user.id,
            "Session Reminder",
            "Upcoming scheduled practice",
            f"Your practice session '{session.topic[:80]}' is scheduled for {when}.",
            "session",
            session.id,
        )

    high_scores = (
        db.query(models.PerformanceScore)
        .filter(
            models.PerformanceScore.user_id == user.id,
            models.PerformanceScore.overall_weighted_score >= 80,
        )
        .order_by(models.PerformanceScore.created_at.desc())
        .limit(10)
        .all()
    )
    for score in high_scores:
        _ensure_notification(
            db,
            user.id,
            "Milestone Alert",
            "Performance milestone achieved",
            f"You scored {score.overall_weighted_score:.1f}% in a debate session.",
            "score",
            score.id,
        )

    recent = (
        db.query(models.DebateSession)
        .filter(
            models.DebateSession.user_id == user.id,
            models.DebateSession.created_at >= now - timedelta(days=1),
        )
        .first()
    )
    if not recent:
        _ensure_notification(
            db,
            user.id,
            "Practice Reminder",
            "Keep your debate habit active",
            "You have not recorded a practice session in the last 24 hours.",
            "system",
            user.id,
        )
    db.commit()


@router.get("/my-alerts", response_model=list[schemas.NotificationResponse])
def get_user_notifications(
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _materialize_system_notifications(db, current_user)
    notifications = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": item.id,
            "category": item.category,
            "title": item.title,
            "message": item.message,
            "read": item.is_read,
            "timestamp": item.created_at,
            "source_type": item.source_type,
            "source_id": item.source_id,
        }
        for item in notifications
    ]


@router.post("/read/{notification_id}", response_model=schemas.NotificationReadResponse)
def mark_notification_as_read(
    notification_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = (
        db.query(models.Notification)
        .filter(models.Notification.id == notification_id, models.Notification.user_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(notification)
    return {"id": notification.id, "read": notification.is_read, "read_at": notification.read_at}


@router.post("/read-all", response_model=dict)
def mark_all_notifications_as_read(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id, models.Notification.is_read.is_(False))
        .update({"is_read": True, "read_at": datetime.now(timezone.utc).replace(tzinfo=None)}, synchronize_session=False)
    )
    db.commit()
    return {"updated": updated}
