from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models

router = APIRouter(prefix="/api/v1/notifications", tags=["Notification & Engagement System"])

@router.get("/my-alerts")
def get_user_notifications(user_id: int = 1):
    # Simulated database-backed active notification triggers
    return [
        {
            "id": 1,
            "category": "Session Reminder",
            "title": "Upcoming Debate Match",
            "message": "Your Oxford-style debate session on 'AI Governance' is scheduled in 30 minutes.",
            "timestamp": "Just now",
            "read": False
        },
        {
            "id": 2,
            "category": "Feedback Alert",
            "title": "Analysis Ready",
            "message": "Coach Sofia Vance left detailed logic audit feedback on your last debate rebuttal.",
            "timestamp": "2 hours ago",
            "read": False
        },
        {
            "id": 3,
            "category": "Milestone Alert",
            "title": "Milestone Achieved: Fallacy Shield Master",
            "message": "Congratulations! You have completed 5 consecutive debate simulations with 0 fallacies flagged.",
            "timestamp": "1 day ago",
            "read": True
        }
      ]

@router.post("/read/{notification_id}")
def mark_notification_as_read(notification_id: int):
    return {"status": "success", "message": f"Notification {notification_id} marked as read."}
