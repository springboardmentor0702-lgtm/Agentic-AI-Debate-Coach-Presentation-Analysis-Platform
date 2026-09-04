"""
Peer Comparison endpoint (spec: Competition Analytics).
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.services.comparison_service import get_comparison

router = APIRouter(prefix="/comparison", tags=["comparison"])


@router.get("")
async def comparison(user: dict = Depends(get_current_user)):
    return await get_comparison(user["profile"]["id"])
