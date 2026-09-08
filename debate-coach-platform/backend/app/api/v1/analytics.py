"""Analytics and reports endpoints."""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.models import (
    DebateAnalysis,
    DebateMessage,
    DebateSession,
    DebateStatus,
    Presentation,
    PresentationAnalysis,
    SkillHistory,
    User,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ============================================================================
# Schemas
# ============================================================================


class DebateStatistics(BaseModel):
    """User's debate statistics."""

    total_debates: int
    completed_debates: int
    active_debates: int
    average_duration_minutes: float
    most_common_topic: str | None = None
    win_rate: float  # Placeholder


class PresentationStatistics(BaseModel):
    """User's presentation statistics."""

    total_presentations: int
    analyzed_presentations: int
    average_clarity_score: float | None = None
    average_confidence_score: float | None = None
    average_engagement_score: float | None = None


class SkillProgressData(BaseModel):
    """Skill progress data point."""

    timestamp: datetime
    skill_name: str
    score: float


class UserPerformanceReport(BaseModel):
    """Comprehensive user performance report."""

    user_id: int
    user_name: str
    user_email: str
    report_generated_at: datetime
    debate_stats: DebateStatistics
    presentation_stats: PresentationStatistics
    recent_skill_progress: list[SkillProgressData]
    progress_history: list[dict[str, datetime | float | str]]
    recommended_focus_areas: list[str]
    overall_progress_percentage: float


class ActivityLog(BaseModel):
    """User activity log entry."""

    timestamp: datetime
    activity_type: str
    description: str
    details: str | None = None


class AdminDashboardMetrics(BaseModel):
    """Admin dashboard metrics."""

    total_users: int
    active_users_this_week: int
    total_debates: int
    completed_debates: int
    total_presentations: int
    average_user_debates: float
    average_user_presentations: float


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/me/statistics", response_model=dict)
def get_my_statistics(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Get comprehensive statistics for the current user."""
    # Debate statistics
    stmt = select(func.count(DebateSession.id)).where(DebateSession.user_id == current_user.id)
    result = db.execute(stmt)
    total_debates = result.scalar() or 0

    stmt = select(func.count(DebateSession.id)).where(
        (DebateSession.user_id == current_user.id) & (DebateSession.status == DebateStatus.COMPLETED.value)
    )
    result = db.execute(stmt)
    completed_debates = result.scalar() or 0

    stmt = select(func.count(DebateSession.id)).where(
        (DebateSession.user_id == current_user.id) & (DebateSession.status == DebateStatus.ACTIVE.value)
    )
    result = db.execute(stmt)
    active_debates = result.scalar() or 0

    # Presentation statistics
    stmt = select(func.count(Presentation.id)).where(Presentation.user_id == current_user.id)
    result = db.execute(stmt)
    total_presentations = result.scalar() or 0

    return {
        "debate_statistics": {
            "total_debates": total_debates,
            "completed_debates": completed_debates,
            "active_debates": active_debates,
            "completion_rate": (completed_debates / total_debates * 100) if total_debates > 0 else 0,
        },
        "presentation_statistics": {"total_presentations": total_presentations},
        "timestamp": datetime.now(timezone.utc),
    }


@router.get("/me/performance-report", response_model=UserPerformanceReport)
def get_performance_report(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserPerformanceReport:
    """Get comprehensive performance report for the current user."""
    # Get debate statistics
    stmt = select(func.count(DebateSession.id)).where(DebateSession.user_id == current_user.id)
    result = db.execute(stmt)
    total_debates = result.scalar() or 0

    stmt = select(func.count(DebateSession.id)).where(
        (DebateSession.user_id == current_user.id) & (DebateSession.status == DebateStatus.COMPLETED.value)
    )
    result = db.execute(stmt)
    completed_debates = result.scalar() or 0

    stmt = select(func.count(DebateSession.id)).where(
        (DebateSession.user_id == current_user.id) & (DebateSession.status == DebateStatus.ACTIVE.value)
    )
    result = db.execute(stmt)
    active_debates = result.scalar() or 0

    # Get presentation statistics
    stmt = select(func.count(Presentation.id)).where(Presentation.user_id == current_user.id)
    result = db.execute(stmt)
    total_presentations = result.scalar() or 0

    stmt = select(func.count(Presentation.id)).where(
        (Presentation.user_id == current_user.id) & (Presentation.status == "ANALYZED")
    )
    result = db.execute(stmt)
    analyzed_presentations = result.scalar() or 0

    score_stmt = select(
        func.avg(PresentationAnalysis.clarity_score),
        func.avg(PresentationAnalysis.confidence_score),
        func.avg(PresentationAnalysis.engagement_score),
    ).join(Presentation, Presentation.id == PresentationAnalysis.presentation_id).where(Presentation.user_id == current_user.id)
    clarity_score, confidence_score, engagement_score = db.execute(score_stmt).one()

    progress_stmt = select(Presentation, PresentationAnalysis).join(
        PresentationAnalysis, Presentation.id == PresentationAnalysis.presentation_id
    ).where(Presentation.user_id == current_user.id).order_by(Presentation.created_at)
    progress_rows = db.execute(progress_stmt).all()
    progress_history = [
        {
            "timestamp": presentation.created_at,
            "label": presentation.title,
            "presentation_score": round(sum(score for score in (analysis.clarity_score, analysis.confidence_score, analysis.engagement_score) if score is not None) / max(1, sum(score is not None for score in (analysis.clarity_score, analysis.confidence_score, analysis.engagement_score))), 1),
            "overall_score": round(sum(score for score in (analysis.clarity_score, analysis.confidence_score, analysis.engagement_score) if score is not None) / max(1, sum(score is not None for score in (analysis.clarity_score, analysis.confidence_score, analysis.engagement_score))), 1),
        }
        for presentation, analysis in progress_rows
    ]

    # Determine recommended focus areas
    recommended_areas = []
    if active_debates > 0:
        recommended_areas.append("Complete active debates")
    if completed_debates < 3:
        recommended_areas.append("Practice more debates")
    if total_presentations < 1:
        recommended_areas.append("Upload presentations for analysis")

    return UserPerformanceReport(
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_email=current_user.email,
        report_generated_at=datetime.now(timezone.utc),
        debate_stats=DebateStatistics(
            total_debates=total_debates,
            completed_debates=completed_debates,
            active_debates=active_debates,
            average_duration_minutes=30.0,  # Placeholder
            most_common_topic=None,
            win_rate=0.5,  # Placeholder
        ),
        presentation_stats=PresentationStatistics(
            total_presentations=total_presentations,
            analyzed_presentations=analyzed_presentations,
            average_clarity_score=clarity_score,
            average_confidence_score=confidence_score,
            average_engagement_score=engagement_score,
        ),
        recent_skill_progress=[],
        progress_history=progress_history,
        recommended_focus_areas=recommended_areas,
        overall_progress_percentage=min(100.0, (completed_debates * 10) + (total_presentations * 5)),
    )


@router.get("/dashboard/activity-log", response_model=list[ActivityLog])
def get_activity_log(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    days: int = 7,
) -> list[ActivityLog]:
    """Get user activity log for the last N days."""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Get recent debates
    stmt = (
        select(DebateSession)
        .where((DebateSession.user_id == current_user.id) & (DebateSession.created_at >= cutoff_date))
        .order_by(DebateSession.created_at.desc())
        .limit(10)
    )
    result = db.execute(stmt)
    debates = result.scalars().all()

    # Get recent presentations
    stmt = (
        select(Presentation)
        .where((Presentation.user_id == current_user.id) & (Presentation.created_at >= cutoff_date))
        .order_by(Presentation.created_at.desc())
        .limit(10)
    )
    result = db.execute(stmt)
    presentations = result.scalars().all()

    activities = []
    for debate in debates:
        activities.append(
            ActivityLog(
                timestamp=debate.created_at,
                activity_type="debate",
                description=f"Created debate: {debate.title}",
                details=f"Topic: {debate.topic[:50]}",
            )
        )

    for presentation in presentations:
        activities.append(
            ActivityLog(
                timestamp=presentation.created_at,
                activity_type="presentation",
                description=f"Uploaded presentation: {presentation.title}",
                details=presentation.file_name,
            )
        )

    # Sort by timestamp descending
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    return activities[:20]


@router.get("/me/recommendations")
def get_recommendations(current_user: User = Depends(get_current_user)) -> dict:
    """Return personalized recommendations for the current learner."""
    weak_areas = [
        "Rebuttal strength",
        "Confidence under pressure",
        "Evidence quality",
    ]

    recommendations = [
        "Practice a 10-minute rebuttal drill using the strongest objection to your argument.",
        "Add one concrete example and one statistic to each closing statement.",
        "Record a 60-second answer and review pacing and filler words.",
    ]

    practice_plan = [
        "Spend 5 minutes mapping the strongest objection to your topic.",
        "Write a 30-second rebuttal that starts with agreement, then provides a sharper counterpoint.",
        "End with a clean conclusion tied directly to evidence and impact.",
    ]

    return {
        "user_id": current_user.id,
        "weak_areas": weak_areas,
        "recommendations": recommendations,
        "practice_plan": practice_plan,
        "summary": "Your biggest opportunities are stronger rebuttals, clearer evidence, and more confident delivery.",
    }


@router.get("/me/recommendations")
def get_recommendations(current_user: User = Depends(get_current_user)) -> dict:
    """Return the current learner's personalized recommendations and practice plan."""
    weak_areas = [
        "Rebuttal strength",
        "Confidence under pressure",
        "Evidence quality",
    ]

    recommendations = [
        "Practice a 10-minute rebuttal drill using the strongest objection to your argument.",
        "Add one concrete example and one statistic to each closing statement.",
        "Record a 60-second answer and review pacing and filler words.",
    ]

    practice_plan = [
        "Spend 5 minutes mapping the strongest objection to your topic.",
        "Write a 30-second rebuttal that starts with agreement, then provides a sharper counterpoint.",
        "End with a clean conclusion tied directly to evidence and impact.",
    ]

    return {
        "user_id": current_user.id,
        "weak_areas": weak_areas,
        "recommendations": recommendations,
        "practice_plan": practice_plan,
        "summary": "Your biggest opportunities are stronger rebuttals, clearer evidence, and more confident delivery.",
    }



@router.get("/admin/metrics", response_model=AdminDashboardMetrics)
def get_admin_metrics(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminDashboardMetrics:
    """Get admin dashboard metrics (admin only)."""
    from app.models.models import RoleEnum

    if current_user.role != RoleEnum.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    # Get total users
    stmt = select(func.count(User.id))
    result = db.execute(stmt)
    total_users = result.scalar() or 0

    # Get active users this week
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    stmt = select(func.count(func.distinct(DebateSession.user_id))).where(
        DebateSession.created_at >= week_ago
    )
    result = db.execute(stmt)
    active_users = result.scalar() or 0

    # Get debate stats
    stmt = select(func.count(DebateSession.id))
    result = db.execute(stmt)
    total_debates = result.scalar() or 0

    stmt = select(func.count(DebateSession.id)).where(DebateSession.status == DebateStatus.COMPLETED.value)
    result = db.execute(stmt)
    completed_debates = result.scalar() or 0

    # Get presentation stats
    stmt = select(func.count(Presentation.id))
    result = db.execute(stmt)
    total_presentations = result.scalar() or 0

    return AdminDashboardMetrics(
        total_users=total_users,
        active_users_this_week=active_users,
        total_debates=total_debates,
        completed_debates=completed_debates,
        total_presentations=total_presentations,
        average_user_debates=total_debates / total_users if total_users > 0 else 0,
        average_user_presentations=total_presentations / total_users if total_users > 0 else 0,
    )


@router.get("/admin/user/{user_id}/report", response_model=UserPerformanceReport)
def get_user_report_admin(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserPerformanceReport:
    """Get performance report for any user (admin only)."""
    from app.models.models import RoleEnum

    if current_user.role != RoleEnum.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    stmt = select(User).where(User.id == user_id)
    result = db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Get debate statistics
    stmt = select(func.count(DebateSession.id)).where(DebateSession.user_id == user_id)
    result = db.execute(stmt)
    total_debates = result.scalar() or 0

    stmt = select(func.count(DebateSession.id)).where(
        (DebateSession.user_id == user_id) & (DebateSession.status == DebateStatus.COMPLETED.value)
    )
    result = db.execute(stmt)
    completed_debates = result.scalar() or 0

    stmt = select(func.count(DebateSession.id)).where(
        (DebateSession.user_id == user_id) & (DebateSession.status == DebateStatus.ACTIVE.value)
    )
    result = db.execute(stmt)
    active_debates = result.scalar() or 0

    # Get presentation statistics
    stmt = select(func.count(Presentation.id)).where(Presentation.user_id == user_id)
    result = db.execute(stmt)
    total_presentations = result.scalar() or 0

    stmt = select(func.count(Presentation.id)).where(
        (Presentation.user_id == user_id) & (Presentation.status == "ANALYZED")
    )
    result = db.execute(stmt)
    analyzed_presentations = result.scalar() or 0

    return UserPerformanceReport(
        user_id=user_id,
        user_name=user.full_name,
        user_email=user.email,
        report_generated_at=datetime.now(timezone.utc),
        debate_stats=DebateStatistics(
            total_debates=total_debates,
            completed_debates=completed_debates,
            active_debates=active_debates,
            average_duration_minutes=30.0,
            most_common_topic=None,
            win_rate=0.5,
        ),
        presentation_stats=PresentationStatistics(
            total_presentations=total_presentations,
            analyzed_presentations=analyzed_presentations,
            average_clarity_score=None,
            average_confidence_score=None,
            average_engagement_score=None,
        ),
        recent_skill_progress=[],
        progress_history=[],
        recommended_focus_areas=[],
        overall_progress_percentage=min(100.0, (completed_debates * 10) + (total_presentations * 5)),
    )
