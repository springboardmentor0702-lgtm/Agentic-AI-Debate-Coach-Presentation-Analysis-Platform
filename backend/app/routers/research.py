"""
Agentic Debate Prep Research Assistant endpoints (Segment 24).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional

from app.core import supabase_client
from app.core.security import get_current_user
from app.services.research_agent import run_research

router = APIRouter(prefix="/research", tags=["research"])


class RunResearchRequest(BaseModel):
    topic: str
    position: Optional[str] = None

    @field_validator("topic")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Topic can't be empty.")
        return v


@router.post("/prepare")
def prepare_research(body: RunResearchRequest, user: dict = Depends(get_current_user)):
    try:
        result = run_research(body.topic, body.position)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Could not complete the research: {e}")

    return supabase_client.db_insert(
        "research_briefs",
        {
            "user_id": user["profile"]["id"],
            "topic": body.topic,
            "position": body.position,
            "brief": result["brief"],
            "queries_used": result["queries_used"],
            "sources": result["sources"],
            "iterations": result["iterations"],
        },
    )


@router.get("/history")
def get_history(limit: int = 30, user: dict = Depends(get_current_user)):
    return supabase_client.db_select(
        "research_briefs",
        params={
            "user_id": f"eq.{user['profile']['id']}",
            "select": "*",
            "order": "created_at.desc",
            "limit": str(limit),
        },
    )


@router.delete("/history/{brief_id}")
def delete_brief(brief_id: str, user: dict = Depends(get_current_user)):
    matches = supabase_client.db_select(
        "research_briefs",
        params={"id": f"eq.{brief_id}", "user_id": f"eq.{user['profile']['id']}"},
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Research brief not found.")
    supabase_client.db_delete("research_briefs", {"id": brief_id})
    return {"deleted": True}
