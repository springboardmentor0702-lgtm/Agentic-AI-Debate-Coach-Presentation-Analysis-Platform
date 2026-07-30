from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.notification_service import get_notifications_for_user, mark_notification_read

router = APIRouter(prefix="/api/v1/notifications", tags=["Notification & Engagement System"])

@router.get("/my-alerts")
def get_user_notifications(user_id: int = 1, db: Session = Depends(get_db)):
    notifications = get_notifications_for_user(db, user_id)
    return [
        {
            "id": notification.id,
            "category": notification.category,
            "title": notification.title,
            "message": notification.message,
            "timestamp": notification.created_at.isoformat() if notification.created_at else None,
            "read": notification.read,
        }
        for notification in notifications
    ]

@router.post("/read/{notification_id}")
def mark_notification_as_read(notification_id: int, db: Session = Depends(get_db)):
    notification = mark_notification_read(db, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return {"status": "success", "message": f"Notification {notification_id} marked as read."}
