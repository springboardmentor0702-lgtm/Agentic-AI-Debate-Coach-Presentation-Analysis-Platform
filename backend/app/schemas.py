from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ""
    role: str = "learner"
    experience_level: str = "beginner"


class ProfileIn(BaseModel):
    full_name: Optional[str] = None
    experience_level: Optional[str] = None
    preferred_topics: Optional[List[str]] = None
    presentation_domains: Optional[List[str]] = None
    learning_goals: Optional[List[str]] = None
    coaching_preferences: Optional[Dict] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    experience_level: str
    preferred_topics: list
    presentation_domains: list
    learning_goals: list

    class Config:
        from_attributes = True


class TopicIn(BaseModel):
    title: str
    description: str = ""
    category: str = "general"


class SessionIn(BaseModel):
    topic_id: Optional[str] = None
    topic_title: Optional[str] = None
    format: str = "ai_simulation"
    position: str = "pro"
    scheduled_at: Optional[str] = None


class TurnIn(BaseModel):
    content: str
    phase: str = "rebuttal"
    duration_seconds: Optional[float] = None
