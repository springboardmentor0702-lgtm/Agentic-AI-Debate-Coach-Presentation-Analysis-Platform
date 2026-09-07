"""AI debate simulation turns.

Why this router goes through agent_bridge
-----------------------------------------
It used to call `ai_engine_service.generate_simulation_response(argument, persona)`
directly. That has two problems for a live debate:

1. The deterministic engine has no memory, so the opponent repeated itself and
   never escalated. Prior turns are now loaded from the database and passed in as
   `history`, which is what lets the LLM agent build on the exchange.
2. It bypassed the LLM agents entirely. agent_bridge picks the best available
   engine (LLM when a key is configured, deterministic otherwise) and returns ONE
   normalized shape either way, so this router never branches on engine.

The response is always the final, post-processed text. The opponent agent runs an
English-only guard before returning, and agent_bridge normalizes and truncates
after that, so nothing intermediate or raw can reach the client. The row is
committed before the response is built, so what the client renders is exactly
what was persisted for this turn - no one-turn lag between the two.
"""
import json
from typing import List, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from services import agent_bridge
import models
import schemas


router = APIRouter(prefix="/api/v1/simulation", tags=["AI Debate Simulation Engine"])

# Only the last few turns are replayed to the model. Sending the whole transcript
# would grow the prompt without bound and slow every later turn down.
HISTORY_TURNS = 6


def _owned_session(session_id: int, user_id: int, db: Session) -> models.DebateSession:
    debate_session = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.id == session_id, models.DebateSession.user_id == user_id)
        .first()
    )
    if not debate_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debate session not found for this user.",
        )
    return debate_session


def _load_history(session_id: int, db: Session) -> list:
    """Prior turns, oldest first, in the shape the opponent agent expects."""
    turns = (
        db.query(models.SimulationTurn)
        .filter(models.SimulationTurn.session_id == session_id)
        .order_by(models.SimulationTurn.turn_index.asc())
        .all()
    )
    recent = turns[-HISTORY_TURNS:]
    return [
        {"user_argument": turn.user_argument, "opponent_rebuttal": turn.opponent_rebuttal}
        for turn in recent
    ], len(turns)


@router.post("/turn", response_model=schemas.SimulationTurnResponse)
def run_simulation_turn(
    payload: schemas.SimulationTurnSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate_session = _owned_session(payload.session_id, current_user.id, db)

    history, prior_count = _load_history(payload.session_id, db)
    turn_index = prior_count + 1

    result = agent_bridge.simulate_opponent(
        user_argument=payload.user_argument,
        topic=debate_session.topic or "",
        persona=payload.opponent_persona or agent_bridge.DEFAULT_PERSONA,
        history=history,
        user_position=debate_session.assigned_position or "Affirmative",
        difficulty=agent_bridge.DEFAULT_DIFFICULTY,
        turn_index=turn_index,
    )

    turn = models.SimulationTurn(
        session_id=payload.session_id,
        user_id=current_user.id,
        turn_index=turn_index,
        user_argument=payload.user_argument,
        opponent_persona=result["persona"],
        opponent_rebuttal=result["opponent_rebuttal"],
        fallacies_json=json.dumps(result["fallacies_detected"]),
        rebuttal_strength_percent=result["rebuttal_strength_percent"],
        coaching_tip=result["coaching_tip"],
    )
    db.add(turn)
    db.commit()

    return {
        "session_id": payload.session_id,
        "turn_index": turn_index,
        "user_argument": payload.user_argument,
        "opponent_persona": result["persona"],
        "opponent_rebuttal": result["opponent_rebuttal"],
        "fallacies_detected_in_user": result["fallacies_detected"],
        "rebuttal_strength_percent": result["rebuttal_strength_percent"],
        "coaching_tip": result["coaching_tip"],
        "challenge_question": result["challenge_question"],
        "tactic_used": result["tactic_used"],
        "engine": result["engine"],
    }


@router.post("/opening", response_model=schemas.SimulationTurnResponse)
def open_simulation(
    payload: schemas.SimulationOpeningSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    The opponent's first move, before the learner has spoken.

    Added so the debate does not open with a hardcoded client-side greeting that
    ignores both the chosen persona and which side the learner is on. Nothing is
    persisted here - there is no user argument to pair it with, and
    SimulationTurn requires one.
    """
    debate_session = _owned_session(payload.session_id, current_user.id, db)

    result = agent_bridge.opening_statement(
        topic=debate_session.topic or "",
        persona=payload.opponent_persona or agent_bridge.DEFAULT_PERSONA,
        user_position=debate_session.assigned_position or "Affirmative",
    )

    return {
        "session_id": payload.session_id,
        "turn_index": 0,
        "user_argument": "",
        "opponent_persona": result["persona"],
        "opponent_rebuttal": result["opponent_rebuttal"],
        "fallacies_detected_in_user": [],
        "rebuttal_strength_percent": 0.0,
        "coaching_tip": result["coaching_tip"],
        "challenge_question": result["challenge_question"],
        "tactic_used": result["tactic_used"],
        "engine": result["engine"],
    }


@router.get("/personas")
def list_personas(current_user: models.User = Depends(get_current_user)):
    """List supported debate personas and their rhetorical styles."""
    return {
        "personas": [
            {
                "name": "The Contrarian",
                "description": "Challenges core premises, questions consensus assumptions, and highlights logical counter-examples.",
            },
            {
                "name": "The Academic",
                "description": "Demands methodological clarity, empirical rigor, verifiable evidence, and precise definitions.",
            },
            {
                "name": "The Strategist",
                "description": "Focuses on execution feasibility, systemic incentives, second-order effects, and pragmatic trade-offs.",
            },
        ],
        "default": agent_bridge.DEFAULT_PERSONA,
    }


@router.get("/turns/{session_id}", response_model=List[schemas.SimulationTurnResponse])
def get_session_turns(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch complete persisted simulation turn transcript for a debate session."""
    _owned_session(session_id, current_user.id, db)
    turns = (
        db.query(models.SimulationTurn)
        .filter(models.SimulationTurn.session_id == session_id)
        .order_by(models.SimulationTurn.turn_index.asc())
        .all()
    )

    results = []
    for turn in turns:
        try:
            fallacies = json.loads(turn.fallacies_json) if turn.fallacies_json else []
        except Exception:
            fallacies = []
        results.append(
            {
                "session_id": turn.session_id,
                "turn_index": turn.turn_index,
                "user_argument": turn.user_argument,
                "opponent_persona": turn.opponent_persona,
                "opponent_rebuttal": turn.opponent_rebuttal,
                "fallacies_detected_in_user": fallacies,
                "rebuttal_strength_percent": turn.rebuttal_strength_percent,
                "coaching_tip": turn.coaching_tip,
                "challenge_question": None,
                "tactic_used": None,
                "engine": "persisted",
            }
        )
    return results

