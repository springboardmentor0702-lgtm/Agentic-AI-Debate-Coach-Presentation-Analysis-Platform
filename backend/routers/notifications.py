from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import get_db
import models
from services.notification_service import (
    get_notifications_for_user,
    mark_notification_read,
)

router = APIRouter(
    prefix="/api/v1/notifications",
    tags=["Notification & Engagement System"]
)


@router.get("/my-alerts")
def get_user_notifications(user_id: int = 1, db: Session = Depends(get_db)):
    notifications_list = []
    
    # 1. Fetch scheduled debates (Debate Reminders / Practice Session Reminders)
    scheduled_sessions = db.query(models.DebateSession).filter(
        models.DebateSession.user_id == user_id,
        models.DebateSession.status == "Scheduled"
    ).all()
    
    for idx, sess in enumerate(scheduled_sessions):
        scheduled_time_str = sess.scheduled_at.strftime('%Y-%m-%d %H:%M') if sess.scheduled_at else "Not Scheduled"
        notifications_list.append({
            "id": 100 + idx,
            "category": "Session Reminder",
            "title": "Upcoming Scheduled Practice",
            "message": f"Your debate practice on '{sess.topic[:40]}...' is scheduled for {scheduled_time_str}.",
            "timestamp": "Active Reminder",
            "read": False
        })
        
    # 2. Fetch performance scores for Skill Milestones
    high_scores = db.query(models.PerformanceScore).filter(
        models.PerformanceScore.user_id == user_id,
        models.PerformanceScore.overall_weighted_score >= 80.0
    ).all()
    
    for idx, score in enumerate(high_scores):
        notifications_list.append({
            "id": 200 + idx,
            "category": "Milestone Alert",
            "title": "Milestone Achieved: Top Debater",
            "message": f"Congratulations! You scored {score.overall_weighted_score}% in a session, demonstrating exceptional argumentative logic.",
            "timestamp": "Milestone Earned",
            "read": True
        })

    # 3. Coaching Feedback Alerts (Mock feedback alerts mapping to user context)
    notifications_list.append({
        "id": 2,
        "category": "Feedback Alert",
        "title": "Coaching Feedback Dispatched",
        "message": "Coach Sofia Vance left detailed feedback: 'Focus on pacing and reducing straw man fallacy usage.'",
        "timestamp": "2 hours ago",
        "read": False
    })
    
    # 4. Check if they need a Practice Session Reminder (no active sessions in last 24h)
    recent_session = db.query(models.DebateSession).filter(
        models.DebateSession.user_id == user_id,
        models.DebateSession.created_at >= datetime.utcnow() - timedelta(days=1)
    ).first()
    
    if not recent_session:
        notifications_list.append({
            "id": 4,
            "category": "Practice Reminder",
            "title": "Daily Practice Reminder",
            "message": "You haven't practiced today! Initialize a live AI simulation session to keep your rhetorical skills sharp.",
            "timestamp": "System Alert",
            "read": False
        })
        
    # 5. Global Platform Announcement
    notifications_list.append({
        "id": 5,
        "category": "Platform Announcement",
        "title": "System Announcement",
        "message": "Logos Rhetoric AI engine has been updated to v4.2 with enhanced Socratic rebuttal logic.",
        "timestamp": "System Updates",
        "read": False
    })
    
    return notifications_list

@router.post("/read/{notification_id}")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    notification = mark_notification_read(db, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")

    return {
        "status": "success",
        "message": f"Notification {notification_id} marked as read.",
    }