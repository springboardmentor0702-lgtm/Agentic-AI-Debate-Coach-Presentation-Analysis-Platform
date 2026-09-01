from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from pydantic import BaseModel

from models import User
from security import current_user

from services.presentation_analyzer import (
    analyze_presentation
)

from services.report_generator import (
    generate_presentation_report
)


router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"]
)


class ReportRequest(BaseModel):

    transcript: str

    duration_seconds: float = 60


@router.post("/presentation")
def presentation_report(
    request: ReportRequest,

    user: User = Depends(current_user)
):

    try:

        analysis = analyze_presentation(
            request.transcript,
            request.duration_seconds
        )

        report = generate_presentation_report(
            analysis
        )

        report["user_id"] = user.id

        return report

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )
