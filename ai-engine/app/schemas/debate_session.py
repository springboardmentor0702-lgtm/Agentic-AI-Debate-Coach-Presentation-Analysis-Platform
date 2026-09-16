from pydantic import BaseModel, Field
from typing import Literal, Optional


class PhaseConfig(BaseModel):
    phase_id: str
    speaker: Literal["user", "ai"]
    speech_type: str  # "Opening", "Constructive", "Rebuttal", "Cross-Examination", "Summary", "Closing"
    time_limit_seconds: int
    rules: list[str] = Field(default_factory=list)


class DebateFormatConfig(BaseModel):
    format_name: str
    description: str
    phases: list[PhaseConfig]


class TranscriptEntry(BaseModel):
    phase_id: str
    speaker: str  # "user" or "ai"
    speech_type: str
    content: str
    timed_out: bool = False


class DebateSessionState(BaseModel):
    session_id: str
    debate_format: str
    topic: str
    stance: str
    user_id: Optional[str] = None
    phase_index: int = 0
    transcript: list[TranscriptEntry] = Field(default_factory=list)
    status: Literal["in_progress", "completed"] = "in_progress"
    opponent_persona: Optional[str] = None
    custom_scenario: Optional[str] = None
    difficulty: Optional[str] = None
