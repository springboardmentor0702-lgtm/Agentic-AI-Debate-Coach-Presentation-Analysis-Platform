from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from database import get_db
from models import User

from schemas import ProfileUpdate

from security import current_user


router = APIRouter(
    prefix="/api/profile",
    tags=["Profile"]
)


# --------------------------------
# GET PROFILE
# --------------------------------

@router.get("")
def get_profile(
    user: User = Depends(current_user)
):

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,

        "experience_level":
            user.experience_level,

        "preferred_topics":
            user.preferred_topics or [],

        "presentation_domains":
            user.presentation_domains or [],

        "learning_goals":
            user.learning_goals or [],

        "coaching_preferences":
            user.coaching_preferences or []
    }


# --------------------------------
# UPDATE PROFILE
# --------------------------------

@router.put("")
def update_profile(
    request: ProfileUpdate,

    db: Session = Depends(get_db),

    user: User = Depends(current_user)
):

    fields = request.model_dump(
        exclude_unset=True
    )

    for field, value in fields.items():

        setattr(
            user,
            field,
            value
        )

    db.commit()

    db.refresh(user)

    return {
        "message": "Profile updated successfully"
    }
