"""
Argument Analysis Engine endpoints (spec section 4).
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
from app.services.argument_analysis_service import analyze_argument

logger = logging.getLogger("arguments")
router = APIRouter(prefix="/arguments", tags=["arguments"])


class AnalyzeRequest(BaseModel):
    text: str
    topic: Optional[str] = None


class Claim(BaseModel):
    claim: str
    type: str
    evidence: List[str] = []
    evidence_strength: str
    note: str = ""


class AnalyzeResponse(BaseModel):
    id: Optional[str] = None
    input_text: Optional[str] = None
    topic: Optional[str] = None
    claims: List[Claim]
    scores: dict
    overall_score: float
    strengths: List[str]
    weaknesses: List[str]
    summary_feedback: str


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest, user: dict = Depends(get_current_user)):
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=422, detail="Argument text cannot be empty.")

    try:
        result = analyze_argument(body.text, body.topic)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="The reasoning engine returned something we couldn't parse. Try again.",
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Argument analysis failed")
        raise HTTPException(status_code=502, detail=f"Argument analysis failed: {e}")

    result["input_text"] = body.text
    result["topic"] = body.topic

    # Persist so this becomes debate/skill history (spec sections 2 & 11).
    # A storage hiccup shouldn't cost the user the analysis they just got.
    try:
        saved = supabase_client.db_insert(
            "argument_analyses",
            {
                "user_id": user["profile"]["id"],
                "input_text": body.text,
                "topic": body.topic,
                "claims": result["claims"],
                "scores": result["scores"],
                "overall_score": result["overall_score"],
                "strengths": result["strengths"],
                "weaknesses": result["weaknesses"],
                "summary_feedback": result["summary_feedback"],
            },
        )
        result["id"] = saved.get("id")
        notification_service.check_first_time_milestone(user["profile"]["id"], "argument_analyses")
        performance_scoring_service.record_snapshot(user["profile"]["id"])
    except Exception:  # noqa: BLE001
        logger.exception("Failed to save argument analysis to history")

    return result


@router.get("/history")
def get_history(limit: int = 20, user: dict = Depends(get_current_user)):
    return supabase_client.db_select(
        "argument_analyses",
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
        "argument_analyses",
        params={"id": f"eq.{item_id}", "user_id": f"eq.{user['profile']['id']}"},
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Not found.")
    supabase_client.db_delete("argument_analyses", {"id": item_id})
    return {"deleted": True}
