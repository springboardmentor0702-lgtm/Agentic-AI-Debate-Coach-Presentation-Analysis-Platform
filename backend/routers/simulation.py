import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from services.ai_engine import SUPPORTED_PERSONAS, ai_engine_service
import models
import schemas


router = APIRouter(prefix="/api/v1/simulation", tags=["AI Debate Simulation Engine"])


@router.post("/turn", response_model=schemas.SimulationTurnResponse)
def run_simulation_turn(
    payload: schemas.SimulationTurnSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate_session = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.id == payload.session_id, models.DebateSession.user_id == current_user.id)
        .first()
    )
    if not debate_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found for this user.")

    persona = payload.opponent_persona if payload.opponent_persona in SUPPORTED_PERSONAS else "The Contrarian"
    try:
        simulation_result = ai_engine_service.generate_simulation_response(payload.user_argument, persona)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    prior_turns = db.query(func.count(models.SimulationTurn.id)).filter(models.SimulationTurn.session_id == payload.session_id).scalar() or 0
    turn_index = int(prior_turns) + 1
    turn = models.SimulationTurn(
        session_id=payload.session_id,
        user_id=current_user.id,
        turn_index=turn_index,
        user_argument=payload.user_argument,
        opponent_persona=persona,
        opponent_rebuttal=simulation_result["opponent_rebuttal"],
        fallacies_json=json.dumps(simulation_result["fallacies_detected"]),
        rebuttal_strength_percent=simulation_result["rebuttal_strength_percent"],
        coaching_tip=simulation_result["coaching_tip"],
    )
    db.add(turn)
    db.commit()

    return {
        "session_id": payload.session_id,
        "turn_index": turn_index,
        "user_argument": payload.user_argument,
        "opponent_persona": persona,
        "opponent_rebuttal": simulation_result["opponent_rebuttal"],
        "fallacies_detected_in_user": simulation_result["fallacies_detected"],
        "rebuttal_strength_percent": simulation_result["rebuttal_strength_percent"],
        "coaching_tip": simulation_result["coaching_tip"],
    }
