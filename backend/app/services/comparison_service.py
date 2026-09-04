"""
Peer Comparison for Learners (spec: Competition Analytics).

Deliberately NOT a leaderboard - no other learner's name, identity, or
individual score is ever exposed to another learner. Opted-in learners
are compared only in aggregate: your percentile within the pool, and a
score-distribution histogram with your own bucket highlighted. The
Coach/Educator "all learners, ranked" view (Segment 10) already covers
named rankings for the roles that have a legitimate reason to see
individual names; this is the anonymous, opt-in-only version for the
learners actually being compared.

A minimum pool size is enforced (admin-configurable, defaults to
`settings.COMPARISON_MIN_POOL_SIZE`, including yourself) before showing
anything - comparing yourself against just 1-2 other opted-in learners
would make their approximate score trivially inferable from your own
percentile, which defeats the entire point of keeping this anonymous.
Previously only changeable by editing `.env`; Segment 19 made it a
real admin-configurable setting (persisted in `app_settings`, editable
from the Admin Dashboard) - you know your own group size and privacy
tolerance better than a fixed default can. Lower values mean less
protection: with a pool of 2 (yourself + 1 other), your percentile
literally reveals whether you scored higher or lower than that one
specific person.
"""
from app.core import supabase_client
from app.services.performance_scoring_service import COMPONENT_LABELS, compute_performance_score_async
from app.services.settings_service import get_comparison_min_pool_size

import asyncio


def _percentile(value: float, pool: list) -> float:
    """
    Percentile rank of `value` within `pool`. Ties count as half a
    rank each - the standard approach, so scoring exactly at the
    average doesn't inflate or deflate your percentile.
    """
    less = sum(1 for v in pool if v < value)
    equal = sum(1 for v in pool if v == value)
    return round(((less + 0.5 * equal) / len(pool)) * 100, 1)


def _bucket_distribution(pool: list, my_value: float) -> list:
    buckets = [(0, 2), (2, 4), (4, 6), (6, 8), (8, 10.001)]
    result = []
    for lo, hi in buckets:
        count = sum(1 for v in pool if lo <= v < hi)
        result.append(
            {
                "range": f"{lo:.0f}-{min(hi, 10):.0f}",
                "count": count,
                "is_mine": lo <= my_value < hi,
            }
        )
    return result


async def get_comparison(user_id: str) -> dict:
    """
    Converted to async in the same pass as Segment 18 - this had the
    exact same bottleneck (N opted-in learners' scores computed one
    at a time, sequentially) that Segment 18 fixed elsewhere, just
    deliberately left untouched then to keep that segment scoped. Has
    exactly one caller (the /comparison route), so safe to convert in
    place rather than needing a parallel async twin.
    """
    profile_rows = await supabase_client.db_select_async(
        "profiles",
        params={
            "role": "eq.learner",
            "participate_in_comparison": "eq.true",
            "select": "id",
        },
    )
    opted_in_ids = [p["id"] for p in profile_rows]

    if user_id not in opted_in_ids:
        return {"opted_in": False}

    # min_pool_size and every learner's score are all independent of
    # each other - fetched in one flat gather() rather than awaiting
    # the setting first and then the scores.
    results = await asyncio.gather(
        get_comparison_min_pool_size(),
        *[compute_performance_score_async(pid) for pid in opted_in_ids],
    )
    min_pool_size, scores_list = results[0], results[1:]
    scores_by_user = dict(zip(opted_in_ids, scores_list))
    my_performance = scores_by_user[user_id]

    overall_pool = [
        s["overall_score"] for s in scores_by_user.values() if s["overall_score"] is not None
    ]

    if len(overall_pool) < min_pool_size:
        return {
            "opted_in": True,
            "enough_data": False,
            "pool_size": len(overall_pool),
            "min_pool_size": min_pool_size,
        }

    result = {
        "opted_in": True,
        "enough_data": True,
        "pool_size": len(overall_pool),
        "min_pool_size": min_pool_size,
        "overall": None,
        "components": [],
    }

    my_overall = my_performance["overall_score"]
    if my_overall is not None:
        result["overall"] = {
            "my_score": my_overall,
            "percentile": _percentile(my_overall, overall_pool),
            "distribution": _bucket_distribution(overall_pool, my_overall),
        }

    for key, label in COMPONENT_LABELS.items():
        pool_values = []
        for s in scores_by_user.values():
            comp = next((c for c in s["components"] if c["key"] == key), None)
            if comp and comp["has_data"]:
                pool_values.append(comp["score"])

        my_comp = next((c for c in my_performance["components"] if c["key"] == key), None)
        if len(pool_values) >= min_pool_size and my_comp and my_comp["has_data"]:
            result["components"].append(
                {
                    "key": key,
                    "label": label,
                    "my_score": my_comp["score"],
                    "percentile": _percentile(my_comp["score"], pool_values),
                    "pool_size": len(pool_values),
                }
            )

    return result
