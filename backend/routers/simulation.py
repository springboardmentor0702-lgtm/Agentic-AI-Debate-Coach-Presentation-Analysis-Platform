from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
import json
from services.ai_engine import ai_engine_service
from routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/simulation", tags=["AI Debate Simulation Engine"])

@router.post("/turn", response_model=schemas.SimulationTurnResponse)
def run_simulation_turn(
    payload: schemas.SimulationTurnCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    debate_session = db.query(models.DebateSession).filter(
        models.DebateSession.id == payload.session_id
    ).first()
    if not debate_session:
        raise HTTPException(status_code=404, detail="Debate session not found. Start a session first.")
    if debate_session.user_id != current_user.id and current_user.role != "Administrator":
        raise HTTPException(status_code=403, detail="You cannot add turns to another user's session.")
    # Get current turn number for this session
    last_turn = db.query(models.SimulationTurn).filter(
        models.SimulationTurn.session_id == payload.session_id
    ).order_by(models.SimulationTurn.turn_number.desc()).first()
    
    turn_number = (last_turn.turn_number + 1) if last_turn else 1
    
    # Generate AI response
    persona = payload.opponent_persona or "The Contrarian"
    sim_res = ai_engine_service.generate_simulation_response(payload.user_argument, persona)
    
    # Save turn to database
    new_turn = models.SimulationTurn(
        session_id=payload.session_id,
        user_id=current_user.id,
        turn_number=turn_number,
        user_argument=payload.user_argument,
        opponent_persona=persona,
        opponent_rebuttal=sim_res["opponent_rebuttal"],
        fallacies_detected=json.dumps(sim_res["fallacies_detected"]),
        rebuttal_strength_percent=sim_res["rebuttal_strength_percent"],
        coaching_tip=sim_res["coaching_tip"]
    )
    
    db.add(new_turn)
    db.commit()
    db.refresh(new_turn)
    
    return {
        "id": new_turn.id,
        "session_id": new_turn.session_id,
        "turn_number": new_turn.turn_number,
        "user_argument": new_turn.user_argument,
        "opponent_persona": new_turn.opponent_persona,
        "opponent_rebuttal": new_turn.opponent_rebuttal,
        "fallacies_detected": sim_res["fallacies_detected"],
        "rebuttal_strength_percent": new_turn.rebuttal_strength_percent,
        "coaching_tip": new_turn.coaching_tip,
        "created_at": new_turn.created_at
    }

@router.get("/session/{session_id}/turns")
def get_simulation_turns(session_id: int, db: Session = Depends(get_db)):
    turns = db.query(models.SimulationTurn).filter(
        models.SimulationTurn.session_id == session_id
    ).order_by(models.SimulationTurn.turn_number).all()
    
    return {
        "session_id": session_id,
        "total_turns": len(turns),
        "turns": [
            {
                "turn_number": turn.turn_number,
                "user_argument": turn.user_argument,
                "opponent_rebuttal": turn.opponent_rebuttal,
                "opponent_persona": turn.opponent_persona,
                "rebuttal_strength_percent": turn.rebuttal_strength_percent,
                "created_at": turn.created_at
            }
            for turn in turns
        ]
    }

@router.get("/personas")
def get_available_personas():
    return {
        "personas": [
            {
                "name": "The Contrarian",
                "description": "Directly challenging assumptions with aggressive counter-evidence",
                "style": "Aggressive, direct, evidence-focused"
            },
            {
                "name": "The Academic",
                "description": "Socratic, precise, demanding rigorous citations and methodological clarity",
                "style": "Methodical, citation-focused, analytical"
            },
            {
                "name": "The Strategist",
                "description": "Focusing on pragmatic policy outcomes, unintended consequences, and cost-benefit trade-offs",
                "style": "Pragmatic, policy-focused, consequence-oriented"
            }
        ]
    }

@router.get("/formats")
def get_debate_formats():
    return {
        "formats": [
            {
                "name": "AI Simulation",
                "description": "One-on-one AI debate with customizable opponent",
                "turns": "Unlimited"
            },
            {
                "name": "Parliamentary",
                "description": "British parliamentary style with teams",
                "turns": "Structured rounds"
            },
            {
                "name": "Oxford",
                "description": "Traditional Oxford Union debate format",
                "turns": "Fixed structure"
            },
            {
                "name": "Policy",
                "description": "Policy-focused debate with evidence requirements",
                "turns": "Evidence-heavy rounds"
            },
            {
                "name": "Public Forum",
                "description": "Accessible public debate format",
                "turns": "Cross-examination included"
            }
        ]
    }
