"""
Agentic Coaching Upgrade endpoints (Segment 25).

Deliberately a separate router/prefix from Segment 9's existing
Coaching Plan endpoints - additive, not a replacement, so the
original fixed pipeline keeps working exactly as it always has.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from app.core import supabase_client
from app.core.security import get_current_user
from app.services.coaching_agent import run_coaching_agent

router = APIRouter(prefix="/coaching-agent", tags=["coaching-agent"])


class AskRequest(BaseModel):
    question: str

    @field_validator("question")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Question can't be empty.")
        return v


@router.post("/ask")
def ask(body: AskRequest, user: dict = Depends(get_current_user)):
    try:
        result = run_coaching_agent(user["profile"]["id"], body.question)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Could not complete that coaching request: {e}")

    return supabase_client.db_insert(
        "coaching_agent_sessions",
        {
            "user_id": user["profile"]["id"],
            "question": body.question,
            "response": result["response"],
            "tools_used": result["tools_used"],
            "iterations": result["iterations"],
            "proposed_goal": result["proposed_goal"],
        },
    )


@router.get("/history")
def get_history(limit: int = 30, user: dict = Depends(get_current_user)):
    return supabase_client.db_select(
        "coaching_agent_sessions",
        params={
            "user_id": f"eq.{user['profile']['id']}",
            "select": "*",
            "order": "created_at.desc",
            "limit": str(limit),
        },
    )


@router.delete("/history/{session_id}")
def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    matches = supabase_client.db_select(
        "coaching_agent_sessions",
        params={"id": f"eq.{session_id}", "user_id": f"eq.{user['profile']['id']}"},
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Coaching session not found.")
    supabase_client.db_delete("coaching_agent_sessions", {"id": session_id})
    return {"deleted": True}
