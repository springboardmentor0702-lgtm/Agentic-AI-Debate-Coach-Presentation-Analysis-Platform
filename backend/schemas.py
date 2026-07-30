from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Auth Schemas
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[str] = "Learner" # Learner, Coach, Educator, Administrator
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

    class Config:
        from_attributes = True

# Session Schemas
class DebateSessionCreate(BaseModel):
    title: str
    topic: str
    format: Optional[str] = "AI Simulation"
    assigned_position: Optional[str] = "Affirmative"

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

    class Config:
        from_attributes = True

# Argument Analysis & Fallacy Schemas
class ArgumentSubmit(BaseModel):
    session_id: int
    speech_text: str

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

# Presentation Analysis Schemas
class SpeechAnalysisSubmit(BaseModel):
    session_id: int
    speech_text: str
    audio_duration_seconds: Optional[float] = 60.0

class PresentationMetricResponse(BaseModel):
    session_id: int
    speech_pace_wpm: float
    filler_words_count: int
    filler_words_list: str
    confidence_score: float
    clarity_score: float
    engagement_score: float

# Simulation Schemas
class SimulationTurnSubmit(BaseModel):
    session_id: int
    user_argument: str
    opponent_persona: Optional[str] = "The Contrarian" # The Contrarian, The Academic, The Strategist

class SimulationTurnResponse(BaseModel):
    turn_index: int
    user_argument: str
    opponent_rebuttal: str
    fallacies_detected_in_user: List[FallacyDetail]
    rebuttal_strength_percent: float
    coaching_tip: str

# Weighted Scoring Schema
class WeightedScoreResponse(BaseModel):
    session_id: int
    argument_quality: float # 30%
    evidence_use: float # 20%
    logical_consistency: float # 20%
    rebuttal_effectiveness: float # 15%
    communication_skills: float # 15%
    overall_weighted_score: float

# Coaching Schema
class CoachingPlanResponse(BaseModel):
    user_id: int
    skill_gap_summary: str
    targeted_recommendations: List[str]
    learning_path_steps: List[str]
    progress_status: str
