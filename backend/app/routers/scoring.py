import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, DebateSession, DebateTurn, DebateScore
from ..schemas import DebateScoreRequest, DebateScoreResponse
from .auth import get_current_user

router = APIRouter(prefix="/scoring", tags=["Performance Scoring Engine"])

def calculate_grade(score: float) -> str:
    if score >= 92.0:
        return "A+"
    elif score >= 85.0:
        return "A"
    elif score >= 80.0:
        return "B+"
    elif score >= 75.0:
        return "B"
    elif score >= 70.0:
        return "C+"
    elif score >= 60.0:
        return "C"
    else:
        return "Needs Work"

@router.post("/evaluate", response_model=DebateScoreResponse)
def evaluate_debate(
    req: DebateScoreRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(DebateSession).filter(DebateSession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")

    # If scores are not explicitly passed, compute them from session turns
    user_turns = db.query(DebateTurn).filter(
        DebateTurn.session_id == session.id,
        DebateTurn.speaker.like("User%")
    ).all()

    turn_count = len(user_turns)
    total_words = sum(len(t.content.split()) for t in user_turns)

    # Heuristic scoring defaults based on volume, turn participation, and complexity
    base_q = 78.0 + min(15.0, turn_count * 3.0)
    base_e = 72.0 + (12.0 if total_words > 120 else 4.0)
    base_l = 80.0 + min(12.0, turn_count * 2.0)
    base_r = 75.0 + min(15.0, turn_count * 3.5)
    base_c = 82.0 + (8.0 if total_words > 80 else 0.0)

    arg_q = req.argument_quality if req.argument_quality is not None else min(96.0, base_q)
    evi_u = req.evidence_usage if req.evidence_usage is not None else min(95.0, base_e)
    log_c = req.logical_consistency if req.logical_consistency is not None else min(98.0, base_l)
    reb_e = req.rebuttal_effectiveness if req.rebuttal_effectiveness is not None else min(95.0, base_r)
    com_s = req.communication_skills if req.communication_skills is not None else min(96.0, base_c)

    # Exact weighted model from specifications:
    # Argument Quality (30%) + Evidence Usage (20%) + Logical Consistency (20%) + Rebuttal Effectiveness (15%) + Communication Skills (15%)
    overall = (
        (0.30 * arg_q) +
        (0.20 * evi_u) +
        (0.20 * log_c) +
        (0.15 * reb_e) +
        (0.15 * com_s)
    )
    overall = round(overall, 1)
    grade = calculate_grade(overall)

    strengths = []
    weaknesses = []

    if arg_q >= 80:
        strengths.append("Strong claim articulation with substantive topical focus.")
    else:
        weaknesses.append("Sharpen thesis statements and clearly distinguish primary from secondary arguments.")

    if evi_u >= 80:
        strengths.append("Effective deployment of empirical data and factual grounding.")
    else:
        weaknesses.append("Integrate more empirical citations and verified statistics to substantiate premises.")

    if log_c >= 80:
        strengths.append("High deductive rigor with well-chained inferential links.")
    else:
        weaknesses.append("Avoid hasty generalization and strengthen transitional causal logic.")

    if reb_e >= 80:
        strengths.append("Agile cross-examination and sharp direct clash with opponent points.")
    else:
        weaknesses.append("Directly address opponent's core warrants rather than conceding peripheral ground.")

    if com_s >= 80:
        strengths.append("Persuasive rhetorical poise, measured cadence, and authoritative delivery.")
    else:
        weaknesses.append("Work on vocal pacing and eliminate vocal fillers for crisp delivery.")

    summary = (
        f"Overall {grade} performance. Final composite score of {overall}%. "
        f"{strengths[0] if strengths else ''} To advance to championship caliber, {weaknesses[0] if weaknesses else ''}"
    )

    score_record = DebateScore(
        session_id=session.id,
        user_id=session.user_id,
        argument_quality=arg_q,
        evidence_usage=evi_u,
        logical_consistency=log_c,
        rebuttal_effectiveness=reb_e,
        communication_skills=com_s,
        overall_score=overall,
        grade=grade,
        strengths=json.dumps(strengths),
        weaknesses=json.dumps(weaknesses),
        feedback_summary=summary
    )
    db.add(score_record)

    # Mark session completed if not already
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(score_record)

    return {
        "id": score_record.id,
        "session_id": score_record.session_id,
        "user_id": score_record.user_id,
        "argument_quality": score_record.argument_quality,
        "evidence_usage": score_record.evidence_usage,
        "logical_consistency": score_record.logical_consistency,
        "rebuttal_effectiveness": score_record.rebuttal_effectiveness,
        "communication_skills": score_record.communication_skills,
        "overall_score": score_record.overall_score,
        "grade": score_record.grade,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "feedback_summary": score_record.feedback_summary,
        "created_at": score_record.created_at
    }

@router.get("/session/{session_id}", response_model=DebateScoreResponse)
def get_session_score(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    score = db.query(DebateScore).filter(DebateScore.session_id == session_id).first()
    if not score:
        raise HTTPException(status_code=404, detail="Scorecard not yet generated for this session")
    
    return {
        "id": score.id,
        "session_id": score.session_id,
        "user_id": score.user_id,
        "argument_quality": score.argument_quality,
        "evidence_usage": score.evidence_usage,
        "logical_consistency": score.logical_consistency,
        "rebuttal_effectiveness": score.rebuttal_effectiveness,
        "communication_skills": score.communication_skills,
        "overall_score": score.overall_score,
        "grade": score.grade,
        "strengths": json.loads(score.strengths) if score.strengths else [],
        "weaknesses": json.loads(score.weaknesses) if score.weaknesses else [],
        "feedback_summary": score.feedback_summary,
        "created_at": score.created_at
    }
