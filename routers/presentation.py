from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from pydantic import BaseModel
from pydantic import Field

from models import User
from security import current_user

from services.presentation_analyzer import (
    analyze_presentation
)


router = APIRouter(
    prefix="/api/presentation",
    tags=["Presentation Analysis"]
)


class PresentationRequest(BaseModel):

    transcript: str = Field(
        min_length=10,
        max_length=50000
    )

    duration_seconds: float = Field(
        default=60,
        gt=0,
        le=7200
    )


@router.post("/analyze")
def analyze(
    request: PresentationRequest,

    user: User = Depends(current_user)
):

    try:

        result = analyze_presentation(
            request.transcript,
            request.duration_seconds
        )

        result["user_id"] = user.id

        return result

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )
