"""
Counterargument Generation Engine endpoints (spec section 6).
"""
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import supabase_client
from app.core.security import get_current_user
from app.services import notification_service
from app.services.counterargument_service import generate_counterarguments

logger = logging.getLogger("counterarguments")
router = APIRouter(prefix="/counterarguments", tags=["counterarguments"])


class GenerateRequest(BaseModel):
    text: str
    topic: Optional[str] = None


class CounterargumentItem(BaseModel):
    type: str
    counterargument: str
    rationale: str = ""


class GenerateResponse(BaseModel):
    id: Optional[str] = None
    input_text: Optional[str] = None
    topic: Optional[str] = None
    counterarguments: List[CounterargumentItem]
    challenge_questions: List[str]
    alternative_perspectives: List[str]
    strategy_suggestions: List[str]


@router.post("/generate", response_model=GenerateResponse)
def generate(body: GenerateRequest, user: dict = Depends(get_current_user)):
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=422, detail="Argument text cannot be empty.")

    try:
        result = generate_counterarguments(body.text, body.topic)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="The reasoning engine returned something we couldn't parse. Try again.",
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Counterargument generation failed")
        raise HTTPException(status_code=502, detail=f"Counterargument generation failed: {e}")

    result["input_text"] = body.text
    result["topic"] = body.topic

    try:
        saved = supabase_client.db_insert(
            "counterarguments",
            {
                "user_id": user["profile"]["id"],
                "input_text": body.text,
                "topic": body.topic,
                "counterarguments": result["counterarguments"],
                "challenge_questions": result["challenge_questions"],
                "alternative_perspectives": result["alternative_perspectives"],
                "strategy_suggestions": result["strategy_suggestions"],
            },
        )
        result["id"] = saved.get("id")
        notification_service.check_first_time_milestone(user["profile"]["id"], "counterarguments")
    except Exception:  # noqa: BLE001
        logger.exception("Failed to save counterarguments to history")

    return result


@router.get("/history")
def get_history(limit: int = 20, user: dict = Depends(get_current_user)):
    return supabase_client.db_select(
        "counterarguments",
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
        "counterarguments",
        params={"id": f"eq.{item_id}", "user_id": f"eq.{user['profile']['id']}"},
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Not found.")
    supabase_client.db_delete("counterarguments", {"id": item_id})
    return {"deleted": True}
