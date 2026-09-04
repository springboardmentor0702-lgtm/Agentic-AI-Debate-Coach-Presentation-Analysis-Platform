"""
Logical Fallacy Detection Engine endpoints (spec section 5).
"""
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import supabase_client
from app.core.security import get_current_user
from app.services import notification_service
from app.services import performance_scoring_service
from app.services.fallacy_detection_service import detect_fallacies

logger = logging.getLogger("fallacies")
router = APIRouter(prefix="/fallacies", tags=["fallacies"])


class DetectRequest(BaseModel):
    text: str
    topic: Optional[str] = None


class FallacyItem(BaseModel):
    fallacy_type: str
    quote: str
    explanation: str
    correction_suggestion: str


class DetectResponse(BaseModel):
    id: Optional[str] = None
    input_text: Optional[str] = None
    topic: Optional[str] = None
    fallacies_detected: List[FallacyItem]
    credibility_score: float
    reasoning_analysis: str


@router.post("/detect", response_model=DetectResponse)
def detect(body: DetectRequest, user: dict = Depends(get_current_user)):
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=422, detail="Text cannot be empty.")

    try:
        result = detect_fallacies(body.text, body.topic)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="The reasoning engine returned something we couldn't parse. Try again.",
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Fallacy detection failed")
        raise HTTPException(status_code=502, detail=f"Fallacy detection failed: {e}")

    result["input_text"] = body.text
    result["topic"] = body.topic

    try:
        saved = supabase_client.db_insert(
            "fallacy_detections",
            {
                "user_id": user["profile"]["id"],
                "input_text": body.text,
                "topic": body.topic,
                "fallacies_detected": result["fallacies_detected"],
                "credibility_score": result["credibility_score"],
                "reasoning_analysis": result["reasoning_analysis"],
            },
        )
        result["id"] = saved.get("id")
        notification_service.check_first_time_milestone(user["profile"]["id"], "fallacy_detections")
        performance_scoring_service.record_snapshot(user["profile"]["id"])
    except Exception:  # noqa: BLE001
        logger.exception("Failed to save fallacy detection to history")

    return result


@router.get("/history")
def get_history(limit: int = 20, user: dict = Depends(get_current_user)):
    return supabase_client.db_select(
        "fallacy_detections",
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
        "fallacy_detections",
        params={"id": f"eq.{item_id}", "user_id": f"eq.{user['profile']['id']}"},
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Not found.")
    supabase_client.db_delete("fallacy_detections", {"id": item_id})
    return {"deleted": True}
