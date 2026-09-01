from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from pydantic import BaseModel
from pydantic import Field

from models import User
from security import current_user

from services.ai_engine import analyze_argument


router = APIRouter(
    prefix="/api/analysis",
    tags=["Argument Analysis"]
)


class ArgumentAnalysisRequest(BaseModel):

    text: str = Field(
        min_length=10,
        max_length=10000
    )

    topic: str = ""


@router.post("/argument")
def argument_analysis(
    request: ArgumentAnalysisRequest,

    user: User = Depends(current_user)
):

    try:

        result = analyze_argument(
            request.text,
            request.topic
        )

        result["user_id"] = user.id

        return result

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )
