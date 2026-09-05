from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user_optional, get_current_user
from routers.notifications import create_notification
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
        created_at=datetime.utcnow()
    )
    db.add(debate_session)
    db.commit()
    db.refresh(debate_session)

    if debate_session.status == "Scheduled":
        create_notification(
            db=db,
            user_id=current_user.id,
            category="Debate",
            title="Debate Practice Scheduled",
            message=f"Session on '{debate_session.topic[:50]}' scheduled for {debate_session.scheduled_at.strftime('%b %d, %Y at %H:%M')}."
        )

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
        argument_quality = latest_analysis.persuasiveness_score if latest_analysis else 82.0
        evidence_use = latest_analysis.evidence_strength if latest_analysis else 80.0
        logic = latest_analysis.logical_consistency if latest_analysis else 85.0
        communication = (
            (latest_metric.confidence_score + latest_metric.clarity_score + latest_metric.engagement_score) / 3.0
            if latest_metric
            else 84.0
        )
        calculated_score = (
            argument_quality * 0.30 + evidence_use * 0.20 + logic * 0.20 + argument_quality * 0.15 + communication * 0.15
        )
        existing_score = models.PerformanceScore(
            session_id=session_id,
            user_id=current_user.id,
            argument_quality=argument_quality,
            evidence_use=evidence_use,
            logical_consistency=logic,
            rebuttal_effectiveness=argument_quality,
            communication_skills=communication,
            overall_weighted_score=calculated_score,
            created_at=datetime.utcnow()
        )
        db.add(existing_score)
    else:
        calculated_score = existing_score.overall_weighted_score

    # Determine Category based on format
    category = "Agent Simulation" if "Simulation" in debate_session.format else "Debate"
    create_notification(
        db=db,
        user_id=current_user.id,
        category=category,
        title=f"{category} Session Completed",
        message=f"Session '{debate_session.topic[:45]}' completed. Performance score: {round(calculated_score, 1)}%."
    )

    db.commit()
    return {"message": "Debate session successfully completed and performance scores recorded.", "session_id": session_id, "score": round(calculated_score, 1)}


@router.get("/history")
def get_unified_session_history(
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Retrieves all sessions across Debate, Speech Analysis, Vocal Matrix, and Agent Simulation."""
    target_user_id = current_user.id if current_user else (user_id or 1)

    sessions = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.user_id == target_user_id)
        .order_by(models.DebateSession.created_at.desc())
        .all()
    )

    history = []
    for s in sessions:
        perf = db.query(models.PerformanceScore).filter(models.PerformanceScore.session_id == s.id).first()
        metric = db.query(models.PresentationMetric).filter(models.PresentationMetric.session_id == s.id).first()
        
        # Categorize session type cleanly
        fmt = (s.format or "").strip()
        if "Vocal" in fmt:
            session_type = "Vocal Matrix"
        elif "Speech" in fmt:
            session_type = "Speech Analysis"
        elif "Simulation" in fmt:
            session_type = "Agent Simulation"
        else:
            session_type = "Debate"

        score_val = round(perf.overall_weighted_score, 1) if perf else (
            round(metric.confidence_score * 0.5 + metric.clarity_score * 0.5, 1) if metric else 85.0
        )

        history.append({
            "id": s.id,
            "title": s.title,
            "topic": s.topic,
            "format": s.format,
            "session_type": session_type,
            "position": s.assigned_position,
            "status": s.status,
            "score": score_val,
            "date": s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else "Recent",
            "created_at": s.created_at.isoformat() if s.created_at else datetime.utcnow().isoformat(),
            "metrics": {
                "wpm": metric.speech_pace_wpm if metric else None,
                "filler_words": metric.filler_words_count if metric else None,
                "confidence": metric.confidence_score if metric else None,
                "clarity": metric.clarity_score if metric else None
            } if metric else None
        })

    return history


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
