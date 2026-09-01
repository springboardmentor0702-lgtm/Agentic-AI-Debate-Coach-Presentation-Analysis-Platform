from fastapi import APIRouter
from fastapi import Depends

from pydantic import BaseModel

from models import User
from security import current_user

from services.coaching_engine import (
    generate_coaching_report
)


router = APIRouter(
    prefix="/api/coaching",
    tags=["Coaching"]
)


class CoachingRequest(BaseModel):

    scores: dict


@router.post("")
def coaching(
    request: CoachingRequest,

    user: User = Depends(current_user)
):

    return generate_coaching_report(
        request.scores
    )
