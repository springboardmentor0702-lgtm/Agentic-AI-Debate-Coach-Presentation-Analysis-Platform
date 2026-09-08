import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import get_current_user
from services.ai_engine import SUPPORTED_PERSONAS, ai_engine_service
import models, schemas

router = APIRouter(prefix="/api/v1/simulation", tags=["AI Debate Simulation Engine"])

@router.post("/turn", response_model=schemas.SimulationTurnResponse)
def run_simulation_turn(payload: schemas.SimulationTurnSubmit, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    debate_session = db.query(models.DebateSession).filter(models.DebateSession.id == payload.session_id, models.DebateSession.user_id == current_user.id).first()
    if not debate_session:
        raise HTTPException(status_code=404, detail="Debate session not found for this user.")
    persona = payload.opponent_persona if payload.opponent_persona in SUPPORTED_PERSONAS else "The Contrarian"
    try:
        analysis = ai_engine_service.analyze_argument(payload.user_argument)
        simulation_result = ai_engine_service.generate_simulation_response(payload.user_argument, persona)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    prior_turns = db.query(func.count(models.SimulationTurn.id)).filter(models.SimulationTurn.session_id == payload.session_id).scalar() or 0
    turn_index = int(prior_turns) + 1
    # Persist the same analysis used by the live simulation so completion/reporting has real data.
    new_analysis = models.ArgumentAnalysis(
        session_id=payload.session_id, user_id=current_user.id, raw_speech_text=payload.user_argument,
        claim_identified=analysis["claim_identified"], evidence_strength=analysis["evidence_strength"],
        reasoning_quality=analysis["reasoning_quality"], clarity_score=analysis["clarity_score"],
        relevance_score=analysis["relevance_score"], logical_consistency=analysis["logical_consistency"],
        persuasiveness_score=analysis["persuasiveness_score"])
    db.add(new_analysis); db.flush()
    for fallacy in analysis["fallacies"]:
        db.add(models.FallacyLog(analysis_id=new_analysis.id, user_id=current_user.id, fallacy_type=fallacy["fallacy_type"], explanation=fallacy["explanation"], correction_suggestion=fallacy["correction_suggestion"]))
    for counter in analysis["counterarguments"]:
        db.add(models.Counterargument(analysis_id=new_analysis.id, rebuttal_type=counter["rebuttal_type"], rebuttal_text=counter["rebuttal_text"], challenge_question=counter["challenge_question"], strategy_tip=counter["strategy_tip"]))
    turn = models.SimulationTurn(session_id=payload.session_id, user_id=current_user.id, turn_index=turn_index, user_argument=payload.user_argument, opponent_persona=persona, opponent_rebuttal=simulation_result["opponent_rebuttal"], fallacies_json=json.dumps(simulation_result["fallacies_detected"]), rebuttal_strength_percent=simulation_result["rebuttal_strength_percent"], coaching_tip=simulation_result["coaching_tip"])
    db.add(turn); debate_session.round_number = turn_index; db.commit()
    return {"session_id": payload.session_id, "turn_index": turn_index, "user_argument": payload.user_argument, "opponent_persona": persona, "opponent_rebuttal": simulation_result["opponent_rebuttal"], "fallacies_detected_in_user": simulation_result["fallacies_detected"], "rebuttal_strength_percent": simulation_result["rebuttal_strength_percent"], "coaching_tip": simulation_result["coaching_tip"]}
