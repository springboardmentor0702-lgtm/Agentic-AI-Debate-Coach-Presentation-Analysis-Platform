from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import get_current_user
import models

router = APIRouter(prefix="/api/v1/notifications", tags=["Notification & Engagement System"])

@router.get("/my-alerts")
def get_user_notifications(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    alerts = []
    scheduled = db.query(models.DebateSession).filter(
        models.DebateSession.user_id == current_user.id,
        models.DebateSession.status == "Scheduled"
    ).order_by(models.DebateSession.scheduled_at.asc()).all()
    for idx, sess in enumerate(scheduled):
        when = sess.scheduled_at.strftime("%Y-%m-%d %H:%M") if sess.scheduled_at else "Not scheduled"
        alerts.append({"id": 100 + idx, "category": "Session Reminder", "title": "Upcoming Practice", "message": f"'{sess.topic}' is scheduled for {when}.", "read": False})

    scores = db.query(models.PerformanceScore).filter(models.PerformanceScore.user_id == current_user.id).order_by(models.PerformanceScore.id.desc()).all()
    for idx, score in enumerate(scores[:5]):
        if float(score.overall_weighted_score) >= 80:
            alerts.append({"id": 200 + idx, "category": "Milestone Alert", "title": "Performance Milestone", "message": f"You achieved {score.overall_weighted_score:.1f}% in a debate session.", "read": False})

    recent = db.query(models.DebateSession).filter(
        models.DebateSession.user_id == current_user.id,
        models.DebateSession.created_at >= datetime.utcnow() - timedelta(days=1)
    ).first()
    if not recent:
        alerts.append({"id": 4, "category": "Practice Reminder", "title": "Daily Practice", "message": "Start an AI debate session to keep your skills active.", "read": False})

    alerts.append({"id": 5, "category": "Platform Announcement", "title": "LOGOS.AI Update", "message": "Argument analysis, coaching, presentation metrics and role dashboards are available.", "read": False})
    return alerts

@router.post("/read/{notification_id}")
def mark_notification_as_read(notification_id: int):
    return {"status": "success", "notification_id": notification_id, "read": True}
