"""
Recommendation & Coaching Engine endpoints (spec section 10).
"""
import json
import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core import supabase_client
from app.core.security import get_current_user
from app.services import notification_service
from app.services.coaching_service import generate_coaching_plan

logger = logging.getLogger("coaching")
router = APIRouter(prefix="/coaching", tags=["coaching"])


@router.post("/plan")
def create_plan(user: dict = Depends(get_current_user)):
    try:
        result = generate_coaching_plan(user["profile"]["id"])
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="The reasoning engine returned something we couldn't parse. Try again.",
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Coaching plan generation failed")
        raise HTTPException(status_code=502, detail=f"Coaching plan generation failed: {e}")

    try:
        saved = supabase_client.db_insert(
            "coaching_plans",
            {
                "user_id": user["profile"]["id"],
                "recommendations": result["recommendations"],
                "skill_development_plan": result["skill_development_plan"],
                "learning_path": result["learning_path"],
                "summary_feedback": result["summary_feedback"],
                "performance_snapshot": result["performance_snapshot"],
                "knowledge_used": result["knowledge_used"],
            },
        )
        result["id"] = saved.get("id")
    except Exception:  # noqa: BLE001
        logger.exception("Failed to save coaching plan to history")

    notification_service.create_notification(
        user["profile"]["id"],
        "coaching_ready",
        "Your coaching plan is ready",
        result.get("summary_feedback", "")[:140] or "A new personalized plan is waiting for you.",
        "/coaching",
    )

    return result


@router.get("/history")
def get_history(limit: int = 10, user: dict = Depends(get_current_user)):
    return supabase_client.db_select(
        "coaching_plans",
        params={
            "user_id": f"eq.{user['profile']['id']}",
            "select": "*",
            "order": "created_at.desc",
            "limit": str(limit),
        },
    )


@router.delete("/history/{item_id}")
def delete_item(item_id: str, user: dict = Depends(get_current_user)):
    matches = supabase_client.db_select(
        "coaching_plans",
        params={"id": f"eq.{item_id}", "user_id": f"eq.{user['profile']['id']}"},
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Not found.")
    supabase_client.db_delete("coaching_plans", {"id": item_id})
    return {"deleted": True}
