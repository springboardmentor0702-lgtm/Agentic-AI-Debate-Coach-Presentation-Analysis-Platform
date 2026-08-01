from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from services.ai_engine import ai_engine_service

router = APIRouter(prefix="/api/v1/simulation", tags=["AI Debate Simulation Engine"])

@router.post("/turn", response_model=schemas.SimulationTurnResponse)
def run_simulation_turn(payload: schemas.SimulationTurnSubmit, user_id: int = 1, db: Session = Depends(get_db)):
    persona = payload.opponent_persona or "The Contrarian"
    sim_res = ai_engine_service.generate_simulation_response(payload.user_argument, persona)
    
    return {
        "turn_index": 1,
        "user_argument": payload.user_argument,
        "opponent_rebuttal": sim_res["opponent_rebuttal"],
        "fallacies_detected_in_user": sim_res["fallacies_detected"],
        "rebuttal_strength_percent": sim_res["rebuttal_strength_percent"],
        "coaching_tip": sim_res["coaching_tip"]
    }
