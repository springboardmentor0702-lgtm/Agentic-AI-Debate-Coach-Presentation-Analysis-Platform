"""
Notification & Engagement System endpoints (spec section 12).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import supabase_client
from app.core.security import get_current_user, require_role
from app.services.notification_service import get_feed

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(user: dict = Depends(get_current_user)):
    feed = get_feed(user["profile"]["id"])
    unread_count = sum(1 for n in feed if not n["read"])
    return {"items": feed, "unread_count": unread_count}


@router.patch("/{notification_id}/read")
def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    matches = supabase_client.db_select(
        "notifications",
        params={"id": f"eq.{notification_id}", "user_id": f"eq.{user['profile']['id']}"},
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return supabase_client.db_update("notifications", {"id": notification_id}, {"read": True})


@router.post("/read-all")
def mark_all_read(user: dict = Depends(get_current_user)):
    supabase_client.db_update(
        "notifications", {"user_id": user["profile"]["id"]}, {"read": True}
    )
    return {"marked_all_read": True}


class AnnouncementCreate(BaseModel):
    title: str
    message: str


@router.post("/announcements")
def create_announcement(
    body: AnnouncementCreate, user: dict = Depends(require_role("admin"))
):
    return supabase_client.db_insert(
        "announcements",
        {"title": body.title, "message": body.message, "created_by": user["profile"]["id"]},
    )
