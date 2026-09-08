from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserProfileBase(BaseModel):
    experience_level: str = "Beginner"
    preferred_debate_topics: Optional[str] = None
    presentation_domains: Optional[str] = None
    learning_goals: Optional[str] = None
    coaching_preferences: Optional[str] = None


class UserProfileUpdate(UserProfileBase):
    pass


class SkillUpdate(BaseModel):
    skill_name: str
    score: float


class UserProfileOut(UserProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int


class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    score: float
