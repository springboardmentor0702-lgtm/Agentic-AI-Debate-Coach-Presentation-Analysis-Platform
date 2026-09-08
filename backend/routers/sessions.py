from datetime import datetime
from typing import List
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import get_current_user
from services.ai_engine import ai_engine_service
from services.permissions import can_view_student
import models, schemas

router = APIRouter(prefix="/api/v1/sessions", tags=["Debate Session Management"])

@router.post("/create", response_model=schemas.DebateSessionResponse)
def create_debate_session(session_data: schemas.DebateSessionCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    debate_session = models.DebateSession(user_id=current_user.id, title=session_data.title.strip(), topic=session_data.topic.strip(), format=session_data.format or "AI Simulation", assigned_position=session_data.assigned_position or "Affirmative", status=session_data.status or "Active", scheduled_at=session_data.scheduled_at or datetime.utcnow())
    db.add(debate_session); db.commit(); db.refresh(debate_session); return debate_session

@router.post("/{session_id}/complete")
def complete_debate_session(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    debate_session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id, models.DebateSession.user_id == current_user.id).first()
    if not debate_session: raise HTTPException(status_code=404, detail="Debate session not found.")
    debate_session.status = "Completed"
    existing = db.query(models.PerformanceScore).filter(models.PerformanceScore.session_id == session_id).order_by(models.PerformanceScore.id.desc()).first()
    if not existing:
        analyses = db.query(models.ArgumentAnalysis).filter(models.ArgumentAnalysis.session_id == session_id).all()
        turns = db.query(models.SimulationTurn).filter(models.SimulationTurn.session_id == session_id).all()
        metrics = db.query(models.PresentationMetric).filter(models.PresentationMetric.session_id == session_id).all()
        if analyses:
            avg = lambda attr: sum(float(getattr(a, attr) or 0) for a in analyses) / len(analyses)
            arg_quality = avg("persuasiveness_score"); evidence = avg("evidence_strength"); logic = avg("logical_consistency")
            comm = ((avg("clarity_score") + avg("relevance_score")) / 2)
        else:
            arg_quality = evidence = logic = comm = 0.0
        rebuttal = sum(float(t.rebuttal_strength_percent or 0) for t in turns) / len(turns) if turns else arg_quality
        if metrics:
            comm = (comm + sum((m.confidence_score + m.clarity_score + m.engagement_score) / 3 for m in metrics) / len(metrics)) / 2
        overall = ai_engine_service.calculate_weighted_score(arg_quality, evidence, logic, rebuttal, comm)
        existing = models.PerformanceScore(session_id=session_id, user_id=current_user.id, argument_quality=arg_quality, evidence_use=evidence, logical_consistency=logic, rebuttal_effectiveness=rebuttal, communication_skills=comm, overall_weighted_score=overall)
        db.add(existing)
    db.commit()
    return {"message": "Debate session completed and performance score recorded.", "session_id": session_id, "overall_weighted_score": existing.overall_weighted_score}

@router.get("/user/me", response_model=List[schemas.DebateSessionResponse])
def get_my_sessions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.DebateSession).filter(models.DebateSession.user_id == current_user.id).order_by(models.DebateSession.created_at.desc()).all()

@router.get("/user/{user_id}", response_model=List[schemas.DebateSessionResponse])
def get_user_sessions(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id == current_user.id:
        return get_my_sessions(current_user, db)
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target or not can_view_student(current_user, target):
        raise HTTPException(status_code=403, detail="You can only view the sessions of your own assigned students.")
    return db.query(models.DebateSession).filter(models.DebateSession.user_id == user_id).order_by(models.DebateSession.created_at.desc()).all()

@router.get("/{session_id}", response_model=schemas.DebateSessionResponse)
def get_session_by_id(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj = db.query(models.DebateSession).filter(models.DebateSession.id == session_id, models.DebateSession.user_id == current_user.id).first()
    if not obj: raise HTTPException(status_code=404, detail="Debate session not found.")
    return obj

@router.get("/{session_id}/conversation")
def get_session_conversation(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The full turn-by-turn debate transcript for one session: each of the
    student's arguments alongside the AI opponent's rebuttal, the fallacies
    flagged in that turn, and the coaching tip given at the time. Lets a
    Coach/Educator/Administrator read what was actually said before writing
    feedback, instead of going only off the final score.
    Viewable by the session's owner, their assigned mentor, or an Admin."""
    session_obj = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    owner = db.query(models.User).filter(models.User.id == session_obj.user_id).first()
    if not owner or not can_view_student(current_user, owner):
        raise HTTPException(status_code=403, detail="You can only view the conversation of your own assigned students.")

    turns = (
        db.query(models.SimulationTurn)
        .filter(models.SimulationTurn.session_id == session_id)
        .order_by(models.SimulationTurn.turn_index.asc())
        .all()
    )
    formatted_turns = []
    for t in turns:
        try:
            fallacies = json.loads(t.fallacies_json or "[]")
        except (ValueError, TypeError):
            fallacies = []
        formatted_turns.append({
            "turn_index": t.turn_index,
            "user_argument": t.user_argument,
            "opponent_persona": t.opponent_persona,
            "opponent_rebuttal": t.opponent_rebuttal,
            "fallacies_detected": fallacies,
            "rebuttal_strength_percent": round(t.rebuttal_strength_percent or 0, 1),
            "coaching_tip": t.coaching_tip,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    return {
        "session_id": session_id,
        "title": session_obj.title,
        "topic": session_obj.topic,
        "format": session_obj.format,
        "assigned_position": session_obj.assigned_position,
        "status": session_obj.status,
        "student_name": owner.full_name,
        "turn_count": len(formatted_turns),
        "turns": formatted_turns,
    }
