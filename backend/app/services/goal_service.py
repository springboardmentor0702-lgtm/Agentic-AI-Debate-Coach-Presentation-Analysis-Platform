"""
Goal Management (spec sections 2 & 11).

Structured, trackable goals - pick a metric (one of the 5 weighted
performance components, or the overall score), a target value, and
optionally a deadline. Progress is always computed live against the
current performance score - same principle as everywhere else in this
project: no stored "progress" number that could go stale, just a live
comparison against compute_performance_score() every time goals are
viewed.

Achievement detection works the same way reminders do: checked fresh
on every read, not on a schedule. The one thing that IS persisted is
`achieved_at`, written once, the first time a goal is found to be met.
"""
from datetime import datetime, timezone

from app.core import supabase_client
from app.services import notification_service
from app.services.performance_scoring_service import compute_performance_score

METRIC_LABELS = {
    "overall_score": "Overall Score",
    "argument_quality": "Argument Quality",
    "evidence_usage": "Evidence Usage",
    "logical_consistency": "Logical Consistency",
    "rebuttal_effectiveness": "Rebuttal Effectiveness",
    "communication_skills": "Communication Skills",
}


def _current_value_for_metric(performance: dict, metric: str):
    if metric == "overall_score":
        return performance["overall_score"]
    for c in performance["components"]:
        if c["key"] == metric:
            return c["score"] if c["has_data"] else None
    return None


def list_goals(user_id: str) -> list:
    goals = supabase_client.db_select(
        "goals",
        params={"user_id": f"eq.{user_id}", "select": "*", "order": "created_at.desc"},
    )
    if not goals:
        return []

    performance = compute_performance_score(user_id)
    enriched = []

    for goal in goals:
        current_value = _current_value_for_metric(performance, goal["metric"])
        target = goal["target_value"]
        progress_pct = (
            round(min(100, (current_value / target) * 100), 1)
            if current_value is not None and target
            else None
        )

        newly_achieved = (
            goal["status"] == "active"
            and current_value is not None
            and current_value >= target
        )
        if newly_achieved:
            achieved_at = datetime.now(timezone.utc).isoformat()
            try:
                supabase_client.db_update(
                    "goals", {"id": goal["id"]}, {"status": "achieved", "achieved_at": achieved_at}
                )
                goal["status"] = "achieved"
                goal["achieved_at"] = achieved_at
                notification_service.create_notification(
                    user_id,
                    "milestone",
                    "Goal achieved!",
                    f'You hit your target of {target}/10 for '
                    f'{METRIC_LABELS.get(goal["metric"], goal["metric"])}.',
                    "/goals",
                )
            except Exception:  # noqa: BLE001
                pass  # goal still shows as achieved in this response either way

        enriched.append(
            {
                **goal,
                "metric_label": METRIC_LABELS.get(goal["metric"], goal["metric"]),
                "current_value": current_value,
                "progress_pct": progress_pct,
            }
        )

    return enriched


def create_goal(user_id: str, metric: str, target_value: float, deadline) -> dict:
    return supabase_client.db_insert(
        "goals",
        {
            "user_id": user_id,
            "metric": metric,
            "target_value": target_value,
            "deadline": deadline,
        },
    )
