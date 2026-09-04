from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any, List

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2, max_length=120)
    role: str = "learner"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: dict

class ProfileIn(BaseModel):
    name: Optional[str] = None
    experience_level: str = "beginner"
    preferred_topics: List[str] = []
    presentation_domains: List[str] = []
    learning_goals: List[str] = []
    coaching_preferences: dict = {}

class DebateCreate(BaseModel):
    topic: str = Field(min_length=5)
    format: str = "one_on_one"
    position: str = "for"
    rounds: int = Field(default=3, ge=1, le=12)
    ai_opponent: bool = True

class DebateTurn(BaseModel):
    text: str = Field(min_length=1)

class AnalysisIn(BaseModel):
    text: str = Field(min_length=3)

class FriendRequestIn(BaseModel):
    user_id: int

class InvitationIn(BaseModel):
    debate_id: int
    recipient_id: int

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    read: bool
    created_at: Any

class CoachQuestion(BaseModel):
    question: str = Field(min_length=2)

class ReportRequest(BaseModel):
    kind: str = "performance"
