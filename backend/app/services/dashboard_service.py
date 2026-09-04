"""
Dashboard & Analytics aggregation (spec section 11).

get_recent_activity() serves the Learner Dashboard's unified activity
feed - merging every tool's history into one chronological list,
rather than the dashboard only ever showing Argument Analysis history.

Everything else in this module covers the cross-user views only
Coach/Educator/Admin roles are allowed to see: aggregate learner
performance, platform-wide counts, and a read-only user list. Every
such function queries across ALL users, which is why every route
calling those is gated with require_role(...) in the dashboards
router - never call them without that gate.

Simplification (documented in SEGMENT_10_GUIDE.md): there's no
coach-student assignment or class/cohort schema, so Coach and Educator
both see the same "all learners" view rather than per-class groupings.
"""
import asyncio

from app.core import supabase_client
from app.services.performance_scoring_service import compute_performance_score, compute_performance_score_async

ACTIVITY_SOURCES = [
    {"table": "argument_analyses", "kind": "argument_analysis", "route": "/analyze", "label": "Argument Analysis"},
    {"table": "fallacy_detections", "kind": "fallacy_detection", "route": "/fallacies", "label": "Fallacy Detection"},
    {"table": "counterarguments", "kind": "counterargument", "route": "/counterarguments", "label": "Counterarguments"},
    {"table": "case_reviews", "kind": "case_review", "route": "/case-review", "label": "Full Case Review"},
    {"table": "presentation_analyses", "kind": "presentation_analysis", "route": "/presentation", "label": "Presentation Analysis"},
    {"table": "debate_sessions", "kind": "debate_session", "route": "/debates", "label": "Debate Simulation"},
]


def get_recent_activity(user_id: str, per_source_limit: int = 8) -> list:
    """
    Pulls the most recent items from every tool for one user, tags
    each with which tool it came from, and merges them into a single
    feed sorted newest-first.
    """
    items = []
    for source in ACTIVITY_SOURCES:
        rows = supabase_client.db_select(
            source["table"],
            params={
                "user_id": f"eq.{user_id}",
                "select": "*",
                "order": "created_at.desc",
                "limit": str(per_source_limit),
            },
        )
        for row in rows:
            items.append({"kind": source["kind"], "route": source["route"], "tool_label": source["label"], **row})

    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return items


async def get_recent_activity_async(user_id: str, per_source_limit: int = 8) -> list:
    """
    Async twin of get_recent_activity() above - identical merge/sort
    logic, but fetches all 6 tables CONCURRENTLY via asyncio.gather()
    instead of one after another. The Learner Dashboard fires this on
    every load, making it one of the two diagnosed causes of slow page
    loads (the other was compute_performance_score).

    get_recent_activity() above is completely untouched and still used
    by report_service.py's PDF generation - only the standalone
    Dashboard activity endpoint was switched to this version.
    """
    results = await asyncio.gather(
        *[
            supabase_client.db_select_async(
                source["table"],
                params={
                    "user_id": f"eq.{user_id}",
                    "select": "*",
                    "order": "created_at.desc",
                    "limit": str(per_source_limit),
                },
            )
            for source in ACTIVITY_SOURCES
        ]
    )

    items = []
    for source, rows in zip(ACTIVITY_SOURCES, results):
        for row in rows:
            items.append({"kind": source["kind"], "route": source["route"], "tool_label": source["label"], **row})

    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return items


def get_all_learners_overview() -> list:
    learners = supabase_client.db_select(
        "profiles",
        params={"role": "eq.learner", "select": "id,full_name,experience_level,created_at"},
    )
    overview = []
    for learner in learners:
        performance = compute_performance_score(learner["id"])
        overview.append(
            {
                "id": learner["id"],
                "full_name": learner["full_name"],
                "experience_level": learner.get("experience_level"),
                "created_at": learner.get("created_at"),
                "overall_score": performance["overall_score"],
                "data_counts": performance["data_counts"],
            }
        )
    # Rank by overall_score descending; learners with no score yet
    # (None) sort to the bottom instead of crashing a numeric sort.
    overview.sort(key=lambda o: (o["overall_score"] is None, -(o["overall_score"] or 0)))
    return overview


async def rank_learners(learners: list) -> list:
    """
    Shared ranking logic: given a list of learner profile dicts (each
    needing id, full_name, experience_level, created_at), computes
    every one's performance score CONCURRENTLY and returns them ranked
    by overall_score descending (no-score learners sort last, not
    crashing a numeric sort on None).

    Extracted so both get_all_learners_overview_async() below
    (platform-wide) and class_service.get_class_roster() (Segment 21 -
    scoped to one class's members) share the exact same ranking
    behavior instead of it risking drifting apart between two
    near-identical copies.
    """
    performances = await asyncio.gather(
        *[compute_performance_score_async(learner["id"]) for learner in learners]
    )

    overview = [
        {
            "id": learner["id"],
            "full_name": learner["full_name"],
            "experience_level": learner.get("experience_level"),
            "created_at": learner.get("created_at"),
            "overall_score": performance["overall_score"],
            "data_counts": performance["data_counts"],
        }
        for learner, performance in zip(learners, performances)
    ]
    overview.sort(key=lambda o: (o["overall_score"] is None, -(o["overall_score"] or 0)))
    return overview


async def get_all_learners_overview_async() -> list:
    """
    Async twin of get_all_learners_overview() above - identical ranking
    logic, but computes every learner's performance score CONCURRENTLY
    instead of one learner at a time. This was the worst of the three
    diagnosed bottlenecks: with N learners, the old version made N
    sequential chains of 4 queries each - this version runs all of
    them at once, so it stops scaling linearly with the number of
    learners.
    """
    learners = await supabase_client.db_select_async(
        "profiles",
        params={"role": "eq.learner", "select": "id,full_name,experience_level,created_at"},
    )
    return await rank_learners(learners)


def _count(table: str) -> int:
    rows = supabase_client.db_select(table, params={"select": "id"})
    return len(rows)


async def _count_async(table: str) -> int:
    rows = await supabase_client.db_select_async(table, params={"select": "id"})
    return len(rows)


def get_platform_overview() -> dict:
    profiles = supabase_client.db_select("profiles", params={"select": "id,role"})
    role_counts: dict = {}
    for p in profiles:
        role_counts[p["role"]] = role_counts.get(p["role"], 0) + 1

    return {
        "total_users": len(profiles),
        "users_by_role": role_counts,
        "activity_counts": {
            "argument_analyses": _count("argument_analyses"),
            "fallacy_detections": _count("fallacy_detections"),
            "counterarguments": _count("counterarguments"),
            "case_reviews": _count("case_reviews"),
            "debate_sessions": _count("debate_sessions"),
            "debate_rounds": _count("debate_rounds"),
            "presentation_analyses": _count("presentation_analyses"),
            "coaching_plans": _count("coaching_plans"),
        },
    }


async def get_platform_overview_async() -> dict:
    """
    Async twin of get_platform_overview() above - same 8 activity-count
    queries, run concurrently instead of one after another.
    """
    profiles = await supabase_client.db_select_async("profiles", params={"select": "id,role"})
    role_counts: dict = {}
    for p in profiles:
        role_counts[p["role"]] = role_counts.get(p["role"], 0) + 1

    keys = [
        "argument_analyses", "fallacy_detections", "counterarguments", "case_reviews",
        "debate_sessions", "debate_rounds", "presentation_analyses", "coaching_plans",
    ]
    counts = await asyncio.gather(*[_count_async(k) for k in keys])

    return {
        "total_users": len(profiles),
        "users_by_role": role_counts,
        "activity_counts": dict(zip(keys, counts)),
    }


def update_user_role(user_id: str, role: str) -> dict:
    return supabase_client.db_update("profiles", {"id": user_id}, {"role": role})


def get_all_users() -> list:
    return supabase_client.db_select(
        "profiles",
        params={
            "select": "id,full_name,role,experience_level,created_at",
            "order": "created_at.desc",
        },
    )
