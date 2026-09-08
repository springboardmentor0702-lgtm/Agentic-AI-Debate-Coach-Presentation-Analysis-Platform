"""Request/Response Pydantic Schemas for API validation"""
from pydantic import BaseModel, Field
from typing import Optional, Any, List
from datetime import datetime


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    version: str
    service: str


# ============= Analysis Router Schemas =============

class AnalysisRequest(BaseModel):
    """Request model for argument analysis."""
    text: str = Field(..., min_length=10, description="The argument text to analyze")
    analysis_type: str = Field(default="both", description="Type: argument/fallacy/both")


class AnalysisResponse(BaseModel):
    """Response model for analysis results."""
    id: int
    input_text: str
    analysis_type: str
    result_data: dict
    status: str


# ============= Debate Router Schemas =============

class DebateSessionRequest(BaseModel):
    """Request model to start a debate session."""
    topic: str = Field(..., min_length=5, description="The debate topic")
    opponent_stance: str = Field(..., description="AI opponent's stance (for/against)")
    difficulty: str = Field(default="intermediate", description="Difficulty level")


class DebateReplyRequest(BaseModel):
    """Request model for debate reply."""
    user_argument: str = Field(..., min_length=5, description="User's argument/response")


class DebateSessionResponse(BaseModel):
    """Response model for debate session."""
    id: str
    topic: str
    opponent_stance: str
    difficulty: str
    status: str
    transcript: List[dict] = []
    message: str


# ============= Pipeline Router Schemas =============

class PipelineRequest(BaseModel):
    """Request model for full analysis pipeline."""
    text: str = Field(..., min_length=10, description="Content to analyze")
    session_id: Optional[str] = Field(None, description="Optional session ID for tracking")


class PipelineResponse(BaseModel):
    """Response model for pipeline results."""
    pipeline_id: str
    session_id: str
    input_text: str
    analysis_results: dict
    status: str
    message: str


# ============= Additional Models =============

class FallacyDetection(BaseModel):
    """Model for fallacy detection result."""
    type: str
    excerpt: str
    explanation: str
    correction_suggestion: str
    confidence: float


class ArgumentAnalysis(BaseModel):
    """Model for argument analysis result."""
    claim: str
    evidence: List[str]
    strength_label: str
    strength_score: float
    clarity_score: float
    relevance_score: float
    logical_consistency_score: float
    notes: str
