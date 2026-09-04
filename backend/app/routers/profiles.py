"""
User Profile & Skill Management endpoints (spec section 2).
"""
import re
from typing import List, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from app.core import supabase_client
from app.core.security import get_current_user, get_verified_user

router = APIRouter(prefix="/profiles", tags=["profiles"])

VALID_ROLES = {"learner", "debate_coach", "educator", "admin"}

# 3-20 characters, must start with a letter, letters/numbers/underscore
# only. A format most people already expect from every other site
# that has usernames.
USERNAME_PATTERN = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]{2,19}$")


def _validate_username_format(v: Optional[str]) -> Optional[str]:
    if v is None or v == "":
        return None
    if not USERNAME_PATTERN.match(v):
        raise ValueError(
            "Username must be 3-20 characters, start with a letter, and contain "
            "only letters, numbers, and underscores."
        )
    return v


def _raise_clean_username_conflict(e: requests.exceptions.HTTPError):
    """
    A duplicate username hits Postgres's unique index and PostgREST
    surfaces it as a raw constraint-violation error - this turns that
    into the same clean, friendly 409 a person would expect, instead
    of a confusing raw database error reaching the frontend.
    """
    body = e.response.text.lower() if e.response is not None else ""
    if e.response is not None and e.response.status_code in (409, 400) and "username" in body:
        raise HTTPException(status_code=409, detail="That username is already taken.")
    raise


class ProfileCreate(BaseModel):
    full_name: str
    role: str = "learner"
    experience_level: Optional[str] = "Beginner"
    username: Optional[str] = None

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"role must be one of {sorted(VALID_ROLES)}")
        return v

    @field_validator("username")
    @classmethod
    def username_format(cls, v: Optional[str]) -> Optional[str]:
        return _validate_username_format(v)


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    experience_level: Optional[str] = None
    preferred_debate_topics: Optional[List[str]] = None
    presentation_domains: Optional[List[str]] = None
    learning_goals: Optional[str] = None
    coaching_preferences: Optional[str] = None
    participate_in_comparison: Optional[bool] = None
    username: Optional[str] = None

    @field_validator("username")
    @classmethod
    def username_format(cls, v: Optional[str]) -> Optional[str]:
        return _validate_username_format(v)


@router.post("/me")
def create_profile(body: ProfileCreate, user: dict = Depends(get_verified_user)):
    """
    Called once, right after Supabase Auth sign-up - at this point the
    person has a valid JWT but no `profiles` row yet, so this uses
    get_verified_user (checks the token only) rather than
    get_current_user (which also requires an existing profile).
    """
    data = {
        "id": user["id"],
        "full_name": body.full_name,
        "role": body.role,
        "experience_level": body.experience_level,
    }
    if body.username:
        data["username"] = body.username

    try:
        return supabase_client.db_insert("profiles", data)
    except requests.exceptions.HTTPError as e:
        _raise_clean_username_conflict(e)


@router.get("/me")
def get_my_profile(user: dict = Depends(get_current_user)):
    return user["profile"]


@router.patch("/me")
def update_my_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        return user["profile"]
    try:
        return supabase_client.db_update("profiles", {"id": user["profile"]["id"]}, updates)
    except requests.exceptions.HTTPError as e:
        _raise_clean_username_conflict(e)


@router.get("/search")
def search_by_username(username: str, user: dict = Depends(get_current_user)):
    """
    Segment 22 - foundational for Segment 23's "invite a specific
    person to debate" feature. Deliberately an exact-match lookup, not
    a partial/fuzzy search: this is meant to find one specific person
    you already know the username of, not a browsable directory that
    could be scraped to enumerate every user on the platform. Returns
    only minimal public fields, never email or anything else private.
    """
    matches = supabase_client.db_select(
        "profiles",
        params={"username": f"eq.{username}", "select": "id,full_name,username,role"},
    )
    if not matches:
        raise HTTPException(status_code=404, detail="No user found with that username.")
    return matches[0]
