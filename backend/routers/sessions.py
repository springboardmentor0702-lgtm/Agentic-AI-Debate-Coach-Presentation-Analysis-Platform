from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
import models
import schemas


router = APIRouter(prefix="/api/v1/sessions", tags=["Debate Session Management"])


@router.post("/create", response_model=schemas.DebateSessionResponse)
def create_debate_session(
    session_data: schemas.DebateSessionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate_session = models.DebateSession(
        user_id=current_user.id,
        title=session_data.title.strip(),
        topic=session_data.topic.strip(),
        format=session_data.format or "AI Simulation",
        assigned_position=session_data.assigned_position or "Affirmative",
        status=session_data.status or "Active",
        scheduled_at=session_data.scheduled_at or datetime.utcnow(),
    )
    db.add(debate_session)
    db.commit()
    db.refresh(debate_session)
    return debate_session


@router.post("/{session_id}/complete")
def complete_debate_session(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate_session = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.id == session_id, models.DebateSession.user_id == current_user.id)
        .first()
    )
    if not debate_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found.")

    debate_session.status = "Completed"
    existing_score = db.query(models.PerformanceScore).filter(models.PerformanceScore.session_id == session_id).first()
    if not existing_score:
        analyses = db.query(models.ArgumentAnalysis).filter(models.ArgumentAnalysis.session_id == session_id).all()
        metrics = db.query(models.PresentationMetric).filter(models.PresentationMetric.session_id == session_id).all()
        latest_analysis = analyses[-1] if analyses else None
        latest_metric = metrics[-1] if metrics else None
        argument_quality = latest_analysis.persuasiveness_score if latest_analysis else 0.0
        evidence_use = latest_analysis.evidence_strength if latest_analysis else 0.0
        logic = latest_analysis.logical_consistency if latest_analysis else 0.0
        communication = (
            (latest_metric.confidence_score + latest_metric.clarity_score + latest_metric.engagement_score) / 3.0
            if latest_metric
            else 0.0
        )
        existing_score = models.PerformanceScore(
            session_id=session_id,
            user_id=current_user.id,
            argument_quality=argument_quality,
            evidence_use=evidence_use,
            logical_consistency=logic,
            rebuttal_effectiveness=argument_quality,
            communication_skills=communication,
            overall_weighted_score=(
                argument_quality * 0.30 + evidence_use * 0.20 + logic * 0.20 + argument_quality * 0.15 + communication * 0.15
            ),
        )
        db.add(existing_score)
    db.commit()
    return {"message": "Debate session successfully completed and performance scores recorded.", "session_id": session_id}


@router.get("/user/me", response_model=List[schemas.DebateSessionResponse])
def get_my_sessions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.DebateSession).filter(models.DebateSession.user_id == current_user.id).order_by(models.DebateSession.created_at.desc()).all()


@router.get("/user/{user_id}", response_model=List[schemas.DebateSessionResponse])
def get_user_sessions(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own sessions.")
    return db.query(models.DebateSession).filter(models.DebateSession.user_id == current_user.id).order_by(models.DebateSession.created_at.desc()).all()


@router.get("/{session_id}", response_model=schemas.DebateSessionResponse)
def get_session_by_id(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate_session = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.id == session_id, models.DebateSession.user_id == current_user.id)
        .first()
    )
    if not debate_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found.")
    return debate_session
