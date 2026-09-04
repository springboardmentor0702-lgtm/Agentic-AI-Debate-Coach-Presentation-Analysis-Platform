"""
Notification & Engagement System (spec section 12).

Two kinds of notification:
- Rows in `notifications` - user-specific, created immediately when
  something happens (a debate round finishes, a coaching plan
  generates, a first-time milestone is hit). Persisted, stay until
  marked read.
- Rows in `announcements` - admin-broadcast, visible to every user,
  merged into everyone's feed at read time rather than duplicated into
  a row per user.

"Reminders" (spec: debate reminders, practice session reminders) are
deliberately NOT persisted rows - there's no background job/scheduler
in this project (real ones need infrastructure this project doesn't
have room for on free tier). Instead they're computed live, every time
the feed is requested: any of your debate sessions still `active`
becomes a reminder for that request. A reminder naturally disappears
once you finish or delete that session - no cleanup job needed.
Session scheduling (Segment 15) uses this same principle: a
`scheduled_for` timestamp on a session is just a column checked here,
not a scheduled job.
"""
from datetime import datetime, timezone
from typing import Optional

from app.core import supabase_client

# Table -> (human label, route) - used both for milestone notifications
# and kept as the single source of truth other code can reference.
MILESTONE_TABLES = {
    "argument_analyses": ("Argument Analysis", "/analyze"),
    "fallacy_detections": ("Fallacy Detection", "/fallacies"),
    "counterarguments": ("Counterarguments", "/counterarguments"),
    "case_reviews": ("Full Case Review", "/case-review"),
    "presentation_analyses": ("Presentation Analysis", "/presentation"),
    "debate_sessions": ("Debate Simulation", "/debates"),
}


def create_notification(
    user_id: str, type_: str, title: str, message: str, link: Optional[str] = None
) -> dict:
    return supabase_client.db_insert(
        "notifications",
        {"user_id": user_id, "type": type_, "title": title, "message": message, "link": link},
    )


def check_first_time_milestone(user_id: str, table: str) -> None:
    """
    Call right after inserting a new row into one of MILESTONE_TABLES.
    If that insert was the user's first-ever row in that table, creates
    a one-time milestone notification. Silently swallows any error - a
    milestone notification is a nice-to-have, never worth failing the
    actual request over.
    """
    if table not in MILESTONE_TABLES:
        return
    try:
        rows = supabase_client.db_select(
            table, params={"user_id": f"eq.{user_id}", "select": "id"}
        )
        if len(rows) == 1:
            tool_label, link = MILESTONE_TABLES[table]
            create_notification(
                user_id,
                "milestone",
                "First milestone!",
                f'You completed your first {tool_label} run. Keep going.',
                link,
            )
    except Exception:  # noqa: BLE001
        pass


def _parse_iso(value: Optional[str]):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def get_active_debate_reminders(user_id: str) -> list:
    sessions = supabase_client.db_select(
        "debate_sessions",
        params={"user_id": f"eq.{user_id}", "status": "eq.active", "select": "*"},
    )
    now = datetime.now(timezone.utc)
    reminders = []

    for s in sessions:
        scheduled_dt = _parse_iso(s.get("scheduled_for"))

        if scheduled_dt and scheduled_dt > now:
            # Scheduled for later - an upcoming heads-up, not a nag.
            # Deliberately NOT formatting the time into the message
            # string here - the backend only knows UTC, never the
            # user's actual timezone, so any string it builds
            # ("...at 3:00 PM") would be wrong for anyone not in UTC.
            # The raw ISO timestamp goes out as `scheduled_for`
            # instead, and the frontend formats it with the browser's
            # local timezone (same pattern used for every other date
            # in this app).
            reminders.append(
                {
                    "id": f"reminder-{s['id']}",
                    "type": "reminder",
                    "title": "Upcoming debate",
                    "message": f'"{s["topic"]}" is coming up.',
                    "scheduled_for": s.get("scheduled_for"),
                    "link": f"/debates/{s['id']}",
                    "read": False,
                    "created_at": s["created_at"],
                }
            )
        elif scheduled_dt and scheduled_dt <= now and s["round_count"] == 0:
            # Scheduled time has passed and it was never started.
            reminders.append(
                {
                    "id": f"reminder-{s['id']}",
                    "type": "reminder",
                    "title": "Overdue debate",
                    "message": f'"{s["topic"]}" hasn\'t started yet.',
                    "scheduled_for": s.get("scheduled_for"),
                    "link": f"/debates/{s['id']}",
                    "read": False,
                    "created_at": s["created_at"],
                }
            )
        else:
            # No schedule (or schedule already passed and in progress) -
            # the original "still active, unfinished" reminder.
            reminders.append(
                {
                    "id": f"reminder-{s['id']}",
                    "type": "reminder",
                    "title": "Debate waiting",
                    "message": (
                        f'Your debate on "{s["topic"]}" is still active '
                        f'({s["round_count"]} round(s) so far).'
                    ),
                    "scheduled_for": None,
                    "link": f"/debates/{s['id']}",
                    "read": False,
                    "created_at": s["created_at"],
                }
            )

    return reminders


def get_feed(user_id: str) -> list:
    notifications = supabase_client.db_select(
        "notifications",
        params={
            "user_id": f"eq.{user_id}",
            "select": "*",
            "order": "created_at.desc",
            "limit": "50",
        },
    )
    announcements = supabase_client.db_select(
        "announcements", params={"select": "*", "order": "created_at.desc", "limit": "20"}
    )
    announcement_items = [
        {
            "id": f"announcement-{a['id']}",
            "type": "announcement",
            "title": a["title"],
            "message": a["message"],
            "link": None,
            # Announcements have no per-user read state - they're
            # informational broadcasts, always shown as already-read
            # so they don't inflate the unread badge count forever.
            "read": True,
            "created_at": a["created_at"],
        }
        for a in announcements
    ]
    reminders = get_active_debate_reminders(user_id)

    feed = notifications + announcement_items + reminders
    feed.sort(key=lambda x: x["created_at"], reverse=True)
    return feed
