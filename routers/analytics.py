from fastapi import APIRouter
from fastapi import Depends

from models import User
from security import current_user

from services.report_generator import (
    generate_dashboard_data
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"]
)


@router.get("/presentation")
def presentation_analytics(
    user: User = Depends(current_user)
):

    # Temporary history source.
    # Replace with database query after
    # PresentationAnalysis model is added.

    analyses = []

    return generate_dashboard_data(
        analyses
    )
