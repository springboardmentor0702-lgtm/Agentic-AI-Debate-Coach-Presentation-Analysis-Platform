"""API endpoints for debate session history."""
from fastapi import APIRouter, HTTPException
from backend.schemas import (
    SessionListResponse, SessionSummary,
    SessionDetailResponse, ErrorResponse,
)
from backend.services import debate_service

router = APIRouter(prefix="/history", tags=["History"])


@router.get(
    "/sessions",
    response_model=SessionListResponse,
    summary="List all debate sessions",
    description="Get a list of all debate sessions with summary info.",
)
def list_sessions():
    sessions = debate_service.list_sessions()
    return SessionListResponse(
        sessions=[SessionSummary(**s) for s in sessions],
        total=len(sessions),
    )


@router.get(
    "/sessions/{session_id}",
    response_model=SessionDetailResponse,
    summary="Get session details",
    description="Get full details of a specific debate session.",
    responses={404: {"model": ErrorResponse}},
)
def get_session(session_id: str):
    try:
        result = debate_service.get_session_detail(session_id)
        return SessionDetailResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete(
    "/sessions/{session_id}",
    summary="Delete a session",
    description="Delete a debate session and all associated data.",
    responses={404: {"model": ErrorResponse}},
)
def delete_session(session_id: str):
    deleted = debate_service.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
    return {"message": f"Session '{session_id}' deleted successfully"}
