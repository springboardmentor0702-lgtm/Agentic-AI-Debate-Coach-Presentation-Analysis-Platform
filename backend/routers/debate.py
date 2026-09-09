"""AI Debate Opponent & Simulation Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas import (
    DebateSessionRequest,
    DebateTurnRequest,
    DebateReplyRequest,
    DebateSessionResponse,
)

router = APIRouter(
    prefix="/debate",
    tags=["Debate"],
    responses={404: {"description": "Not found"}},
)


# ──────────────────────────────────────────────────────────────────
# Endpoints — paths match frontend lib/api.js exactly
# ──────────────────────────────────────────────────────────────────

@router.post("/start")
def start_debate_session(request: DebateSessionRequest):
    """
    Start a new AI debate session.
    Returns: session_id, opening_statement from AI opponent, topic, difficulty.
    """
    try:
        from backend.services.debate_service import create_session
        result = create_session(request.topic, request.opponent_stance, request.difficulty)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/turn")
def submit_turn(session_id: str, request: DebateTurnRequest):
    """
    Submit user's debate turn and get AI opponent's response.
    Returns: opponent_response, turn_number, session_id.
    """
    try:
        from backend.services.debate_service import submit_turn as _submit
        return _submit(session_id, request.user_message)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/transcript")
def get_transcript(session_id: str):
    """Get the full debate transcript for a session."""
    try:
        from backend.services.debate_service import get_transcript as _get
        return _get(session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/end")
def end_debate_session(session_id: str):
    """
    End a debate session and return the full transcript for evaluation.
    """
    try:
        from backend.services.debate_service import end_session
        return end_session(session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────
# Legacy / compatibility endpoints
# ──────────────────────────────────────────────────────────────────

@router.post("/reply/{session_id}")
def get_opponent_reply(session_id: str, request: DebateReplyRequest):
    """Legacy endpoint — use /{session_id}/turn instead."""
    try:
        from backend.services.debate_service import submit_turn as _submit
        return _submit(session_id, request.user_argument)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def debate_health():
    return {"status": "healthy", "module": "Debate Simulation Engine", "version": "1.0.0"}
