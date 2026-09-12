from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db
from routers.auth import get_current_user

router = APIRouter(
    prefix="/api/v1/coach-assignments",
    tags=["Coach Assignments"]
)


def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "Administrator":
        raise HTTPException(status_code=403, detail="Administrator access required.")
    return current_user


@router.get("/")
def list_assignments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    coaches = (
        db.query(models.User)
        .filter(models.User.role == "Debate Coach")
        .order_by(models.User.full_name)
        .all()
    )

    learners = (
        db.query(models.User)
        .filter(models.User.role == "Learner")
        .order_by(models.User.full_name)
        .all()
    )

    return {
        "coaches": [
            {
                "id": coach.id,
                "name": coach.full_name,
                "email": coach.email
            }
            for coach in coaches
        ],
        "learners": [
            {
                "id": learner.id,
                "name": learner.full_name,
                "email": learner.email,
                "coach_id": learner.coach_id
            }
            for learner in learners
        ]
    }


@router.post("/{learner_id}/{coach_id}")
def assign_learner(
    learner_id: int,
    coach_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    learner = (
        db.query(models.User)
        .filter(
            models.User.id == learner_id,
            models.User.role == "Learner"
        )
        .first()
    )

    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found.")

    coach = (
        db.query(models.User)
        .filter(
            models.User.id == coach_id,
            models.User.role == "Debate Coach"
        )
        .first()
    )

    if not coach:
        raise HTTPException(status_code=404, detail="Debate Coach not found.")

    learner.coach_id = coach.id
    db.commit()
    db.refresh(learner)

    return {
        "message": "Learner assigned successfully.",
        "learner_id": learner.id,
        "coach_id": learner.coach_id
    }


@router.delete("/{learner_id}")
def unassign_learner(
    learner_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    learner = (
        db.query(models.User)
        .filter(
            models.User.id == learner_id,
            models.User.role == "Learner"
        )
        .first()
    )

    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found.")

    learner.coach_id = None
    db.commit()

    return {
        "message": "Learner unassigned successfully.",
        "learner_id": learner.id
    }

