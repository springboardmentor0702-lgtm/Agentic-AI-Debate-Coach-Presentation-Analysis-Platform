from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, DebateSession, DebateTurn
from ..schemas import SimulationTurnRequest, SimulationTurnResponse
from ..services.simulation_engine import simulation_engine
from .auth import get_current_user

router = APIRouter(prefix="/simulation", tags=["AI Debate Simulation Engine"])

@router.post("/turn", response_model=SimulationTurnResponse)
def execute_simulation_turn(
    req: SimulationTurnRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(DebateSession).filter(DebateSession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")

    turn_count = db.query(DebateTurn).filter(DebateTurn.session_id == session.id).count()

    # 1. Record User Turn
    user_turn = DebateTurn(
        session_id=session.id,
        speaker=f"User ({session.user_position})",
        turn_number=turn_count + 1,
        content=req.user_argument
    )
    db.add(user_turn)
    db.commit()
    db.refresh(user_turn)

    # 2. Opponent Position is opposite
    opp_position = "Negative" if session.user_position.lower() == "affirmative" else "Affirmative"

    # 3. Generate AI Turn
    sim_result = simulation_engine.generate_opponent_turn(
        topic=session.topic,
        opponent_persona=session.ai_persona or "Dr. Eleanor Vance (Empirical Scholar)",
        opponent_position=opp_position,
        user_argument=req.user_argument,
        turn_number=turn_count + 2,
        debate_format=session.format
    )

    # 4. Record AI Turn
    ai_turn = DebateTurn(
        session_id=session.id,
        speaker=f"AI Opponent ({session.ai_persona})",
        turn_number=turn_count + 2,
        content=sim_result["ai_response"]
    )
    db.add(ai_turn)
    db.commit()
    db.refresh(ai_turn)

    return {
        "user_turn": user_turn,
        "ai_turn": ai_turn,
        "live_coaching_hint": sim_result["live_coaching_hint"],
        "detected_fallacies": sim_result["detected_fallacies"],
        "quick_tips": sim_result["quick_tips"],
        "ai_feedback": sim_result.get("ai_feedback")
    }
