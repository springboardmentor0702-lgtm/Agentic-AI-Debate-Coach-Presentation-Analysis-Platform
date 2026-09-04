"""
Dashboard & Analytics endpoints (spec section 11).

/learner/activity is open to anyone logged in (it's their own data).
Everything else in this file is a cross-user view, gated by role.
"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from typing import List, Optional

from app.core import supabase_client
from app.core.constants import VALID_ROLES
from app.core.llm_client import get_llm_stats
from app.core.security import get_current_user, require_role
from app.routers.profiles import ProfileUpdate
from app.services import coach_service
from app.services.goal_service import METRIC_LABELS
from app.services.dashboard_service import (
    get_all_learners_overview_async,
    get_all_users,
    get_platform_overview_async,
    get_recent_activity_async,
    update_user_role as set_user_role,
)
from app.services.settings_service import get_comparison_min_pool_size, set_setting

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


@router.get("/learner/activity")
async def learner_activity(limit: int = 20, user: dict = Depends(get_current_user)):
    return (await get_recent_activity_async(user["profile"]["id"]))[:limit]


@router.get("/coach/students")
async def coach_students(user: dict = Depends(require_role("debate_coach", "educator", "admin"))):
    """
    Shared by Coach and Educator roles (see module docstring on the
    service for why there's one shared view, not two).
    """
    return await get_all_learners_overview_async()


def _require_learner(learner_id: str) -> dict:
    """
    Shared by every coach/educator endpoint below that targets one
    specific learner - confirms the id genuinely belongs to a learner
    account, not e.g. another coach or admin's profile, before doing
    anything with it.
    """
    matches = supabase_client.db_select(
        "profiles", params={"id": f"eq.{learner_id}", "role": "eq.learner"}
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Learner not found.")
    return matches[0]


@router.get("/coach/students/{learner_id}")
async def coach_view_learner(
    learner_id: str, user: dict = Depends(require_role("debate_coach", "educator", "admin"))
):
    profile = _require_learner(learner_id)
    detail = await coach_service.get_learner_detail(learner_id)
    feedback = coach_service.get_feedback_for_learner(learner_id)
    return {**detail, "profile": profile, "feedback": feedback}


class LearnerFeedbackRequest(BaseModel):
    item_type: str
    item_id: str
    feedback_text: str

    @field_validator("feedback_text")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Feedback can't be empty.")
        return v


@router.post("/coach/students/{learner_id}/feedback")
def coach_leave_feedback(
    learner_id: str,
    body: LearnerFeedbackRequest,
    user: dict = Depends(require_role("debate_coach", "educator", "admin")),
):
    _require_learner(learner_id)
    return coach_service.leave_feedback(
        user["profile"]["id"], learner_id, body.item_type, body.item_id, body.feedback_text
    )


class AssignGoalRequest(BaseModel):
    metric: str
    target_value: float
    deadline: Optional[date] = None

    @field_validator("metric")
    @classmethod
    def metric_must_be_valid(cls, v: str) -> str:
        if v not in METRIC_LABELS:
            raise ValueError(f"metric must be one of {sorted(METRIC_LABELS)}")
        return v

    @field_validator("target_value")
    @classmethod
    def target_must_be_in_range(cls, v: float) -> float:
        if not (0 < v <= 10):
            raise ValueError("target_value must be between 0 and 10")
        return v


@router.post("/coach/students/{learner_id}/goals")
def coach_assign_goal(
    learner_id: str,
    body: AssignGoalRequest,
    user: dict = Depends(require_role("debate_coach", "educator", "admin")),
):
    _require_learner(learner_id)
    return coach_service.assign_goal(
        user["profile"]["id"],
        learner_id,
        body.metric,
        body.target_value,
        body.deadline.isoformat() if body.deadline else None,
    )


class SuggestTopicRequest(BaseModel):
    topic: str

    @field_validator("topic")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Topic can't be empty.")
        return v


@router.post("/coach/students/{learner_id}/suggest-topic")
def coach_suggest_topic(
    learner_id: str,
    body: SuggestTopicRequest,
    user: dict = Depends(require_role("debate_coach", "educator", "admin")),
):
    _require_learner(learner_id)
    coach_service.suggest_topic(user["profile"]["id"], learner_id, body.topic)
    return {"sent": True}


@router.get("/coach/class-trend")
async def coach_class_trend(user: dict = Depends(require_role("debate_coach", "educator", "admin"))):
    return await coach_service.get_class_trend()


@router.get("/admin/overview")
async def admin_overview(user: dict = Depends(require_role("admin"))):
    return await get_platform_overview_async()


@router.get("/admin/users")
def admin_users(user: dict = Depends(require_role("admin"))):
    return get_all_users()


@router.get("/admin/llm-stats")
def admin_llm_stats(user: dict = Depends(require_role("admin"))):
    """
    "AI model monitoring" - a literal named item from the original
    spec's Admin Dashboard module. Simple in-memory counters (see
    llm_client.py) tracking how often each provider has succeeded or
    had to fall back / fail since the backend last restarted.
    """
    return get_llm_stats()


@router.get("/admin/settings")
async def admin_get_settings(user: dict = Depends(require_role("admin"))):
    return {"comparison_min_pool_size": await get_comparison_min_pool_size()}


class UpdateSettingsRequest(BaseModel):
    comparison_min_pool_size: int

    @field_validator("comparison_min_pool_size")
    @classmethod
    def pool_size_must_be_reasonable(cls, v: int) -> int:
        if v < 2:
            raise ValueError(
                "comparison_min_pool_size must be at least 2 - a pool of 1 would only "
                "ever compare you to yourself, which is meaningless."
            )
        return v


@router.patch("/admin/settings")
async def admin_update_settings(
    body: UpdateSettingsRequest, user: dict = Depends(require_role("admin"))
):
    set_setting("comparison_min_pool_size", str(body.comparison_min_pool_size))
    return {"comparison_min_pool_size": body.comparison_min_pool_size}


class UpdateRoleRequest(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"role must be one of {sorted(VALID_ROLES)}")
        return v


@router.patch("/admin/users/{user_id}/role")
def update_user_role(
    user_id: str, body: UpdateRoleRequest, user: dict = Depends(require_role("admin"))
):
    """
    The proper way to create/promote admins from here on - the very
    first admin still has to be set manually in Supabase (nothing can
    call an admin-only endpoint before an admin exists), but every
    admin after that can be promoted through the app instead.
    """
    if user_id == user["profile"]["id"]:
        raise HTTPException(
            status_code=400,
            detail="You can't change your own role here - have another admin do it, or edit it directly in Supabase if you're the only admin.",
        )

    matches = supabase_client.db_select("profiles", params={"id": f"eq.{user_id}"})
    if not matches:
        raise HTTPException(status_code=404, detail="No user found with that id.")

    return set_user_role(user_id, body.role)


class CreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "learner"
    experience_level: Optional[str] = "Beginner"

    @field_validator("email")
    @classmethod
    def email_must_look_like_email(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Not a valid email address.")
        return v

    @field_validator("password")
    @classmethod
    def password_must_be_long_enough(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"role must be one of {sorted(VALID_ROLES)}")
        return v


@router.post("/admin/users")
def admin_create_user(body: CreateUserRequest, user: dict = Depends(require_role("admin"))):
    """
    Admin-provisioned account creation - bypasses normal self-signup.
    There's no email-sending set up in this project, so there's no
    invite email: the admin has to share the password with the person
    themselves, out-of-band, after creating the account here.
    """
    try:
        auth_user = supabase_client.create_auth_user(body.email, body.password)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Could not create the account: {e}")

    return supabase_client.db_insert(
        "profiles",
        {
            "id": auth_user["id"],
            "full_name": body.full_name,
            "role": body.role,
            "experience_level": body.experience_level,
        },
    )


@router.patch("/admin/users/{user_id}")
def admin_edit_user(
    user_id: str, body: ProfileUpdate, user: dict = Depends(require_role("admin"))
):
    """
    Edits any user's profile FIELDS (name, experience level, topics,
    etc.) - reuses the exact same model as the self-service edit
    (profiles.py's ProfileUpdate), just scoped to an arbitrary user_id
    instead of "me". Role changes stay on the dedicated /role endpoint
    above, which has its own self-protection guard - this endpoint
    deliberately doesn't touch role.
    """
    matches = supabase_client.db_select("profiles", params={"id": f"eq.{user_id}"})
    if not matches:
        raise HTTPException(status_code=404, detail="No user found with that id.")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        return matches[0]
    return supabase_client.db_update("profiles", {"id": user_id}, updates)


@router.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: str, user: dict = Depends(require_role("admin"))):
    """
    Real account deletion - removes the profile row AND the underlying
    Supabase Auth account, not just a role change. The profile row is
    deleted FIRST, then the auth account - removing the dependent row
    before the referenced one avoids any foreign-key ordering issues
    regardless of how the original schema's cascade rules were set up.
    """
    if user_id == user["profile"]["id"]:
        raise HTTPException(status_code=400, detail="You can't delete your own account here.")

    matches = supabase_client.db_select("profiles", params={"id": f"eq.{user_id}"})
    if not matches:
        raise HTTPException(status_code=404, detail="No user found with that id.")

    supabase_client.db_delete("profiles", {"id": user_id})
    try:
        supabase_client.delete_auth_user(user_id)
    except Exception:  # noqa: BLE001
        # The profile is already gone from the app's perspective - an
        # orphaned auth record is a minor cleanup issue, not worth
        # failing the whole delete operation over.
        pass

    return {"deleted": True}
