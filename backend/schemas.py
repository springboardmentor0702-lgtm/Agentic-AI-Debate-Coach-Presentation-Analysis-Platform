from typing import Optional, List

from pydantic import (
    BaseModel,
    Field,
    EmailStr
)


# -------------------------
# AUTHENTICATION
# -------------------------

class RegisterRequest(BaseModel):

    name: str = Field(
        min_length=2,
        max_length=120
    )

    email: EmailStr

    password: str = Field(
        min_length=6,
        max_length=128
    )

    role: str = "learner"


class LoginRequest(BaseModel):

    email: EmailStr

    password: str


# -------------------------
# PROFILE
# -------------------------

class ProfileUpdate(BaseModel):

    experience_level: Optional[str] = None

    preferred_topics: Optional[List[str]] = None

    presentation_domains: Optional[List[str]] = None

    learning_goals: Optional[List[str]] = None

    coaching_preferences: Optional[List[str]] = None


# -------------------------
# DEBATE SESSION
# -------------------------

class SessionCreate(BaseModel):

    topic: str = Field(
        min_length=3,
        max_length=500
    )

    format: str = "one-on-one"

    position: str = "for"
