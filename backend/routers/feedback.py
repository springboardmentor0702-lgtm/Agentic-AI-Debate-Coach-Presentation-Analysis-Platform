from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routers.auth import get_current_user, require_role

router = APIRouter(prefix="/api/v1/feedback", tags=["Coach Feedback"])


@router.post("", response_model=schemas.CoachFeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(
    feedback_data: schemas.CoachFeedbackCreate,
    current_user: models.User = Depends(require_role(["Debate Coach", "Educator", "Administrator"])),
    db: Session = Depends(get_db),
):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == feedback_data.session_id).first()
    learner = db.query(models.User).filter(models.User.id == feedback_data.learner_id).first()
    if not session or not learner or session.user_id != learner.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner session not found.")
    if session.status != "Completed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Feedback can only be added to completed sessions.")
    feedback = models.CoachFeedback(
        session_id=session.id,
        coach_id=current_user.id,
        learner_id=learner.id,
        content=feedback_data.content,
        rating=feedback_data.rating,
    )
    db.add(feedback)
    db.add(
        models.Notification(
            user_id=learner.id,
            category="Feedback Alert",
            title="New coaching feedback",
            message=f"{current_user.full_name} left feedback for your session '{session.title}'.",
            source_type="feedback",
        )
    )
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("/received", response_model=list[schemas.CoachFeedbackResponse])
def get_received_feedback(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.CoachFeedback)
        .filter(models.CoachFeedback.learner_id == current_user.id)
        .order_by(models.CoachFeedback.created_at.desc())
        .limit(100)
        .all()
    )


@router.get("/given", response_model=list[schemas.CoachFeedbackResponse])
def get_given_feedback(
    current_user: models.User = Depends(require_role(["Debate Coach", "Educator", "Administrator"])),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.CoachFeedback)
        .filter(models.CoachFeedback.coach_id == current_user.id)
        .order_by(models.CoachFeedback.created_at.desc())
        .limit(100)
        .all()
    )
