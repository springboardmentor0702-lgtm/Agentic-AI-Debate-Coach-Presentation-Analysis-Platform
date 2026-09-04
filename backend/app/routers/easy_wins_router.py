"""
Easy Wins Bundle endpoints (Segment 26): practice streaks, the debate
topic library, and personal data export.
"""
import json
import random
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response

from app.core import supabase_client
from app.core.security import get_current_user
from app.services.streaks import get_streak_info

router = APIRouter(tags=["easy-wins"])


# --- Practice streaks ---


@router.get("/streaks/me")
def my_streak(user: dict = Depends(get_current_user)):
    return get_streak_info(user["profile"]["id"])


# --- Debate topic library ---


@router.get("/topics")
def list_topics(category: Optional[str] = None, user: dict = Depends(get_current_user)):
    params = {"select": "*", "order": "category.asc,topic.asc"}
    if category:
        params["category"] = f"eq.{category}"
    return supabase_client.db_select("debate_topics", params=params)


@router.get("/topics/categories")
def list_topic_categories(user: dict = Depends(get_current_user)):
    rows = supabase_client.db_select("debate_topics", params={"select": "category"})
    return sorted({r["category"] for r in rows})


@router.get("/topics/random")
def random_topic(category: Optional[str] = None, user: dict = Depends(get_current_user)):
    params = {"select": "*"}
    if category:
        params["category"] = f"eq.{category}"
    topics = supabase_client.db_select("debate_topics", params=params)
    if not topics:
        raise HTTPException(status_code=404, detail="No topics found for that category.")
    return random.choice(topics)


# --- Personal data export ---

EXPORT_TABLES = [
    "argument_analyses",
    "fallacy_detections",
    "counterarguments",
    "case_reviews",
    "presentation_analyses",
    "debate_rounds",
    "goals",
    "performance_snapshots",
    "coaching_agent_sessions",
    "research_briefs",
]


@router.get("/export/me")
def export_my_data(user: dict = Depends(get_current_user)):
    """
    Every table this account owns data in, gathered into one
    downloadable JSON file. Each table's own export failing
    independently doesn't block the rest - a data export should give
    you everything that's actually available, not fail all-or-nothing
    because one table had a hiccup.
    """
    user_id = user["profile"]["id"]
    data = {"profile": user["profile"], "exported_at": datetime.now(timezone.utc).isoformat()}

    for table in EXPORT_TABLES:
        try:
            data[table] = supabase_client.db_select(
                table, params={"user_id": f"eq.{user_id}", "select": "*"}
            )
        except Exception:  # noqa: BLE001
            data[table] = []

    # debate_sessions is special: a person can be either the creator
    # OR the invited opponent in a human-vs-human debate - a complete
    # export needs both, not just sessions they created.
    try:
        own_sessions = supabase_client.db_select(
            "debate_sessions", params={"user_id": f"eq.{user_id}", "select": "*"}
        )
        opponent_sessions = supabase_client.db_select(
            "debate_sessions", params={"opponent_id": f"eq.{user_id}", "select": "*"}
        )
        combined = {s["id"]: s for s in own_sessions + opponent_sessions}
        data["debate_sessions"] = list(combined.values())
    except Exception:  # noqa: BLE001
        data["debate_sessions"] = []

    filename = f"clashlab-data-export-{datetime.now(timezone.utc).strftime('%Y%m%d')}.json"
    return Response(
        content=json.dumps(data, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
