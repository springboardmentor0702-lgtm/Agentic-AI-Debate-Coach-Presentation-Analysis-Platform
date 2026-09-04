"""
Agentic Orchestration Layer endpoints (Segment 5).
"""
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import supabase_client
from app.core.security import get_current_user
from app.services import notification_service
from app.services.case_review_agent import run_case_review

logger = logging.getLogger("case_review")
router = APIRouter(prefix="/case-review", tags=["case-review"])


class CaseReviewRequest(BaseModel):
    text: str
    topic: Optional[str] = None


class CaseReviewResponse(BaseModel):
    id: Optional[str] = None
    input_text: Optional[str] = None
    topic: Optional[str] = None
    tools_run: List[str]
    argument_analysis: Optional[dict] = None
    fallacy_detection: Optional[dict] = None
    counterarguments: Optional[dict] = None
    synthesis: str


@router.post("/run", response_model=CaseReviewResponse)
def run(body: CaseReviewRequest, user: dict = Depends(get_current_user)):
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=422, detail="Text cannot be empty.")

    try:
        state = run_case_review(body.text, body.topic)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="The reasoning engine returned something we couldn't parse. Try again.",
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Case review agent failed")
        raise HTTPException(status_code=502, detail=f"Case review failed: {e}")

    response = {
        "tools_run": state.get("tools_to_run", []),
        "argument_analysis": state.get("argument_analysis"),
        "fallacy_detection": state.get("fallacy_detection"),
        "counterarguments": state.get("counterarguments"),
        "synthesis": state.get("synthesis", ""),
        "input_text": body.text,
        "topic": body.topic,
    }

    try:
        saved = supabase_client.db_insert(
            "case_reviews",
            {
                "user_id": user["profile"]["id"],
                "input_text": body.text,
                "topic": body.topic,
                "tools_run": response["tools_run"],
                "argument_analysis": response["argument_analysis"],
                "fallacy_detection": response["fallacy_detection"],
                "counterarguments": response["counterarguments"],
                "synthesis": response["synthesis"],
            },
        )
        response["id"] = saved.get("id")
        notification_service.check_first_time_milestone(user["profile"]["id"], "case_reviews")
    except Exception:  # noqa: BLE001
        logger.exception("Failed to save case review to history")

    return response


@router.get("/history")
def get_history(limit: int = 20, user: dict = Depends(get_current_user)):
    return supabase_client.db_select(
        "case_reviews",
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
        "case_reviews",
        params={"id": f"eq.{item_id}", "user_id": f"eq.{user['profile']['id']}"},
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Not found.")
    supabase_client.db_delete("case_reviews", {"id": item_id})
    return {"deleted": True}
