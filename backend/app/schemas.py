from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# --- Auth & User Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    full_name: str
    role: str = "Learner"  # Learner, Debate Coach, Educator, Administrator

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfileUpdate(BaseModel):
    experience_level: Optional[str] = None
    preferred_topics: Optional[List[str]] = None
    presentation_domains: Optional[List[str]] = None
    learning_goals: Optional[List[str]] = None
    coaching_preferences: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: int
    user_id: int
    experience_level: str
    preferred_topics: List[str]
    presentation_domains: List[str]
    learning_goals: List[str]
    coaching_preferences: str
    bio: str
    avatar_url: str
    updated_at: datetime

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    profile: Optional[UserProfileResponse] = None

    class Config:
        from_attributes = True

# --- Debate Session Schemas ---
class DebateSessionCreate(BaseModel):
    title: str
    topic: str
    format: str = "Oxford Debate"  # One-on-One Debate, Parliamentary Debate, Oxford Debate, Policy Debate, Public Forum Debate, AI Debate Simulation
    user_position: str = "Affirmative"  # Affirmative, Negative
    opponent_type: str = "AI"
    ai_persona: str = "Dr. Eleanor Vance (Empirical Scholar)"
    duration_minutes: int = 15

class DebateTurnCreate(BaseModel):
    content: str
    audio_path: Optional[str] = None

class DebateTurnResponse(BaseModel):
    id: int
    session_id: int
    speaker: str
    turn_number: int
    content: str
    audio_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DebateSessionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    topic: str
    format: str
    user_position: str
    opponent_type: str
    ai_persona: str
    status: str
    duration_minutes: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    turns: List[DebateTurnResponse] = []

    class Config:
        from_attributes = True

# --- Argument Analysis Schemas ---
class ArgumentAnalysisRequest(BaseModel):
    session_id: Optional[int] = None
    turn_id: Optional[int] = None
    text: str

class ArgumentAnalysisResponse(BaseModel):
    claim: str
    evidence: str
    reasoning_quality: str
    clarity_score: float
    relevance_score: float
    evidence_strength_score: float
    logical_consistency_score: float
    persuasiveness_score: float
    feedback: str
    extracted_premises: List[str] = []

# --- Fallacy Detection Schemas ---
class FallacyItem(BaseModel):
    fallacy_type: str
    simple_name: Optional[str] = None
    simple_meaning: Optional[str] = None
    quote: str
    explanation: str
    correction_suggestion: str
    severity: str

class FallacyDetectionRequest(BaseModel):
    session_id: Optional[int] = None
    turn_id: Optional[int] = None
    text: str

class FallacyDetectionResponse(BaseModel):
    detected_fallacies: List[FallacyItem]
    credibility_penalty: float
    reasoning_analysis: str

# --- Counterargument Schemas ---
class CounterargumentItem(BaseModel):
    argument_type: str  # Logical, Evidence-Based, Ethical, Practical, Policy
    rebuttal_text: str
    strategy_tip: str
    challenge_question: str

class CounterargumentRequest(BaseModel):
    session_id: Optional[int] = None
    turn_id: Optional[int] = None
    text: str
    context: Optional[str] = None

class CounterargumentResponse(BaseModel):
    rebuttals: List[CounterargumentItem]
    recommended_strategy: str

# --- Presentation Analysis Schemas ---
class PresentationAnalysisRequest(BaseModel):
    title: str = "Presentation Session"
    transcript: str
    duration_seconds: float = 60.0

class PresentationAnalysisResponse(BaseModel):
    id: Optional[int] = None
    title: str
    transcript: str
    duration_seconds: float
    speech_pace_wpm: float
    pace_status: str
    filler_words_count: int
    filler_words_breakdown: Dict[str, int]
    confidence_score: float
    clarity_score: float
    engagement_score: float
    overall_presentation_score: float
    feedback: str
    created_at: Optional[datetime] = None

# --- Debate Scoring Schemas (Weighted Model) ---
class DebateScoreRequest(BaseModel):
    session_id: int
    argument_quality: Optional[float] = None
    evidence_usage: Optional[float] = None
    logical_consistency: Optional[float] = None
    rebuttal_effectiveness: Optional[float] = None
    communication_skills: Optional[float] = None

class DebateScoreResponse(BaseModel):
    id: Optional[int] = None
    session_id: int
    user_id: int
    argument_quality: float       # 30%
    evidence_usage: float         # 20%
    logical_consistency: float    # 20%
    rebuttal_effectiveness: float # 15%
    communication_skills: float   # 15%
    overall_score: float
    grade: str
    strengths: List[str]
    weaknesses: List[str]
    feedback_summary: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Simulation Turn Schemas ---
class SimulationTurnRequest(BaseModel):
    session_id: int
    user_argument: str

class SimulationTurnResponse(BaseModel):
    user_turn: DebateTurnResponse
    ai_turn: DebateTurnResponse
    live_coaching_hint: str
    detected_fallacies: List[FallacyItem]
    quick_tips: List[str]
    ai_feedback: Optional[Dict[str, Any]] = None

# --- Recommendation & Coaching Schemas ---
class LearningPathResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    progress_percentage: float
    status: str
    current_level: str
    target_level: str
    milestones: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

class RecommendationResponse(BaseModel):
    user_id: int
    skill_gaps: List[str]
    recommended_exercises: List[Dict[str, Any]]
    personalized_coaching_tips: List[str]

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    link: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Report Export Schemas ---
class ReportExportRequest(BaseModel):
    report_type: str  # debate, presentation, performance, coaching, progress
    session_id: Optional[int] = None
    format: str = "pdf"  # pdf, csv, excel
