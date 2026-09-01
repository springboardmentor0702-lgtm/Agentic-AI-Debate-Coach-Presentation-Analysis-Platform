from typing import List, Dict

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from pydantic import BaseModel
from pydantic import Field

from models import User
from security import current_user

from services.simulation_engine import (
    PERSONAS,
    get_personas,
    generate_opening,
    generate_opponent_response,
    generate_debate_summary
)


router = APIRouter(
    prefix="/api/simulation",
    tags=["AI Debate Simulation"]
)


# ============================================================
# REQUEST MODELS
# ============================================================

class StartSimulationRequest(BaseModel):

    topic: str = Field(
        min_length=3,
        max_length=500
    )

    position: str = "for"

    persona: str = "skeptical"


class DebateTurnRequest(BaseModel):

    topic: str

    user_argument: str = Field(
        min_length=5,
        max_length=10000
    )

    persona: str = "skeptical"

    turn_number: int = 1


class SimulationSummaryRequest(BaseModel):

    messages: List[Dict]


# ============================================================
# PERSONAS
# ============================================================

@router.get("/personas")
def personas(
    user: User = Depends(current_user)
):

    return {
        "personas": get_personas()
    }


# ============================================================
# START SIMULATION
# ============================================================

@router.post("/start")
def start_simulation(
    request: StartSimulationRequest,

    user: User = Depends(current_user)
):

    if request.persona not in PERSONAS:

        raise HTTPException(
            status_code=400,
            detail="Invalid AI persona"
        )

    opening = generate_opening(
        request.topic,
        request.position,
        request.persona
    )

    return {

        "simulation_started": True,

        "topic":
            request.topic,

        "user_position":
            request.position,

        "ai_persona":
            request.persona,

        "persona_name":
            PERSONAS[
                request.persona
            ]["name"],

        "opening_statement":
            opening,

        "turn": 1
    }


# ============================================================
# NEXT TURN
# ============================================================

@router.post("/turn")
def debate_turn(
    request: DebateTurnRequest,

    user: User = Depends(current_user)
):

    if request.persona not in PERSONAS:

        raise HTTPException(
            status_code=400,
            detail="Invalid AI persona"
        )

    return generate_opponent_response(
        request.topic,
        request.user_argument,
        request.persona,
        request.turn_number
    )


# ============================================================
# SUMMARY
# ============================================================

@router.post("/summary")
def simulation_summary(
    request: SimulationSummaryRequest,

    user: User = Depends(current_user)
):

    return generate_debate_summary(
        request.messages
    )
