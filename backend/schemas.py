from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# --- Analysis ---
class ArgumentAnalysisRequest(BaseModel):
    argument_text: str = Field(..., min_length=1, description="The argument text to analyze")

class ArgumentAnalysisResponse(BaseModel):
    claim: str = ""
    evidence: list[str] = []
    strength_label: str = "weak"
    strength_score: int = 0
    clarity_score: int = 0
    relevance_score: int = 0
    logical_consistency_score: int = 0
    notes: str = ""

class FallacyItem(BaseModel):
    type: str
    excerpt: str = ""
    explanation: str = ""
    correction_suggestion: str = ""
    confidence: int = 0

class FallacyDetectionResponse(BaseModel):
    fallacies_found: list[FallacyItem] = []
    status: str = "no_clear_fallacies_detected"
    message: str = ""

class FullAnalysisResponse(BaseModel):
    argument_analysis: ArgumentAnalysisResponse
    fallacy_detection: FallacyDetectionResponse

# --- Debate ---
class DebateStartRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    opponent_stance: str = Field(..., min_length=1)
    difficulty: str = Field(default="intermediate", pattern="^(beginner|intermediate|advanced)$")

class DebateStartResponse(BaseModel):
    session_id: str
    opening_statement: str
    topic: str
    difficulty: str

class DebateTurnRequest(BaseModel):
    user_message: str = Field(..., min_length=1)

class DebateTurnResponse(BaseModel):
    opponent_response: str
    turn_number: int
    session_id: str

class TranscriptEntry(BaseModel):
    role: str
    text: str

class DebateTranscriptResponse(BaseModel):
    session_id: str
    topic: str
    transcript: list[TranscriptEntry]
    status: str

# --- Pipeline ---
class CounterargumentRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    user_argument: str = Field(..., min_length=1)

class CounterargumentResponse(BaseModel):
    claims: list[dict] = []
    analysis: dict = {}
    counterarguments: list[dict] = []

class EvaluationRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    transcript: list[TranscriptEntry]

class EvaluationResponse(BaseModel):
    scores: dict = {}
    justifications: dict = {}
    overall_score: float = 0
    strong_moments: list[str] = []
    weak_moments: list[str] = []

class CoachingRequest(BaseModel):
    evaluation: dict

class CoachingResponse(BaseModel):
    coaching: dict = {}
    learning_plan: dict = {}

class FullPipelineRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    user_argument: str = Field(..., min_length=1)
    opponent_stance: str = Field(..., min_length=1)
    user_turns: list[str] = Field(default_factory=list)
    difficulty: str = Field(default="intermediate")

class FullPipelineResponse(BaseModel):
    topic: str
    counterargument_analysis: dict = {}
    debate_transcript: list[dict] = []
    evaluation: dict = {}
    coaching: dict = {}
    learning_plan: dict = {}

# --- History ---
class SessionSummary(BaseModel):
    session_id: str
    topic: str
    status: str
    created_at: datetime
    turn_count: int = 0

class SessionListResponse(BaseModel):
    sessions: list[SessionSummary]
    total: int

class SessionDetailResponse(BaseModel):
    session_id: str
    topic: str
    opponent_stance: str = ""
    difficulty: str = "intermediate"
    transcript: list[TranscriptEntry] = []
    status: str = ""
    evaluation: Optional[dict] = None
    coaching: Optional[dict] = None
    learning_plan: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- General ---
class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    service: str = "LOGOS.AI Backend"

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
