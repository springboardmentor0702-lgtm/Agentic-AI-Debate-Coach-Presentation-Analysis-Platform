"""
Presentation Analysis Engine endpoints (spec section 7).
"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import supabase_client
from app.core.security import get_current_user
from app.services import notification_service
from app.services import performance_scoring_service
from app.services.presentation_analysis_service import analyze_presentation

logger = logging.getLogger("presentation")
router = APIRouter(prefix="/presentation", tags=["presentation"])


class AnalyzeRequest(BaseModel):
    transcript: str
    duration_seconds: float
    topic: Optional[str] = None


@router.post("/analyze")
def analyze(body: AnalyzeRequest, user: dict = Depends(get_current_user)):
    if not body.transcript or not body.transcript.strip():
        raise HTTPException(
            status_code=422, detail="No speech was captured. Try recording again."
        )
    if body.duration_seconds <= 0:
        raise HTTPException(status_code=422, detail="Recording duration must be positive.")

    try:
        result = analyze_presentation(body.transcript, body.duration_seconds, body.topic)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="The reasoning engine returned something we couldn't parse. Try again.",
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Presentation analysis failed")
        raise HTTPException(status_code=502, detail=f"Presentation analysis failed: {e}")

    result["transcript"] = body.transcript
    result["topic"] = body.topic

    try:
        saved = supabase_client.db_insert(
            "presentation_analyses",
            {
                "user_id": user["profile"]["id"],
                "transcript": body.transcript,
                "topic": body.topic,
                "duration_seconds": body.duration_seconds,
                "pace": result["pace"],
                "filler_words": result["filler_words"],
                "scores": result["scores"],
                "overall_score": result["overall_score"],
                "strengths": result["strengths"],
                "improvements": result["improvements"],
                "summary_feedback": result["summary_feedback"],
            },
        )
        result["id"] = saved.get("id")
        notification_service.check_first_time_milestone(user["profile"]["id"], "presentation_analyses")
        performance_scoring_service.record_snapshot(user["profile"]["id"])
    except Exception:  # noqa: BLE001
        logger.exception("Failed to save presentation analysis to history")

    return result


@router.get("/history")
def get_history(limit: int = 20, user: dict = Depends(get_current_user)):
    return supabase_client.db_select(
        "presentation_analyses",
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
        "presentation_analyses",
        params={"id": f"eq.{item_id}", "user_id": f"eq.{user['profile']['id']}"},
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Not found.")
    supabase_client.db_delete("presentation_analyses", {"id": item_id})
    return {"deleted": True}
