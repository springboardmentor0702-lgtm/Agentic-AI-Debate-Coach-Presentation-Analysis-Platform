"""API endpoints for multi-turn debate simulation."""
from fastapi import APIRouter, HTTPException
from backend.schemas import (
    DebateStartRequest, DebateStartResponse,
    DebateTurnRequest, DebateTurnResponse,
    DebateTranscriptResponse, ErrorResponse,
)
from backend.services import debate_service

router = APIRouter(prefix="/debate", tags=["Debate Simulation"])


@router.post(
    "/start",
    response_model=DebateStartResponse,
    summary="Start a new debate session",
    description="Creates a new debate session with an AI opponent and returns the opening statement.",
    responses={500: {"model": ErrorResponse}},
)
def start_debate(request: DebateStartRequest):
    try:
        result = debate_service.create_session(
            topic=request.topic,
            opponent_stance=request.opponent_stance,
            difficulty=request.difficulty,
        )
        return DebateStartResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start debate: {str(e)}")


@router.post(
    "/{session_id}/turn",
    response_model=DebateTurnResponse,
    summary="Submit a debate turn",
    description="Submit the user's argument and get the AI opponent's response.",
    responses={404: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
def submit_turn(session_id: str, request: DebateTurnRequest):
    try:
        result = debate_service.submit_turn(session_id, request.user_message)
        return DebateTurnResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Turn processing failed: {str(e)}")


@router.get(
    "/{session_id}/transcript",
    response_model=DebateTranscriptResponse,
    summary="Get debate transcript",
    description="Retrieve the full transcript of a debate session.",
    responses={404: {"model": ErrorResponse}},
)
def get_transcript(session_id: str):
    try:
        result = debate_service.get_transcript(session_id)
        return DebateTranscriptResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post(
    "/{session_id}/end",
    response_model=DebateTranscriptResponse,
    summary="End a debate session",
    description="End the debate session and get the final transcript.",
    responses={404: {"model": ErrorResponse}},
)
def end_debate(session_id: str):
    try:
        result = debate_service.end_session(session_id)
        return DebateTranscriptResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
