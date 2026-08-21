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

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or "." not in value.rsplit("@", 1)[-1]:
            raise ValueError("A valid email address is required.")
        return value

    @field_validator("full_name", "password")
    @classmethod
    def reject_blank_values(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("This value cannot be blank.")
        return value.strip()


class UserLogin(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    role: str
    full_name: str


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    experience_level: Optional[str] = Field(default=None, max_length=40)
    preferred_topics: Optional[str] = Field(default=None, max_length=1000)
    presentation_domains: Optional[str] = Field(default=None, max_length=1000)
    learning_goals: Optional[str] = Field(default=None, max_length=2000)
    coaching_preferences: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("full_name", "experience_level", "preferred_topics", "presentation_domains", "learning_goals", "coaching_preferences")
    @classmethod
    def strip_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Profile values cannot be blank.")
        return value


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
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DebateSessionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    topic: str = Field(min_length=1, max_length=2000)
    format: Optional[str] = Field(default="AI Simulation", max_length=80)
    assigned_position: Optional[str] = Field(default="Affirmative", max_length=80)
    status: Optional[str] = Field(default="Active", max_length=40)
    scheduled_at: Optional[datetime] = None

    @field_validator("title", "topic")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This value cannot be blank.")
        return value


class DebateSessionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    topic: str
    format: str
    assigned_position: str
    status: str
    scheduled_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ArgumentSubmit(BaseModel):
    session_id: int = Field(gt=0)
    speech_text: str = Field(min_length=1, max_length=20000)

    @field_validator("speech_text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Speech text cannot be blank.")
        return value


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

    @field_validator("speech_text")
    @classmethod
    def validate_speech(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Speech text cannot be blank.")
        return value


class PresentationMetricResponse(BaseModel):
    session_id: int
    speech_pace_wpm: float
    filler_words_count: int
    filler_words_list: str
    confidence_score: float
    clarity_score: float
    engagement_score: float
    duration_seconds: Optional[float] = None
    pause_count: Optional[int] = None
    silence_ratio_percent: Optional[float] = None
    average_volume_percent: Optional[float] = None


class SimulationTurnSubmit(BaseModel):
    session_id: int = Field(gt=0)
    user_argument: str = Field(min_length=1, max_length=20000)
    opponent_persona: Optional[str] = Field(default="The Contrarian", max_length=80)

    @field_validator("user_argument")
    @classmethod
    def validate_argument(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Argument cannot be blank.")
        return value


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


class NotificationResponse(BaseModel):
    id: int
    category: str
    title: str
    message: str
    read: bool
    timestamp: datetime
    source_type: Optional[str] = None
    source_id: Optional[int] = None


class NotificationReadResponse(BaseModel):
    id: int
    read: bool
    read_at: Optional[datetime] = None


class CoachFeedbackCreate(BaseModel):
    session_id: int = Field(gt=0)
    learner_id: int = Field(gt=0)
    content: str = Field(min_length=1, max_length=5000)
    rating: Optional[float] = Field(default=None, ge=0, le=100)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Feedback cannot be blank.")
        return value


class CoachFeedbackResponse(BaseModel):
    id: int
    session_id: int
    coach_id: int
    learner_id: int
    content: str
    rating: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardMetric(BaseModel):
    label: str
    value: float
    unit: Optional[str] = None


class LearnerDashboardResponse(BaseModel):
    role: str
    user_id: int
    total_debates_completed: int
    average_overall_score: float
    recent_performance_trend: List[float]
    top_fallacy_avoided: Optional[str] = None
    recommended_exercises: List[str]
    total_presentations: int
    average_speech_pace_wpm: Optional[float] = None
    average_filler_words: Optional[float] = None
    unread_notifications: int


class CoachDashboardResponse(BaseModel):
    role: str
    assigned_students_count: int
    top_performers: List[dict]
    class_skill_gaps: List[str]
    pending_evaluations: int
    recent_feedback: List[CoachFeedbackResponse]


class EducatorDashboardResponse(BaseModel):
    role: str
    active_classes: int
    total_enrolled_students: int
    average_class_score: float
    debate_topics_assigned: List[str]
    learner_count_by_level: dict


class AdminDashboardResponse(BaseModel):
    role: str
    platform_users_total: int
    active_ai_agents: int
    llm_api_health: str
    system_latency_ms: Optional[float]
    uptime_percentage: Optional[float]
    sessions_total: int
    completed_sessions_total: int


class PaginatedSessionsResponse(BaseModel):
    items: List[DebateSessionResponse]
    total: int
    limit: int
    offset: int
