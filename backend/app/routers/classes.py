"""
Classes & Cohorts endpoints (Segment 21).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from app.core import supabase_client
from app.core.security import require_role
from app.services import class_service

router = APIRouter(prefix="/classes", tags=["classes"])


def _require_own_class(class_id: str, user: dict) -> dict:
    """
    Confirms the class exists AND belongs to the calling coach/educator
    - a coach must never be able to view or manage another coach's
    class. Admin is exempt from the ownership check, consistent with
    every other admin capability in this project.
    """
    params = {"id": f"eq.{class_id}"}
    if user["profile"]["role"] != "admin":
        params["created_by"] = f"eq.{user['profile']['id']}"

    matches = supabase_client.db_select("classes", params=params)
    if not matches:
        raise HTTPException(status_code=404, detail="Class not found.")
    return matches[0]


class CreateClassRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Class name can't be empty.")
        return v


@router.get("")
def list_classes(user: dict = Depends(require_role("debate_coach", "educator", "admin"))):
    return class_service.list_my_classes(user["profile"]["id"])


@router.post("")
def create_class(
    body: CreateClassRequest, user: dict = Depends(require_role("debate_coach", "educator", "admin"))
):
    return class_service.create_class(user["profile"]["id"], body.name)


@router.delete("/{class_id}")
def delete_class(class_id: str, user: dict = Depends(require_role("debate_coach", "educator", "admin"))):
    _require_own_class(class_id, user)
    class_service.delete_class(class_id)
    return {"deleted": True}


class AddMemberRequest(BaseModel):
    learner_id: str


@router.post("/{class_id}/members")
def add_member(
    class_id: str,
    body: AddMemberRequest,
    user: dict = Depends(require_role("debate_coach", "educator", "admin")),
):
    _require_own_class(class_id, user)
    matches = supabase_client.db_select(
        "profiles", params={"id": f"eq.{body.learner_id}", "role": "eq.learner"}
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Learner not found.")
    return class_service.add_member(class_id, body.learner_id)


@router.delete("/{class_id}/members/{learner_id}")
def remove_member(
    class_id: str,
    learner_id: str,
    user: dict = Depends(require_role("debate_coach", "educator", "admin")),
):
    _require_own_class(class_id, user)
    class_service.remove_member(class_id, learner_id)
    return {"removed": True}


@router.get("/{class_id}/roster")
async def get_roster(
    class_id: str, user: dict = Depends(require_role("debate_coach", "educator", "admin"))
):
    _require_own_class(class_id, user)
    return await class_service.get_class_roster(class_id)


@router.get("/{class_id}/trend")
async def get_trend(
    class_id: str, user: dict = Depends(require_role("debate_coach", "educator", "admin"))
):
    _require_own_class(class_id, user)
    return await class_service.get_class_trend(class_id)
