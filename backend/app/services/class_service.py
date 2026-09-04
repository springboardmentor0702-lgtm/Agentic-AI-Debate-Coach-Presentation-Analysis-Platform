"""
Classes & Cohorts (Segment 21).

Gives a coach/educator a way to group learners into a named class,
scoping the existing ranked-list, trend-chart, and report features
(built for the whole platform in Segments 10/19/20) down to just that
group - real structure, where before every coach/educator saw
literally everyone on the platform with no way to organize them.

Deliberately additive, not a replacement: the platform-wide "all
learners" views from earlier segments are completely untouched and
still work exactly as before - this is a new, optional layer on top,
reusing (not duplicating) the same ranking and trend logic via the
shared helpers extracted from dashboard_service.py and coach_service.py
in this same segment.

This is also the honest answer to "where are the Educator features":
the platform-wide individual drill-down (Segment 20's LearnerDetail
page - feedback, goal assignment) is the Debate Coach-flavored
capability from the original spec ("Skill gap analysis," "Coaching
recommendations" - working with one learner at a time). Classes are
the Educator-flavored capability ("Class analytics," "Student
rankings" - working with a defined group). Both roles get access to
both, since in practice the line between them is blurry, but the
*capability* now genuinely exists for each, not just a shared screen
with two role names allowed on it.
"""
from app.core import supabase_client
from app.services.coach_service import pooled_weekly_trend
from app.services.dashboard_service import rank_learners


def create_class(coach_id: str, name: str) -> dict:
    return supabase_client.db_insert("classes", {"name": name, "created_by": coach_id})


def list_my_classes(coach_id: str) -> list:
    return supabase_client.db_select(
        "classes",
        params={"created_by": f"eq.{coach_id}", "select": "*", "order": "created_at.desc"},
    )


def delete_class(class_id: str) -> None:
    supabase_client.db_delete("classes", {"id": class_id})


def add_member(class_id: str, learner_id: str) -> dict:
    return supabase_client.db_insert(
        "class_members", {"class_id": class_id, "learner_id": learner_id}
    )


def remove_member(class_id: str, learner_id: str) -> None:
    supabase_client.db_delete(
        "class_members", {"class_id": class_id, "learner_id": learner_id}
    )


def get_class_member_ids(class_id: str) -> list:
    rows = supabase_client.db_select(
        "class_members", params={"class_id": f"eq.{class_id}", "select": "learner_id"}
    )
    return [row["learner_id"] for row in rows]


async def get_class_roster(class_id: str) -> list:
    """Same ranking logic as the platform-wide overview (Segment 10/18's
    rank_learners), scoped to just this class's members."""
    member_ids = get_class_member_ids(class_id)
    if not member_ids:
        return []

    profiles = supabase_client.db_select(
        "profiles",
        params={
            "id": f"in.({','.join(member_ids)})",
            "select": "id,full_name,experience_level,created_at",
        },
    )
    return await rank_learners(profiles)


async def get_class_trend(class_id: str) -> list:
    """Same pooled-weekly-average logic as the platform-wide class
    trend (Segment 20's pooled_weekly_trend), scoped to this class's
    members only."""
    member_ids = get_class_member_ids(class_id)
    return await pooled_weekly_trend(member_ids)
