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

    analyses = db.query(models.ArgumentAnalysis).filter(
        models.ArgumentAnalysis.session_id == session_id,
        models.ArgumentAnalysis.user_id == current_user.id
    ).order_by(models.ArgumentAnalysis.id.desc()).all()
    metrics = db.query(models.PresentationMetric).filter(
        models.PresentationMetric.session_id == session_id,
        models.PresentationMetric.user_id == current_user.id
    ).order_by(models.PresentationMetric.id.desc()).all()
    turns = db.query(models.SimulationTurn).filter(
        models.SimulationTurn.session_id == session_id,
        models.SimulationTurn.user_id == current_user.id
    ).order_by(models.SimulationTurn.id.desc()).all()

    latest_analysis = analyses[0] if analyses else None
    latest_metric = metrics[0] if metrics else None
    latest_turn = turns[0] if turns else None

    # Score the whole practice session from all saved turns/analyses. This
    # prevents a valid multi-turn session from displaying 0 just because the
    # newest record is missing one optional metric.
    def avg(items, attr):
        values = []
        for item in items:
            value = getattr(item, attr, None)
            try:
                number = float(value)
            except (TypeError, ValueError):
                continue
            if number >= 0:
                values.append(number)
        return sum(values) / len(values) if values else 0.0

    argument_quality = avg(analyses, "persuasiveness_score")
    evidence_use = avg(analyses, "evidence_strength")
    logic = avg(analyses, "logical_consistency")
    rebuttal = avg(turns, "rebuttal_strength_percent")

    # Prefer actual presentation metrics when available. Otherwise use the
    # average argument clarity as a communication proxy.
    if metrics:
        communication_values = []
        for metric in metrics:
            parts = []
            for attr in ("confidence_score", "clarity_score", "engagement_score"):
                value = getattr(metric, attr, None)
                try:
                    parts.append(float(value))
                except (TypeError, ValueError):
                    pass
            if parts:
                communication_values.append(sum(parts) / len(parts))
        communication = sum(communication_values) / len(communication_values) if communication_values else avg(analyses, "clarity_score")
    else:
        communication = avg(analyses, "clarity_score")

    if not analyses and not turns and not metrics:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No debate analysis or simulation turns were recorded for this session. Send at least one argument before completing the session."
        )

    overall = (
        argument_quality * 0.30
        + evidence_use * 0.20
        + logic * 0.20
        + rebuttal * 0.15
        + communication * 0.15
    )

    score = db.query(models.PerformanceScore).filter(
        models.PerformanceScore.session_id == session_id,
        models.PerformanceScore.user_id == current_user.id
    ).order_by(models.PerformanceScore.id.desc()).first()

    if score is None:
        score = models.PerformanceScore(
            session_id=session_id,
            user_id=current_user.id,
        )
        db.add(score)

    # Always refresh the stored score so reports stay consistent with the
    # latest analysis/turn rather than keeping stale demo values.
    score.argument_quality = argument_quality
    score.evidence_use = evidence_use
    score.logical_consistency = logic
    score.rebuttal_effectiveness = rebuttal
    score.communication_skills = communication
    score.overall_weighted_score = overall
    debate_session.status = "Completed"

    db.commit()
    db.refresh(score)

    return {
        "message": "Debate session successfully completed and performance scores recorded.",
        "session_id": session_id,
        "scores": {
            "overall": round(float(score.overall_weighted_score), 1),
            "argument_quality": round(float(score.argument_quality), 1),
            "evidence_use": round(float(score.evidence_use), 1),
            "logical_consistency": round(float(score.logical_consistency), 1),
            "rebuttal_effectiveness": round(float(score.rebuttal_effectiveness), 1),
            "communication_skills": round(float(score.communication_skills), 1),
        },
        "presentation_metrics": ({
            "speech_pace_wpm": round(float(latest_metric.speech_pace_wpm), 1),
            "filler_words_count": int(latest_metric.filler_words_count or 0),
            "filler_words_list": latest_metric.filler_words_list or "None",
            "confidence_score": round(float(latest_metric.confidence_score), 1),
            "clarity_score": round(float(latest_metric.clarity_score), 1),
            "engagement_score": round(float(latest_metric.engagement_score), 1),
        } if latest_metric else None)
    }


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
