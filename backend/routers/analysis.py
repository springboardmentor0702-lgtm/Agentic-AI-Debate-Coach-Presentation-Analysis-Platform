from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from models import User
from security import current_user
from services.ai_engine import analyze_argument

router = APIRouter(
    prefix="/api/analysis",
    tags=["Argument Analysis"]
)


class ArgumentAnalysisRequest(BaseModel):
    text: str = Field(min_length=10, max_length=10000)
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
        result["argument_score"] = result.get("evaluation", {}).get("argument_strength", 75)
        return result
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
