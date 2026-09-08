from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import get_current_user
import models

router = APIRouter(prefix="/api/v1/notifications", tags=["Notification & Engagement System"])

@router.get("/my-alerts")
def get_user_notifications(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications = []
    scheduled = db.query(models.DebateSession).filter(models.DebateSession.user_id == current_user.id, models.DebateSession.status == "Scheduled").order_by(models.DebateSession.scheduled_at.asc()).all()
    for idx, sess in enumerate(scheduled):
        notifications.append({"id": f"session-{sess.id}", "category": "Session Reminder", "title": "Upcoming Practice", "message": f"{sess.topic[:70]} — {sess.scheduled_at.strftime('%d %b %Y, %H:%M') if sess.scheduled_at else 'scheduled'}", "timestamp": sess.scheduled_at.isoformat() if sess.scheduled_at else None, "read": False})
    recent = db.query(models.PerformanceScore).filter(models.PerformanceScore.user_id == current_user.id, models.PerformanceScore.created_at >= datetime.utcnow() - timedelta(days=7)).order_by(models.PerformanceScore.created_at.desc()).all()
    for score in recent[:3]:
        if score.overall_weighted_score >= 80:
            notifications.append({"id": f"score-{score.id}", "category": "Milestone", "title": "Strong Performance", "message": f"You scored {score.overall_weighted_score:.1f}% in a recent debate.", "timestamp": score.created_at.isoformat(), "read": True})
    if not recent:
        notifications.append({"id": "practice", "category": "Practice Reminder", "title": "Keep Your Streak", "message": "Start a short AI debate today to build your rhetoric streak.", "timestamp": None, "read": False})
    return notifications

@router.post("/read/{notification_id}")
def mark_notification_as_read(notification_id: str, current_user: models.User = Depends(get_current_user)):
    return {"status": "success", "notification_id": notification_id, "message": "Notification marked as read."}
