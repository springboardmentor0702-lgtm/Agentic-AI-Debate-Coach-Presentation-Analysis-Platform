"""
Performance Scoring Engine (spec section 9).

Combines a user's history across every other engine into the spec's
weighted performance formula:
  Argument Quality 30% / Evidence Usage 20% / Logical Consistency 20%
  / Rebuttal Effectiveness 15% / Communication Skills 15%

Every number here is a plain average of values earlier segments
already computed and stored - nothing in this file calls the LLM.

Data source per component:
- Argument Quality:        argument_analyses.overall_score
- Evidence Usage:          argument_analyses.scores.evidence_strength
- Logical Consistency:     argument_analyses.scores.logical_consistency
                            blended with fallacy_detections.credibility_score
                            (two independent signals of the same thing:
                            structural soundness and fallacy-freeness)
- Rebuttal Effectiveness:  debate_rounds.judge_feedback.user_score
- Communication Skills:    presentation_analyses.overall_score

If someone hasn't used a particular tool yet, that component is left
out of the average and the remaining weights are re-normalized to
still sum to 100% - a new user who's only tried argument analysis
isn't punished for not having done a debate simulation yet.
"""
from typing import Optional

import asyncio

from app.core import supabase_client

COMPONENT_WEIGHTS = {
    "argument_quality": 0.30,
    "evidence_usage": 0.20,
    "logical_consistency": 0.20,
    "rebuttal_effectiveness": 0.15,
    "communication_skills": 0.15,
}

COMPONENT_LABELS = {
    "argument_quality": "Argument Quality",
    "evidence_usage": "Evidence Usage",
    "logical_consistency": "Logical Consistency",
    "rebuttal_effectiveness": "Rebuttal Effectiveness",
    "communication_skills": "Communication Skills",
}


def _average(values: list) -> Optional[float]:
    values = [v for v in values if v is not None]
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def _build_score_result(
    argument_analyses: list, fallacy_detections: list, debate_rounds: list, presentation_analyses: list
) -> dict:
    """
    The actual scoring math, shared by both compute_performance_score()
    (sequential fetch) and compute_performance_score_async() (concurrent
    fetch) below - so the two can never silently drift apart in
    behavior. Only how the 4 tables get fetched differs between them;
    what happens with the data once it arrives is identical, in one
    place.
    """
    argument_quality = _average([a.get("overall_score") for a in argument_analyses])
    evidence_usage = _average(
        [(a.get("scores") or {}).get("evidence_strength") for a in argument_analyses]
    )
    logical_consistency = _average(
        [(a.get("scores") or {}).get("logical_consistency") for a in argument_analyses]
        + [f.get("credibility_score") for f in fallacy_detections]
    )
    rebuttal_effectiveness = _average(
        [(r.get("judge_feedback") or {}).get("user_score") for r in debate_rounds]
    )
    communication_skills = _average([p.get("overall_score") for p in presentation_analyses])

    components = {
        "argument_quality": argument_quality,
        "evidence_usage": evidence_usage,
        "logical_consistency": logical_consistency,
        "rebuttal_effectiveness": rebuttal_effectiveness,
        "communication_skills": communication_skills,
    }

    available = {k: v for k, v in components.items() if v is not None}
    if available:
        available_weight_sum = sum(COMPONENT_WEIGHTS[k] for k in available)
        overall_score = round(
            sum(v * (COMPONENT_WEIGHTS[k] / available_weight_sum) for k, v in available.items()),
            2,
        )
    else:
        overall_score = None

    return {
        "overall_score": overall_score,
        "components": [
            {
                "key": key,
                "label": COMPONENT_LABELS[key],
                "weight_pct": round(COMPONENT_WEIGHTS[key] * 100),
                "score": value,
                "has_data": value is not None,
            }
            for key, value in components.items()
        ],
        "data_counts": {
            "argument_analyses": len(argument_analyses),
            "fallacy_detections": len(fallacy_detections),
            "debate_rounds": len(debate_rounds),
            "presentation_analyses": len(presentation_analyses),
        },
    }


def compute_performance_score(user_id: str) -> dict:
    argument_analyses = supabase_client.db_select(
        "argument_analyses",
        params={"user_id": f"eq.{user_id}", "select": "overall_score,scores"},
    )
    fallacy_detections = supabase_client.db_select(
        "fallacy_detections",
        params={"user_id": f"eq.{user_id}", "select": "credibility_score"},
    )
    debate_rounds = supabase_client.db_select(
        "debate_rounds",
        params={"user_id": f"eq.{user_id}", "select": "judge_feedback"},
    )
    presentation_analyses = supabase_client.db_select(
        "presentation_analyses",
        params={"user_id": f"eq.{user_id}", "select": "overall_score"},
    )
    return _build_score_result(argument_analyses, fallacy_detections, debate_rounds, presentation_analyses)


async def compute_performance_score_async(user_id: str) -> dict:
    """
    Async twin of compute_performance_score() above - identical scoring
    math (shares _build_score_result, so the two can't silently
    diverge), but fetches all 4 tables CONCURRENTLY via
    asyncio.gather() instead of one after another. This was one of the
    two diagnosed causes of slow page loads.

    compute_performance_score() above is completely untouched and still
    used by every other caller (goals, peer comparison, reports,
    coaching) - only the standalone Performance Score endpoint and the
    Coach Dashboard's per-learner loop were switched to this version.
    """
    argument_analyses, fallacy_detections, debate_rounds, presentation_analyses = await asyncio.gather(
        supabase_client.db_select_async(
            "argument_analyses",
            params={"user_id": f"eq.{user_id}", "select": "overall_score,scores"},
        ),
        supabase_client.db_select_async(
            "fallacy_detections",
            params={"user_id": f"eq.{user_id}", "select": "credibility_score"},
        ),
        supabase_client.db_select_async(
            "debate_rounds",
            params={"user_id": f"eq.{user_id}", "select": "judge_feedback"},
        ),
        supabase_client.db_select_async(
            "presentation_analyses",
            params={"user_id": f"eq.{user_id}", "select": "overall_score"},
        ),
    )
    return _build_score_result(argument_analyses, fallacy_detections, debate_rounds, presentation_analyses)


def record_snapshot(user_id: str) -> None:
    """
    Call right after any scored activity saves successfully (argument
    analysis, fallacy detection, a debate round, a presentation
    analysis - anything that feeds one of the 5 weighted components).
    Stores a point-in-time copy of the full breakdown, since
    compute_performance_score() above is always a LIVE recomputation
    with no history of its own - this is what actually makes a trend
    chart possible. Swallows any error - a missed snapshot should never
    fail the real request that triggered it.
    """
    try:
        performance = compute_performance_score(user_id)
        supabase_client.db_insert(
            "performance_snapshots",
            {
                "user_id": user_id,
                "overall_score": performance["overall_score"],
                "components": performance["components"],
            },
        )
    except Exception:  # noqa: BLE001
        pass


def get_score_history(user_id: str, limit: int = 50) -> list:
    return supabase_client.db_select(
        "performance_snapshots",
        params={
            "user_id": f"eq.{user_id}",
            "select": "*",
            "order": "created_at.asc",
            "limit": str(limit),
        },
    )
