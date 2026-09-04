from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from database import get_db

from models import User
from models import PresentationAnalysis

from security import current_user


router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"]
)


@router.get("/presentation")
def presentation_analytics(

    user: User = Depends(current_user),

    db: Session = Depends(get_db)
):

    records = (

        db.query(
            PresentationAnalysis
        )

        .filter(
            PresentationAnalysis.user_id
            == user.id
        )

        .order_by(
            PresentationAnalysis.created_at.asc()
        )

        .all()
    )

    if not records:

        return {

            "total_presentations": 0,

            "average_score": 0,

            "trend": [],

            "latest": None
        }

    scores = [

        item.overall_score

        for item in records
    ]

    average = (
        sum(scores)
        /
        len(scores)
    )

    trend = [

        {
            "presentation":
                index,

            "score":
                item.overall_score,

            "date":
                item.created_at
        }

        for index, item
        in enumerate(
            records,
            start=1
        )
    ]

    latest = records[-1]

    return {

        "total_presentations":
            len(records),

        "average_score":
            round(
                average,
                2
            ),

        "trend":
            trend,

        "latest": {

            "overall_score":
                latest.overall_score,

            "pace_score":
                latest.pace_score,

            "filler_score":
                latest.filler_score,

            "confidence_score":
                latest.confidence_score,

            "clarity_score":
                latest.clarity_score,

            "engagement_score":
                latest.engagement_score
        }
    }
