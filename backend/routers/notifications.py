from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
from .auth import get_current_user


router = APIRouter(
    prefix="/api/v1/notifications",
    tags=["Notification & Engagement System"],
)


def _format_timestamp(value):
    if not value:
        return "Recently"

    now = datetime.utcnow()
    delta = now - value

    if delta.total_seconds() < 60:
        return "Just now"
    if delta.total_seconds() < 3600:
        minutes = max(1, int(delta.total_seconds() // 60))
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    if delta.total_seconds() < 86400:
        hours = max(1, int(delta.total_seconds() // 3600))
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    days = max(1, delta.days)
    return f"{days} day{'s' if days != 1 else ''} ago"


@router.get("/my-alerts")
def get_user_notifications(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifications = []

    # Real upcoming-session reminder.
    upcoming = (
        db.query(models.DebateSession)
        .filter(
            models.DebateSession.user_id == current_user.id,
            models.DebateSession.status == "Active",
            models.DebateSession.scheduled_at >= datetime.utcnow(),
            models.DebateSession.scheduled_at <= datetime.utcnow() + timedelta(hours=24),
        )
        .order_by(models.DebateSession.scheduled_at.asc())
        .first()
    )

    if upcoming:
        notifications.append(
            {
                "id": f"session-{upcoming.id}",
                "category": "Session Reminder",
                "title": "Upcoming Debate Session",
                "message": (
                    f"Your {upcoming.format} session on "
                    f"'{upcoming.topic}' is scheduled for "
                    f"{upcoming.scheduled_at.strftime('%d %b %Y, %I:%M %p')}."
                ),
                "timestamp": _format_timestamp(upcoming.scheduled_at),
                "read": False,
            }
        )

    # Real analysis-ready notification based on the latest completed session.
    latest_completed = (
        db.query(models.DebateSession)
        .filter(
            models.DebateSession.user_id == current_user.id,
            models.DebateSession.status == "Completed",
        )
        .order_by(models.DebateSession.id.desc())
        .first()
    )

    if latest_completed:
        latest_score = (
            db.query(models.PerformanceScore)
            .filter(
                models.PerformanceScore.session_id == latest_completed.id,
                models.PerformanceScore.user_id == current_user.id,
            )
            .order_by(models.PerformanceScore.id.desc())
            .first()
        )

        if latest_score:
            notifications.append(
                {
                    "id": f"analysis-{latest_completed.id}",
                    "category": "Feedback Alert",
                    "title": "Analysis Ready",
                    "message": (
                        f"Your performance analysis for Session "
                        f"{latest_completed.id} is ready. "
                        f"Overall score: {latest_score.overall_weighted_score:.1f}/100."
                    ),
                    "timestamp": _format_timestamp(latest_score.created_at),
                    "read": False,
                }
            )

    # Real milestone check: five latest completed sessions with no fallacies.
    completed_sessions = (
        db.query(models.DebateSession)
        .filter(
            models.DebateSession.user_id == current_user.id,
            models.DebateSession.status == "Completed",
        )
        .order_by(models.DebateSession.id.desc())
        .limit(5)
        .all()
    )

    if len(completed_sessions) == 5:
        session_ids = [session.id for session in completed_sessions]

        analyses = (
            db.query(models.ArgumentAnalysis)
            .filter(
                models.ArgumentAnalysis.user_id == current_user.id,
                models.ArgumentAnalysis.session_id.in_(session_ids),
            )
            .all()
        )

        analysis_ids = [analysis.id for analysis in analyses]

        fallacy_count = 0
        if analysis_ids:
            fallacy_count = (
                db.query(models.FallacyLog)
                .filter(models.FallacyLog.analysis_id.in_(analysis_ids))
                .count()
            )

        if fallacy_count == 0:
            newest_session = completed_sessions[0]
            notifications.append(
                {
                    "id": f"milestone-{newest_session.id}",
                    "category": "Milestone Alert",
                    "title": "Milestone Achieved",
                    "message": (
                        "You completed 5 consecutive debate simulations "
                        "with 0 fallacies flagged."
                    ),
                    "timestamp": _format_timestamp(newest_session.created_at),
                    "read": False,
                }
            )

    return notifications


@router.post("/read/{notification_id}")
def mark_notification_as_read(
    notification_id: str,
    current_user: models.User = Depends(get_current_user),
):
    return {
        "status": "success",
        "message": f"Notification {notification_id} marked as read.",
        "user_id": current_user.id,
    }
