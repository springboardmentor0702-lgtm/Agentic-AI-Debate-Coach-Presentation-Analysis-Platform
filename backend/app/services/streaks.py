"""
Practice streaks (Segment 26).

Same principle as every other derived number in this project
(performance scores, round tallies): computed live from actual
activity, never stored and risking drift from reality. No background
job scheduler exists in this project (everything is request-triggered
or computed-on-read) - so "inactivity reminder" isn't a scheduled
push, it's a value returned alongside the streak that the frontend
displays whenever the learner is actually looking at their dashboard.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.core import supabase_client

ACTIVITY_TABLES = ["argument_analyses", "fallacy_detections", "debate_rounds", "presentation_analyses"]

INACTIVITY_REMINDER_THRESHOLD_DAYS = 3


def _get_activity_dates(user_id: str) -> set:
    dates = set()
    for table in ACTIVITY_TABLES:
        rows = supabase_client.db_select(
            table, params={"user_id": f"eq.{user_id}", "select": "created_at"}
        )
        for row in rows:
            dt = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
            dates.add(dt.date())
    return dates


def get_streak_info(user_id: str) -> dict:
    activity_dates = _get_activity_dates(user_id)

    if not activity_dates:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity_date": None,
            "days_since_last_activity": None,
            "show_inactivity_reminder": False,
        }

    today = datetime.now(timezone.utc).date()
    sorted_dates = sorted(activity_dates, reverse=True)

    # Current streak: walk backward from today. If today has no
    # activity yet, start from yesterday instead - a learner who
    # practiced every day through yesterday shouldn't see their streak
    # reset to 0 just because they haven't opened the app yet today.
    current_streak = 0
    check_date = today if today in activity_dates else today - timedelta(days=1)
    while check_date in activity_dates:
        current_streak += 1
        check_date -= timedelta(days=1)

    # Longest streak: scan every date for the longest consecutive run,
    # not just the current one.
    longest_streak = 1
    run = 1
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i - 1] - sorted_dates[i]).days == 1:
            run += 1
            longest_streak = max(longest_streak, run)
        else:
            run = 1

    days_since_last = (today - sorted_dates[0]).days

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_activity_date": sorted_dates[0].isoformat(),
        "days_since_last_activity": days_since_last,
        "show_inactivity_reminder": days_since_last >= INACTIVITY_REMINDER_THRESHOLD_DAYS,
    }
