"""Dashboards and real-time analytics.

Two layers live here on purpose:

1. `GET /overview` (plus `/roster` and `/learner/{id}/overview`) is the new
   real-time analytics API. Every role gets the SAME response envelope -
   kpis + series + tables + insights - so the frontend renders one generic
   layout and a new role never needs a UI change.
2. The four original per-role endpoints are kept as thin wrappers over the same
   analytics service so nothing that already calls them breaks. They now return
   computed values instead of the `None`/`[]` placeholders they used to.

Access rules:
- Learner sees only their own analytics.
- Debate Coach / Educator see cohort analytics and may drill into any learner.
- Administrator sees platform analytics and may view any role via `?as_role=`.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user, require_role
from services import analytics_service
import models
import schemas


router = APIRouter(prefix="/api/v1/dashboards", tags=["Dashboard & Analytics"])

STAFF_ROLES = ["Debate Coach", "Educator", "Administrator"]


def _assert_can_view(user_id: int, current_user: models.User) -> None:
    """Own dashboard always allowed; staff may view any learner's dashboard."""
    if user_id == current_user.id:
        return
    if current_user.role in STAFF_ROLES:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You can only access your own dashboard.",
    )


def _load_learner(user_id: int, db: Session) -> models.User:
    learner = db.query(models.User).filter(models.User.id == user_id).first()
    if not learner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} was not found.")
    return learner


# ---------------------------------------------------------------------------
# Real-time analytics
# ---------------------------------------------------------------------------
@router.get("/overview", response_model=schemas.AnalyticsOverviewResponse)
def get_analytics_overview(
    as_role: Optional[str] = Query(
        default=None,
        description="Administrators only: render another role's view without changing account role.",
    ),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Live analytics for the caller's role. Poll this endpoint to refresh."""
    if as_role and current_user.role != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an Administrator can request another role's analytics view.",
        )
    return analytics_service.build_overview(db, current_user, as_role=as_role)


@router.get("/roster", response_model=schemas.RosterResponse)
def get_learner_roster(
    current_user: models.User = Depends(require_role(STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    """Learner roster with live aggregates, for staff drill-down."""
    return analytics_service.build_roster(db, current_user)


@router.get("/learner/{user_id}/overview", response_model=schemas.AnalyticsOverviewResponse)
def get_learner_overview(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """A specific learner's analytics. Learners may only request their own id."""
    _assert_can_view(user_id, current_user)
    return analytics_service.learner_overview_for(db, _load_learner(user_id, db))


# ---------------------------------------------------------------------------
# Original per-role endpoints, now backed by the analytics service
# ---------------------------------------------------------------------------
@router.get("/learner/{user_id}")
def get_learner_dashboard(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_can_view(user_id, current_user)
    overview = analytics_service.learner_overview_for(db, _load_learner(user_id, db))
    detail = overview["detail"]
    trend = next((s for s in overview["series"] if s["key"] == "score_trend"), {"points": []})
    fallacies = next((s for s in overview["series"] if s["key"] == "fallacy_breakdown"), {"points": []})
    return {
        "role": overview["role"],
        "user_id": user_id,
        "total_debates_completed": detail["sessions_completed"],
        "average_overall_score": next((k["value"] for k in overview["kpis"] if k["key"] == "average_overall_score"), None),
        "recent_performance_trend": [point["value"] for point in trend["points"][-5:]],
        "top_fallacy_detected": fallacies["points"][0]["label"] if fallacies["points"] else None,
        "recommended_exercises": overview["insights"],
        "generated_at": overview["generated_at"],
    }


@router.get("/coach/{user_id}")
def get_coach_dashboard(
    user_id: int,
    current_user: models.User = Depends(require_role(["Debate Coach", "Administrator"])),
    db: Session = Depends(get_db),
):
    _assert_can_view(user_id, current_user)
    overview = analytics_service.build_overview(db, current_user, as_role="Debate Coach")
    detail = overview["detail"]
    gaps = next((s for s in overview["series"] if s["key"] == "fallacy_breakdown"), {"points": []})
    return {
        "role": current_user.role,
        "assigned_students_count": detail["roster_size"],
        "top_performers": detail["top_performers"],
        "class_skill_gaps": [point["label"] for point in gaps["points"][:5]],
        "pending_evaluations": detail["pending_evaluations"],
        "cohort_average": detail["cohort_average"],
        "generated_at": overview["generated_at"],
    }


@router.get("/educator/{user_id}")
def get_educator_dashboard(
    user_id: int,
    current_user: models.User = Depends(require_role(["Educator", "Administrator"])),
    db: Session = Depends(get_db),
):
    _assert_can_view(user_id, current_user)
    overview = analytics_service.build_overview(db, current_user, as_role="Educator")
    detail = overview["detail"]
    return {
        "role": current_user.role,
        "active_classes": detail["active_classes"],
        "total_enrolled_students": detail["total_enrolled_students"],
        "average_class_score": detail["average_class_score"],
        "debate_topics_assigned": detail["debate_topics_assigned"],
        "generated_at": overview["generated_at"],
    }


@router.get("/admin")
def get_admin_dashboard(
    current_user: models.User = Depends(require_role(["Administrator"])),
    db: Session = Depends(get_db),
):
    overview = analytics_service.build_overview(db, current_user, as_role="Administrator")
    detail = overview["detail"]
    return {
        "role": current_user.role,
        "platform_users_total": detail["platform_users_total"],
        "active_ai_agents": detail["active_ai_agents"],
        "agents": detail["agents"],
        "llm_api_health": detail["llm_api_health"],
        "system_latency_ms": overview["query_latency_ms"],
        "uptime_hours": detail["uptime_hours"],
        "sessions_total": detail["sessions_total"],
        "simulation_turns_total": detail["simulation_turns_total"],
        "generated_at": overview["generated_at"],
    }
