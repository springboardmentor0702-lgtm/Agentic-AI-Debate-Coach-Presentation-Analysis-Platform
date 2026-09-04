from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr


# -------------------------
# AUTHENTICATION & USER
# -------------------------

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: str = "learner"  # learner, coach, educator, admin


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    experience_level: Optional[str] = "beginner"
    preferred_topics: Optional[List[str]] = []
    presentation_domains: Optional[List[str]] = []
    learning_goals: Optional[List[str]] = []
    coaching_preferences: Optional[List[str]] = []


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
    topic: str = Field(min_length=3, max_length=500)
    format: str = "One-on-One Debate"
    position: str = "for"  # for / against
    persona: str = "skeptical"


class SessionUpdate(BaseModel):
    status: Optional[str] = None
    turns: Optional[List[Dict[str, Any]]] = None
    scores: Optional[Dict[str, Any]] = None


# -------------------------
# ARGUMENT & FALLACY ANALYSIS
# -------------------------

class ArgumentAnalysisRequest(BaseModel):
    text: str = Field(min_length=10, max_length=10000)
    topic: str = ""


# -------------------------
# COUNTERARGUMENT
# -------------------------

class CounterargumentRequest(BaseModel):
    argument: str = Field(min_length=10, max_length=10000)
    topic: str = ""
    counter_type: str = "logical"  # logical, evidence, ethical, practical, policy


# -------------------------
# SIMULATION
# -------------------------

class StartSimulationRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    position: str = "for"
    persona: str = "skeptical"
    format: str = "One-on-One Debate"


class DebateTurnRequest(BaseModel):
    topic: str
    user_argument: str = Field(min_length=5, max_length=10000)
    persona: str = "skeptical"
    turn_number: int = 1
    session_id: Optional[int] = None


class SimulationSummaryRequest(BaseModel):
    session_id: Optional[int] = None
    topic: Optional[str] = ""
    messages: List[Dict[str, Any]] = []


# -------------------------
# PRESENTATION ANALYSIS
# -------------------------

class PresentationRequest(BaseModel):
    transcript: str = Field(min_length=10, max_length=50000)
    duration_seconds: float = Field(default=60.0, gt=0, le=7200)


# -------------------------
# SCORING
# -------------------------

class ScoreRequest(BaseModel):
    argument_quality: float = Field(ge=0, le=100)
    evidence_usage: float = Field(ge=0, le=100)
    logical_consistency: float = Field(ge=0, le=100)
    rebuttal_effectiveness: float = Field(ge=0, le=100)
    communication_skills: float = Field(ge=0, le=100)


# -------------------------
# COACHING
# -------------------------

class CoachingRequest(BaseModel):
    scores: Dict[str, float]


# -------------------------
# NOTIFICATIONS
# -------------------------

class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str
    notification_type: str = "reminder"
