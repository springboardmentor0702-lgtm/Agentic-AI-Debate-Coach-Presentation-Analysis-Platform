"""
Performance Scoring Engine endpoints (spec section 9).
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.services.performance_scoring_service import compute_performance_score_async, get_score_history

router = APIRouter(prefix="/scoring", tags=["scoring"])


@router.get("/performance")
async def get_performance_score(user: dict = Depends(get_current_user)):
    """
    Always computed live from current history - not cached or stale.
    Uses the concurrent-fetch async version (Segment 18) since this is
    one of the most frequently hit endpoints in the app. See
    /scoring/history for the stored trend over time.
    """
    return await compute_performance_score_async(user["profile"]["id"])


@router.get("/history")
def get_performance_history(limit: int = 50, user: dict = Depends(get_current_user)):
    return get_score_history(user["profile"]["id"], limit)
