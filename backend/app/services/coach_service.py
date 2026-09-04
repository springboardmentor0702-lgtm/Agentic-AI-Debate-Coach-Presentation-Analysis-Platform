"""
Coach & Educator real features (Segment 20/21).

Everything here operates on a SPECIFIC learner, at a coach/educator's
request - every function assumes the caller has already been verified
as coach/educator/admin (via require_role in the router) AND that the
target id genuinely belongs to a learner (checked in the router before
calling into here, so these functions can stay focused on the actual
logic rather than re-deriving authorization).
"""
import asyncio
from collections import defaultdict
from datetime import datetime
from typing import Optional
from urllib.parse import quote

from app.core import supabase_client
from app.services import notification_service
from app.services.dashboard_service import ACTIVITY_SOURCES, get_recent_activity_async
from app.services.performance_scoring_service import compute_performance_score_async

# kind -> {table, route, label} - reused from the Dashboard's own
# activity feed mapping, so "which tool is this feedback about" always
# agrees with how that same item shows up everywhere else in the app.
_KIND_META = {source["kind"]: source for source in ACTIVITY_SOURCES}


def _get_profile_name(profile_id: str) -> str:
    rows = supabase_client.db_select(
        "profiles", params={"id": f"eq.{profile_id}", "select": "full_name"}
    )
    return rows[0]["full_name"] if rows else "Your coach"


def _get_item_title(item_type: str, item_id: str) -> str:
    """
    Looks up the actual item the feedback is about, so both the
    notification and the coach's feedback-history view can say what
    the feedback was actually on ("your argument about Universal Basic
    Income"), not just which tool it came from. Handles the item having
    been deleted since the feedback was left (the learner can delete
    their own history at any time) without crashing.

    Uses select=* rather than naming specific columns - not every
    tool's table has the same columns (argument_analyses has no
    `transcript`, for instance), and PostgREST 400s on a select
    naming a column that doesn't exist on that table.
    """
    meta = _KIND_META.get(item_type)
    if not meta:
        return "an item"
    rows = supabase_client.db_select(
        meta["table"],
        params={"id": f"eq.{item_id}", "select": "*"},
    )
    if not rows:
        return "an item you've since deleted"
    row = rows[0]
    text = row.get("topic") or row.get("input_text") or row.get("transcript") or ""
    return text[:60] if text else "an item"


def _build_item_link(item_type: str, item_id: str) -> Optional[str]:
    """
    Deep-links to the SPECIFIC item feedback was left on, not just the
    tool's general landing page - so clicking the notification actually
    shows the learner what the feedback is about, instead of dropping
    them on an empty analysis form they'd then have to go hunting
    through their own history to match up.

    Debate sessions already have their own per-session page
    (/debates/<id>), so those go straight there. Every other tool
    reads a `?item=<id>` query param on load and auto-selects that
    entry from its own history panel - see the frontend patch that
    accompanies this fix for the small addition each of those 5 tool
    pages needs to actually honor that param.
    """
    meta = _KIND_META.get(item_type)
    if not meta:
        return None
    if item_type == "debate_session":
        return f"/debates/{item_id}"
    return f"{meta['route']}?item={item_id}"


async def get_learner_detail(learner_id: str) -> dict:
    """
    Combines a learner's performance score and recent activity - the
    view a coach/educator sees when they open one specific learner
    from the ranked list. Runs both concurrently (same principle as
    Segment 18's performance fix - these two calls don't depend on
    each other at all).
    """
    performance, activity = await asyncio.gather(
        compute_performance_score_async(learner_id),
        get_recent_activity_async(learner_id, per_source_limit=15),
    )
    return {"performance": performance, "activity": activity}


def get_feedback_for_learner(learner_id: str) -> list:
    """
    Every piece of feedback left for this learner, enriched with WHO
    left it and WHAT it was about - the raw table only stores ids, and
    a feedback list that just shows the text with no context isn't
    actually useful to anyone re-reading it later. item_type/item_id
    are already included via **row - the frontend uses those directly
    to match against (and scroll to) the corresponding entry in the
    same page's activity list, rather than needing a separate lookup.
    """
    rows = supabase_client.db_select(
        "coach_feedback",
        params={"learner_id": f"eq.{learner_id}", "select": "*", "order": "created_at.desc"},
    )
    if not rows:
        return []

    coach_ids = list({row["coach_id"] for row in rows})
    coaches = supabase_client.db_select(
        "profiles",
        params={"id": f"in.({','.join(coach_ids)})", "select": "id,full_name"},
    )
    coach_names = {c["id"]: c["full_name"] for c in coaches}

    enriched = []
    for row in rows:
        meta = _KIND_META.get(row["item_type"])
        enriched.append(
            {
                **row,
                "coach_name": coach_names.get(row["coach_id"], "Unknown coach"),
                "tool_label": meta["label"] if meta else row["item_type"].replace("_", " ").title(),
                "item_title": _get_item_title(row["item_type"], row["item_id"]),
            }
        )
    return enriched


def leave_feedback(coach_id: str, learner_id: str, item_type: str, item_id: str, feedback_text: str) -> dict:
    feedback = supabase_client.db_insert(
        "coach_feedback",
        {
            "coach_id": coach_id,
            "learner_id": learner_id,
            "item_type": item_type,
            "item_id": item_id,
            "feedback_text": feedback_text,
        },
    )

    coach_name = _get_profile_name(coach_id)
    meta = _KIND_META.get(item_type)
    tool_label = meta["label"] if meta else item_type.replace("_", " ").title()

    notification_service.create_notification(
        learner_id,
        "feedback",
        f"{coach_name} left feedback on your {tool_label}",
        feedback_text[:140],
        _build_item_link(item_type, item_id),
    )
    return feedback


def assign_goal(
    coach_id: str, learner_id: str, metric: str, target_value: float, deadline: Optional[str]
) -> dict:
    goal = supabase_client.db_insert(
        "goals",
        {
            "user_id": learner_id,
            "metric": metric,
            "target_value": target_value,
            "deadline": deadline,
            "assigned_by": coach_id,
        },
    )
    coach_name = _get_profile_name(coach_id)
    metric_label = metric.replace("_", " ").title()
    notification_service.create_notification(
        learner_id,
        "goal_assigned",
        f"{coach_name} set a new goal for you",
        f"Target: {metric_label} >= {target_value}/10",
        "/goals",
    )
    return goal


def suggest_topic(coach_id: str, learner_id: str, topic: str) -> None:
    coach_name = _get_profile_name(coach_id)
    notification_service.create_notification(
        learner_id,
        "topic_suggestion",
        f"{coach_name} suggests a debate topic",
        topic,
        f"/debates?suggested_topic={quote(topic)}",
    )


async def pooled_weekly_trend(user_ids: list) -> list:
    """
    Every performance snapshot belonging to any of the given user ids,
    pooled and averaged per week. This is a deliberate simplification,
    not a true per-learner running average carried forward week to
    week (which would need a much more involved per-learner join) -
    it answers "is the group's scoring trending up or down over time,"
    which is the useful signal for a coach, without the complexity of
    perfectly time-aligning every individual learner's history.

    Extracted (Segment 21) so both get_class_trend() below
    (platform-wide - every learner) and class_service.get_class_trend()
    (scoped to one class's members) share the exact same bucketing
    logic instead of two near-identical copies risking drifting apart.
    """
    if not user_ids:
        return []

    ids_filter = ",".join(user_ids)
    snapshots = await supabase_client.db_select_async(
        "performance_snapshots",
        params={
            "user_id": f"in.({ids_filter})",
            "select": "overall_score,created_at",
            "order": "created_at.asc",
        },
    )

    buckets = defaultdict(list)
    for snapshot in snapshots:
        if snapshot["overall_score"] is None:
            continue
        dt = datetime.fromisoformat(snapshot["created_at"].replace("Z", "+00:00"))
        year, week, _ = dt.isocalendar()
        buckets[f"{year}-W{week:02d}"].append(snapshot["overall_score"])

    return [
        {"period": period, "average_score": round(sum(values) / len(values), 2), "count": len(values)}
        for period, values in sorted(buckets.items())
    ]


async def get_class_trend() -> list:
    """Platform-wide version - every learner on the platform."""
    learners = await supabase_client.db_select_async(
        "profiles", params={"role": "eq.learner", "select": "id"}
    )
    return await pooled_weekly_trend([learner["id"] for learner in learners])
