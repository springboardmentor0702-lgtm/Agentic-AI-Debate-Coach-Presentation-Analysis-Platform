"""
Goal Management endpoints (spec sections 2 & 11).
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from app.core import supabase_client
from app.core.security import get_current_user
from app.services.goal_service import METRIC_LABELS, create_goal, list_goals

router = APIRouter(prefix="/goals", tags=["goals"])


class GoalCreate(BaseModel):
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


class GoalUpdate(BaseModel):
    target_value: Optional[float] = None
    deadline: Optional[date] = None

    @field_validator("target_value")
    @classmethod
    def target_must_be_in_range(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (0 < v <= 10):
            raise ValueError("target_value must be between 0 and 10")
        return v


@router.get("")
def get_goals(user: dict = Depends(get_current_user)):
    return list_goals(user["profile"]["id"])


@router.post("")
def add_goal(body: GoalCreate, user: dict = Depends(get_current_user)):
    return create_goal(
        user["profile"]["id"],
        body.metric,
        body.target_value,
        body.deadline.isoformat() if body.deadline else None,
    )


@router.patch("/{goal_id}")
def update_goal(goal_id: str, body: GoalUpdate, user: dict = Depends(get_current_user)):
    matches = supabase_client.db_select(
        "goals", params={"id": f"eq.{goal_id}", "user_id": f"eq.{user['profile']['id']}"}
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Goal not found.")

    updates = {}
    if body.target_value is not None:
        updates["target_value"] = body.target_value
        # Raising (or lowering) the target can un-achieve a goal that was
        # previously marked achieved - reset it to active so the next
        # GET /goals re-evaluates it fresh against the new bar, instead
        # of leaving a stale "Achieved" badge on a goal that no longer
        # actually meets its target.
        updates["status"] = "active"
        updates["achieved_at"] = None
    if body.deadline is not None:
        updates["deadline"] = body.deadline.isoformat()

    if not updates:
        return matches[0]
    return supabase_client.db_update("goals", {"id": goal_id}, updates)


@router.delete("/{goal_id}")
def delete_goal(goal_id: str, user: dict = Depends(get_current_user)):
    matches = supabase_client.db_select(
        "goals", params={"id": f"eq.{goal_id}", "user_id": f"eq.{user['profile']['id']}"}
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Goal not found.")
    supabase_client.db_delete("goals", {"id": goal_id})
    return {"deleted": True}
