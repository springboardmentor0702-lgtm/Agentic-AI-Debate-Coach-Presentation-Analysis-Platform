from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
import models


router = APIRouter(
    prefix="/api/v1/coach-feedback",
    tags=["Coach Feedback"]
)


@router.post("")
def create_coach_feedback(
    learner_id: int,
    feedback: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "Debate Coach":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Debate Coaches can send feedback."
        )

    learner = (
        db.query(models.User)
        .filter(
            models.User.id == learner_id,
            models.User.role == "Learner"
        )
        .first()
    )

    if not learner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learner not found."
        )

    if not feedback.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback cannot be empty."
        )

    coach_feedback = models.CoachFeedback(
        coach_id=current_user.id,
        learner_id=learner_id,
        feedback=feedback.strip()
    )

    db.add(coach_feedback)
    db.commit()
    db.refresh(coach_feedback)

    return {
        "status": "success",
        "message": "Coaching feedback dispatched successfully.",
        "feedback_id": coach_feedback.id,
        "learner_id": learner_id
    }


@router.get("/student/{learner_id}")
def get_coach_feedback(
    learner_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != learner_id and current_user.role != "Debate Coach":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own coaching feedback."
        )

    feedback_items = (
        db.query(models.CoachFeedback)
        .filter(models.CoachFeedback.learner_id == learner_id)
        .order_by(models.CoachFeedback.id.desc())
        .all()
    )

    return [
        {
            "id": item.id,
            "coach_id": item.coach_id,
            "learner_id": item.learner_id,
            "feedback": item.feedback,
            "created_at": (
                item.created_at.isoformat()
                if item.created_at
                else None
            )
        }
        for item in feedback_items
    ]

@router.get("/my")
def get_my_coach_feedback(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "Learner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Learners can access their own coach feedback."
        )

    feedback_items = (
        db.query(models.CoachFeedback)
        .filter(models.CoachFeedback.learner_id == current_user.id)
        .order_by(models.CoachFeedback.id.desc())
        .all()
    )

    return [
        {
            "id": item.id,
            "coach_id": item.coach_id,
            "learner_id": item.learner_id,
            "feedback": item.feedback,
            "created_at": (
                item.created_at.isoformat()
                if item.created_at
                else None
            )
        }
        for item in feedback_items
    ]
