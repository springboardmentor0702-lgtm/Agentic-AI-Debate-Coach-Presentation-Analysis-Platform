from fastapi import APIRouter
from fastapi import Depends

from models import User
from security import current_user


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


@router.get("")
def dashboard(
    user: User = Depends(current_user)
):

    return {

        "user": {

            "id": user.id,

            "name": user.name,

            "role": user.role
        },

        "performance": {

            "overall_score": 0,

            "argument_quality": 0,

            "reasoning_quality": 0,

            "evidence_strength": 0,

            "clarity_relevance": 0,

            "persuasiveness": 0
        },

        "progress": {

            "debates_completed": 0,

            "analysis_completed": 0,

            "presentations_analyzed": 0
        },

        "skills_to_improve": [],

        "recent_sessions": [],

        "message":
            "Dashboard data is ready for integration "
            "with stored analytics."
    }
