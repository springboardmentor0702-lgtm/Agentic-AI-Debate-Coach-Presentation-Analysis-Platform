from datetime import datetime, timezone
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
        scheduled_at=session_data.scheduled_at or datetime.now(timezone.utc).replace(tzinfo=None),
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
        turns = db.query(models.SimulationTurn).filter(models.SimulationTurn.session_id == session_id).all()
        argument_quality = latest_analysis.persuasiveness_score if latest_analysis else 0.0
        evidence_use = latest_analysis.evidence_strength if latest_analysis else 0.0
        logic = latest_analysis.logical_consistency if latest_analysis else 0.0
        communication = (
            (latest_metric.confidence_score + latest_metric.clarity_score + latest_metric.engagement_score) / 3.0
            if latest_metric
            else 0.0
        )
        rebuttal_effectiveness = (
            sum(turn.rebuttal_strength_percent for turn in turns) / len(turns)
            if turns else argument_quality
        )
        existing_score = models.PerformanceScore(
            session_id=session_id,
            user_id=current_user.id,
            argument_quality=argument_quality,
            evidence_use=evidence_use,
            logical_consistency=logic,
            rebuttal_effectiveness=rebuttal_effectiveness,
            communication_skills=communication,
            overall_weighted_score=(
                argument_quality * 0.30 + evidence_use * 0.20 + logic * 0.20 + rebuttal_effectiveness * 0.15 + communication * 0.15
            ),
        )
        db.add(existing_score)
        db.flush()
        if existing_score.overall_weighted_score >= 80:
            prior_alert = db.query(models.Notification).filter(
                models.Notification.user_id == current_user.id,
                models.Notification.source_type == "score",
                models.Notification.source_id == existing_score.id,
            ).first()
            if not prior_alert:
                db.add(models.Notification(
                    user_id=current_user.id,
                    category="Milestone Alert",
                    title="Performance milestone achieved",
                    message=f"You scored {existing_score.overall_weighted_score:.1f}% in '{debate_session.title}'.",
                    source_type="score",
                    source_id=existing_score.id,
                ))
    db.commit()
    return {"message": "Debate session successfully completed and performance scores recorded.", "session_id": session_id}


@router.patch("/{session_id}/status", response_model=schemas.DebateSessionResponse)
def update_session_status(
    session_id: int,
    payload: schemas.DebateSessionStatusUpdate,
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

    debate_session.status = payload.status
    if payload.status in {"Completed", "Ended"}:
        existing_score = db.query(models.PerformanceScore).filter(models.PerformanceScore.session_id == session_id).first()
        if not existing_score:
            analyses = db.query(models.ArgumentAnalysis).filter(models.ArgumentAnalysis.session_id == session_id).all()
            metrics = db.query(models.PresentationMetric).filter(models.PresentationMetric.session_id == session_id).all()
            latest_analysis = analyses[-1] if analyses else None
            latest_metric = metrics[-1] if metrics else None
            turns = db.query(models.SimulationTurn).filter(models.SimulationTurn.session_id == session_id).all()
            argument_quality = latest_analysis.persuasiveness_score if latest_analysis else 0.0
            evidence_use = latest_analysis.evidence_strength if latest_analysis else 0.0
            logic = latest_analysis.logical_consistency if latest_analysis else 0.0
            communication = (
                (latest_metric.confidence_score + latest_metric.clarity_score + latest_metric.engagement_score) / 3.0
                if latest_metric
                else 0.0
            )
            rebuttal_effectiveness = (
                sum(turn.rebuttal_strength_percent for turn in turns) / len(turns)
                if turns else argument_quality
            )
            existing_score = models.PerformanceScore(
                session_id=session_id,
                user_id=current_user.id,
                argument_quality=argument_quality,
                evidence_use=evidence_use,
                logical_consistency=logic,
                rebuttal_effectiveness=rebuttal_effectiveness,
                communication_skills=communication,
                overall_weighted_score=(
                    argument_quality * 0.30 + evidence_use * 0.20 + logic * 0.20 + rebuttal_effectiveness * 0.15 + communication * 0.15
                ),
            )
            db.add(existing_score)
            db.flush()

    db.commit()
    db.refresh(debate_session)
    return debate_session


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


@router.get("/{session_id}/details", response_model=schemas.DebateSessionDetailResponse)
def get_session_details(
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

    presentation_metrics = (
        db.query(models.PresentationMetric)
        .filter(models.PresentationMetric.session_id == session_id)
        .order_by(models.PresentationMetric.created_at.desc())
        .all()
    )
    latest_metric = presentation_metrics[0] if presentation_metrics else None

    analyses = (
        db.query(models.ArgumentAnalysis)
        .filter(models.ArgumentAnalysis.session_id == session_id)
        .order_by(models.ArgumentAnalysis.created_at.desc())
        .all()
    )
    latest_analysis = None
    if analyses:
        first_a = analyses[0]
        latest_analysis = schemas.ArgumentAnalysisResponse(
            analysis_id=first_a.id,
            session_id=first_a.session_id,
            claim_identified=first_a.claim_identified or "",
            evidence_strength=first_a.evidence_strength or 0.0,
            reasoning_quality=first_a.reasoning_quality or 0.0,
            clarity_score=first_a.clarity_score or 0.0,
            relevance_score=first_a.relevance_score or 0.0,
            logical_consistency=first_a.logical_consistency or 0.0,
            persuasiveness_score=first_a.persuasiveness_score or 0.0,
            fallacies=[
                schemas.FallacyDetail(
                    fallacy_type=f.fallacy_type,
                    explanation=f.explanation or "",
                    correction_suggestion=f.correction_suggestion or "",
                )
                for f in first_a.fallacies
            ],
            counterarguments=[
                schemas.CounterargumentDetail(
                    rebuttal_type=c.rebuttal_type or "Logical",
                    rebuttal_text=c.rebuttal_text or "",
                    challenge_question=c.challenge_question or "",
                    strategy_tip=c.strategy_tip or "",
                )
                for c in first_a.counterarguments
            ],
        )

    turns = (
        db.query(models.SimulationTurn)
        .filter(models.SimulationTurn.session_id == session_id)
        .order_by(models.SimulationTurn.turn_index.asc())
        .all()
    )
    import json
    turn_responses = []
    for t in turns:
        try:
            fallacies_list = json.loads(t.fallacies_json) if t.fallacies_json else []
            f_objs = [
                schemas.FallacyDetail(
                    fallacy_type=f.get("fallacy_type", ""),
                    explanation=f.get("explanation", ""),
                    correction_suggestion=f.get("correction_suggestion", ""),
                )
                for f in fallacies_list
            ]
        except Exception:
            f_objs = []
        turn_responses.append(
            schemas.SimulationTurnResponse(
                session_id=t.session_id,
                turn_index=t.turn_index,
                user_argument=t.user_argument,
                opponent_persona=t.opponent_persona,
                opponent_rebuttal=t.opponent_rebuttal,
                fallacies_detected_in_user=f_objs,
                rebuttal_strength_percent=t.rebuttal_strength_percent or 0.0,
                coaching_tip=t.coaching_tip or "",
            )
        )

    perf_score = (
        db.query(models.PerformanceScore)
        .filter(models.PerformanceScore.session_id == session_id)
        .first()
    )
    score_response = None
    if perf_score:
        score_response = schemas.WeightedScoreResponse(
            session_id=perf_score.session_id,
            argument_quality=perf_score.argument_quality or 0.0,
            evidence_use=perf_score.evidence_use or 0.0,
            logical_consistency=perf_score.logical_consistency or 0.0,
            rebuttal_effectiveness=perf_score.rebuttal_effectiveness or 0.0,
            communication_skills=perf_score.communication_skills or 0.0,
            overall_weighted_score=perf_score.overall_weighted_score or 0.0,
        )

    return schemas.DebateSessionDetailResponse(
        session=schemas.DebateSessionResponse.model_validate(debate_session),
        latest_presentation_metric=schemas.PresentationMetricResponse.model_validate(latest_metric) if latest_metric else None,
        presentation_metrics=[schemas.PresentationMetricResponse.model_validate(m) for m in presentation_metrics],
        latest_argument_analysis=latest_analysis,
        simulation_turns=turn_responses,
        performance_score=score_response,
    )


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
