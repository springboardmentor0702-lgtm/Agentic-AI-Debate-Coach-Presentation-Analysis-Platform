"""Shared session scoring and persistence helpers."""

from typing import Optional

from sqlalchemy.orm import Session

import models
from services.ai_engine import ai_engine_service


def _average(values):
    values = [float(value) for value in values if value is not None]
    return sum(values) / len(values) if values else 0.0


def derive_session_scores(db: Session, debate_session: models.DebateSession) -> dict:
    """Derive one deterministic rubric from the latest persisted session inputs."""
    analysis = (
        db.query(models.ArgumentAnalysis)
        .filter(models.ArgumentAnalysis.session_id == debate_session.id)
        .order_by(models.ArgumentAnalysis.created_at.desc(), models.ArgumentAnalysis.id.desc())
        .first()
    )
    metrics = (
        db.query(models.PresentationMetric)
        .filter(models.PresentationMetric.session_id == debate_session.id)
        .order_by(models.PresentationMetric.created_at.desc(), models.PresentationMetric.id.desc())
        .all()
    )
    turns = (
        db.query(models.SimulationTurn)
        .filter(models.SimulationTurn.session_id == debate_session.id)
        .order_by(models.SimulationTurn.turn_index.desc())
        .all()
    )

    argument_quality = float(analysis.persuasiveness_score) if analysis else _average([metric.confidence_score for metric in metrics])
    evidence_use = float(analysis.evidence_strength) if analysis else _average([metric.engagement_score for metric in metrics])
    logical_consistency = float(analysis.logical_consistency) if analysis else _average([metric.clarity_score for metric in metrics])
    rebuttal_effectiveness = _average([turn.rebuttal_strength_percent for turn in turns])
    if not rebuttal_effectiveness:
        rebuttal_effectiveness = argument_quality
    communication_skills = _average(
        [
            _average([metric.confidence_score, metric.clarity_score, metric.engagement_score])
            for metric in metrics
        ]
    )
    if not communication_skills:
        communication_skills = argument_quality

    sub_scores = {
        "argument_quality": argument_quality,
        "evidence_use": evidence_use,
        "logical_consistency": logical_consistency,
        "rebuttal_effectiveness": rebuttal_effectiveness,
        "communication_skills": communication_skills,
    }
    sub_scores = {key: max(0.0, min(100.0, value)) for key, value in sub_scores.items()}
    sub_scores["overall_weighted_score"] = ai_engine_service.calculate_weighted_score(
        sub_scores["argument_quality"],
        sub_scores["evidence_use"],
        sub_scores["logical_consistency"],
        sub_scores["rebuttal_effectiveness"],
        sub_scores["communication_skills"],
    )
    return sub_scores


def save_session_score(
    db: Session,
    debate_session: models.DebateSession,
    values: Optional[dict] = None,
) -> models.PerformanceScore:
    """Upsert the single canonical score row for a debate session."""
    score = (
        db.query(models.PerformanceScore)
        .filter(models.PerformanceScore.session_id == debate_session.id)
        .order_by(models.PerformanceScore.id.desc())
        .first()
    )
    if score is None:
        score = models.PerformanceScore(session_id=debate_session.id, user_id=debate_session.user_id)
        db.add(score)
    values = values or derive_session_scores(db, debate_session)
    for field in (
        "argument_quality",
        "evidence_use",
        "logical_consistency",
        "rebuttal_effectiveness",
        "communication_skills",
        "overall_weighted_score",
    ):
        setattr(score, field, values[field])
    return score
