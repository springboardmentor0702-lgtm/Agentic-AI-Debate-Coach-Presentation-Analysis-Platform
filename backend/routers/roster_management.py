"""Roster management: Coach-Learner assignments and Educator-Cohort memberships.

Debate Coach endpoints manage a 1-on-1 or small-group coaching relationship.
Educator endpoints manage class-wide cohort memberships.
Administrators may use any endpoint without restriction.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user, require_role
import models
import schemas

router = APIRouter(prefix="/api/v1/roster", tags=["Roster Management"])


# ── helpers ──────────────────────────────────────────────────────────────────
def _require_learner(user_id: int, db: Session) -> models.User:
    """Validate that the target user exists and is a Learner."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found.")
    if user.role != "Learner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User {user_id} is a {user.role}, not a Learner.")
    return user


# ═══════════════════════════════════════════════════════════════════════════
# COACH assignment endpoints
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/coach/assign", response_model=schemas.CoachAssignmentResponse, status_code=status.HTTP_201_CREATED)
def assign_learner_to_coach(
    payload: schemas.CoachAssignmentCreate,
    current_user: models.User = Depends(require_role(["Debate Coach", "Administrator"])),
    db: Session = Depends(get_db),
):
    """Assign a learner to the signed-in coach (or to self for an admin acting as coach)."""
    learner = _require_learner(payload.learner_id, db)
    coach_id = current_user.id

    existing = (
        db.query(models.CoachAssignment)
        .filter(models.CoachAssignment.coach_id == coach_id, models.CoachAssignment.learner_id == learner.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This learner is already assigned to you.")

    assignment = models.CoachAssignment(coach_id=coach_id, learner_id=learner.id)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {
        "id": assignment.id,
        "coach_id": assignment.coach_id,
        "learner_id": assignment.learner_id,
        "learner_name": learner.full_name,
        "learner_email": learner.email,
        "assigned_at": assignment.assigned_at,
    }


@router.delete("/coach/unassign/{learner_id}", status_code=status.HTTP_200_OK)
def unassign_learner_from_coach(
    learner_id: int,
    current_user: models.User = Depends(require_role(["Debate Coach", "Administrator"])),
    db: Session = Depends(get_db),
):
    """Remove a learner from the signed-in coach's roster."""
    assignment = (
        db.query(models.CoachAssignment)
        .filter(models.CoachAssignment.coach_id == current_user.id, models.CoachAssignment.learner_id == learner_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    db.delete(assignment)
    db.commit()
    return {"detail": "Learner unassigned successfully."}


@router.get("/coach/my-learners", response_model=List[schemas.CoachAssignmentResponse])
def get_coach_learners(
    current_user: models.User = Depends(require_role(["Debate Coach", "Administrator"])),
    db: Session = Depends(get_db),
):
    """List every learner assigned to the signed-in coach."""
    assignments = (
        db.query(models.CoachAssignment)
        .filter(models.CoachAssignment.coach_id == current_user.id)
        .order_by(models.CoachAssignment.assigned_at.desc())
        .all()
    )
    result = []
    for a in assignments:
        learner = db.query(models.User).filter(models.User.id == a.learner_id).first()
        if learner:
            result.append({
                "id": a.id,
                "coach_id": a.coach_id,
                "learner_id": a.learner_id,
                "learner_name": learner.full_name,
                "learner_email": learner.email,
                "assigned_at": a.assigned_at,
            })
    return result


# ═══════════════════════════════════════════════════════════════════════════
# EDUCATOR cohort endpoints
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/educator/assign", response_model=schemas.EducatorCohortResponse, status_code=status.HTTP_201_CREATED)
def assign_learner_to_cohort(
    payload: schemas.EducatorCohortCreate,
    current_user: models.User = Depends(require_role(["Educator", "Administrator"])),
    db: Session = Depends(get_db),
):
    """Add a learner to the signed-in educator's cohort."""
    learner = _require_learner(payload.learner_id, db)
    educator_id = current_user.id

    existing = (
        db.query(models.EducatorCohort)
        .filter(models.EducatorCohort.educator_id == educator_id, models.EducatorCohort.learner_id == learner.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This learner is already in your cohort.")

    entry = models.EducatorCohort(educator_id=educator_id, cohort_name=payload.cohort_name, learner_id=learner.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "id": entry.id,
        "educator_id": entry.educator_id,
        "cohort_name": entry.cohort_name,
        "learner_id": entry.learner_id,
        "learner_name": learner.full_name,
        "learner_email": learner.email,
        "assigned_at": entry.assigned_at,
    }


@router.delete("/educator/unassign/{learner_id}", status_code=status.HTTP_200_OK)
def unassign_learner_from_cohort(
    learner_id: int,
    current_user: models.User = Depends(require_role(["Educator", "Administrator"])),
    db: Session = Depends(get_db),
):
    """Remove a learner from the signed-in educator's cohort."""
    entry = (
        db.query(models.EducatorCohort)
        .filter(models.EducatorCohort.educator_id == current_user.id, models.EducatorCohort.learner_id == learner_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort entry not found.")
    db.delete(entry)
    db.commit()
    return {"detail": "Learner removed from cohort successfully."}


@router.get("/educator/my-cohort", response_model=List[schemas.EducatorCohortResponse])
def get_educator_cohort(
    current_user: models.User = Depends(require_role(["Educator", "Administrator"])),
    db: Session = Depends(get_db),
):
    """List every learner in the signed-in educator's cohort."""
    entries = (
        db.query(models.EducatorCohort)
        .filter(models.EducatorCohort.educator_id == current_user.id)
        .order_by(models.EducatorCohort.assigned_at.desc())
        .all()
    )
    result = []
    for e in entries:
        learner = db.query(models.User).filter(models.User.id == e.learner_id).first()
        if learner:
            result.append({
                "id": e.id,
                "educator_id": e.educator_id,
                "cohort_name": e.cohort_name,
                "learner_id": e.learner_id,
                "learner_name": learner.full_name,
                "learner_email": learner.email,
                "assigned_at": e.assigned_at,
            })
    return result
