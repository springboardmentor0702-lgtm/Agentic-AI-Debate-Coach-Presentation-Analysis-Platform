import json

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from routers.auth import decode_access_token, get_current_user
from services.ai_engine import SUPPORTED_PERSONAS, ai_engine_service
from services.security import record_audit
import models
import schemas

router = APIRouter(prefix="/api/v1/simulation", tags=["AI Debate Simulation Engine"])


def _prior_turns(db: Session, session_id: int, user_id: int) -> list[dict]:
    records = (
        db.query(models.SimulationTurn)
        .filter(models.SimulationTurn.session_id == session_id, models.SimulationTurn.user_id == user_id)
        .order_by(models.SimulationTurn.turn_index.desc())
        .limit(6)
        .all()
    )
    return [{"turn_index": item.turn_index, "user_argument": item.user_argument, "opponent_rebuttal": item.opponent_rebuttal} for item in reversed(records)]


def _persist_turn(db: Session, debate_session: models.DebateSession, user: models.User, user_argument: str, persona: str, result: dict) -> dict:
    turn_count = db.query(func.count(models.SimulationTurn.id)).filter(models.SimulationTurn.session_id == debate_session.id).scalar() or 0
    turn_index = int(turn_count) + 1
    turn = models.SimulationTurn(session_id=debate_session.id, user_id=user.id, turn_index=turn_index, user_argument=user_argument, opponent_persona=persona, opponent_rebuttal=result["opponent_rebuttal"], fallacies_json=json.dumps(result["fallacies_detected"]), rebuttal_strength_percent=result["rebuttal_strength_percent"], coaching_tip=result["coaching_tip"])
    db.add(turn)
    record_audit(db, "simulation.turn_created", user_id=user.id, resource_type="debate_session", resource_id=debate_session.id)
    db.commit()
    return {"session_id": debate_session.id, "turn_index": turn_index, "user_argument": user_argument, "opponent_persona": persona, "opponent_rebuttal": result["opponent_rebuttal"], "fallacies_detected_in_user": result["fallacies_detected"], "rebuttal_strength_percent": result["rebuttal_strength_percent"], "coaching_tip": result["coaching_tip"]}


@router.post("/turn", response_model=schemas.SimulationTurnResponse)
def run_simulation_turn(payload: schemas.SimulationTurnSubmit, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    debate_session = db.query(models.DebateSession).filter(models.DebateSession.id == payload.session_id, models.DebateSession.user_id == current_user.id).first()
    if not debate_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found for this user.")
    persona = payload.opponent_persona if payload.opponent_persona in SUPPORTED_PERSONAS else "The Contrarian"
    try:
        result = ai_engine_service.generate_simulation_response(payload.user_argument, persona, _prior_turns(db, payload.session_id, current_user.id))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return _persist_turn(db, debate_session, current_user, payload.user_argument, persona, result)


@router.websocket("/ws/{session_id}")
async def simulation_websocket(websocket: WebSocket, session_id: int, token: str = Query(..., min_length=20)):
    """Authenticated low-latency transport; clients send {user_argument, opponent_persona}."""
    await websocket.accept()
    db = SessionLocal()
    try:
        payload = decode_access_token(token)
        user_id = payload.get("user_id")
        user = db.query(models.User).filter(models.User.id == user_id, models.User.is_active.is_(True)).first()
        debate_session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id, models.DebateSession.user_id == user_id).first() if user else None
        if not user or not debate_session:
            await websocket.send_json({"error": "Unauthorized or session not found."})
            await websocket.close(code=1008)
            return
        await websocket.send_json({"type": "ready", "session_id": session_id})
        while True:
            message = await websocket.receive_json()
            user_argument = str(message.get("user_argument", "")).strip()
            if not user_argument:
                await websocket.send_json({"error": "user_argument is required."})
                continue
            persona_value = message.get("opponent_persona", "The Contrarian")
            persona = persona_value if persona_value in SUPPORTED_PERSONAS else "The Contrarian"
            try:
                result = ai_engine_service.generate_simulation_response(user_argument, persona, _prior_turns(db, session_id, user.id))
                response = _persist_turn(db, debate_session, user, user_argument, persona, result)
                await websocket.send_json({"type": "turn", **response})
            except ValueError as exc:
                await websocket.send_json({"error": str(exc)})
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.close(code=1011)
    finally:
        db.close()
