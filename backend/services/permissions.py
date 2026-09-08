"""Shared role/mentor permission checks, used by dashboards, sessions, and
coach-feedback routers so "who can see/edit which student" is defined in
exactly one place instead of being re-implemented slightly differently in
each router."""
import models


def can_view_student(current_user: "models.User", target_user: "models.User") -> bool:
    """True if current_user is allowed to view target_user's dashboard/sessions."""
    if current_user.id == target_user.id:
        return True
    if current_user.role == "Administrator":
        return True
    if current_user.role in ("Debate Coach", "Educator"):
        return target_user.mentor_id == current_user.id
    return False


def can_edit_user(current_user: "models.User", target_user: "models.User") -> bool:
    """True if current_user may edit target_user's profile fields.
    Administrators may edit anyone. Coaches/Educators may edit only their
    own assigned Learners (mentor_id == current_user.id), and only
    non-role fields (enforced separately in the endpoint)."""
    if current_user.role == "Administrator":
        return True
    if current_user.role in ("Debate Coach", "Educator"):
        return target_user.role == "Learner" and target_user.mentor_id == current_user.id
    return False
