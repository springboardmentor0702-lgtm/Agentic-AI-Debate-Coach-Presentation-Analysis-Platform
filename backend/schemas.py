from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserRegister(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    role: Optional[str] = "Learner"
    experience_level: Optional[str] = "Intermediate"
    preferred_topics: Optional[str] = "Technology, Ethics, Policy"


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    role: str
    full_name: str


class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    experience_level: str
    preferred_topics: str
    presentation_domains: str
    learning_goals: str
    coaching_preferences: str

    model_config = ConfigDict(from_attributes=True)


class DebateSessionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    topic: str = Field(min_length=1, max_length=2000)
    format: Optional[str] = "AI Simulation"
    assigned_position: Optional[str] = "Affirmative"
    status: Optional[str] = "Active"
    scheduled_at: Optional[datetime] = None


class DebateSessionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    topic: str
    format: str
    assigned_position: str
    status: str
    scheduled_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ArgumentSubmit(BaseModel):
    session_id: int = Field(gt=0)
    speech_text: str = Field(min_length=1, max_length=20000)


class FallacyDetail(BaseModel):
    fallacy_type: str
    explanation: str
    correction_suggestion: str


class CounterargumentDetail(BaseModel):
    rebuttal_type: str
    rebuttal_text: str
    challenge_question: str
    strategy_tip: str


class ArgumentAnalysisResponse(BaseModel):
    analysis_id: int
    session_id: int
    claim_identified: str
    evidence_strength: float
    reasoning_quality: float
    clarity_score: float
    relevance_score: float
    logical_consistency: float
    persuasiveness_score: float
    fallacies: List[FallacyDetail]
    counterarguments: List[CounterargumentDetail]


class SpeechAnalysisSubmit(BaseModel):
    session_id: int = Field(gt=0)
    speech_text: str = Field(min_length=1, max_length=50000)
    audio_duration_seconds: Optional[float] = Field(default=60.0, gt=0, le=86400)


class PresentationMetricResponse(BaseModel):
    session_id: int
    speech_pace_wpm: float
    filler_words_count: int
    filler_words_list: str
    confidence_score: float
    clarity_score: float
    engagement_score: float


class SimulationTurnSubmit(BaseModel):
    session_id: int = Field(gt=0)
    user_argument: str = Field(min_length=1, max_length=20000)
    opponent_persona: Optional[str] = "The Contrarian"


class SimulationTurnResponse(BaseModel):
    session_id: Optional[int] = None
    turn_index: int
    user_argument: str
    opponent_persona: Optional[str] = None
    opponent_rebuttal: str
    fallacies_detected_in_user: List[FallacyDetail]
    rebuttal_strength_percent: float
    coaching_tip: str


class WeightedScoreResponse(BaseModel):
    session_id: int
    argument_quality: float = Field(ge=0, le=100)
    evidence_use: float = Field(ge=0, le=100)
    logical_consistency: float = Field(ge=0, le=100)
    rebuttal_effectiveness: float = Field(ge=0, le=100)
    communication_skills: float = Field(ge=0, le=100)
    overall_weighted_score: float = Field(ge=0, le=100)


class CoachingPlanResponse(BaseModel):
    user_id: int
    skill_gap_summary: str
    targeted_recommendations: List[str]
    learning_path_steps: List[str]
    progress_status: str
