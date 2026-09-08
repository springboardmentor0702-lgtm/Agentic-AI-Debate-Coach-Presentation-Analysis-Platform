from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    is_active: bool


class LearnerProfileOut(PersonOut):
    experience_level: str = "Beginner"
    preferred_debate_topics: str | None = None
    presentation_domains: str | None = None
    learning_goals: str | None = None
    coaching_preferences: str | None = None
    skills: list[dict[str, int | float | str]] = []
    connected_expert_count: int = 0
    connected_experts: list["ExpertConnectionOut"] = []
    available_experts: list["ExpertProfileOut"] = []


class ExpertConnectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    is_active: bool
    request_count: int = 0
    debate_count: int = 0
    latest_status: str | None = None


class ExpertProfileOut(PersonOut):
    experience_level: str = "Beginner"
    presentation_domains: str | None = None
    coaching_preferences: str | None = None
    skills: list[dict[str, int | float | str]] = []


class DebateRequestCreate(BaseModel):
    expert_id: int
    topic: str = Field(min_length=3, max_length=2000)


class ExpertDebateCreate(BaseModel):
    learner_id: int
    topic: str = Field(min_length=3, max_length=2000)


class PracticeDebateCreate(BaseModel):
    learner_id: int
    topic: str = Field(min_length=3, max_length=2000)


class DebateRequestUpdate(BaseModel):
    status: str = Field(pattern="^(ACCEPTED|REJECTED)$")


class DebateRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    learner_id: int
    expert_id: int
    topic: str
    status: str
    created_at: datetime
    updated_at: datetime


class HumanDebateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: int
    learner_id: int
    expert_id: int
    topic: str
    status: str
    created_at: datetime
    completed_at: datetime | None = None


class HumanMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=10000)
    message_type: str = Field(default="TEXT", pattern="^(TEXT|AUDIO)$")
    audio_url: str | None = Field(default=None, max_length=500)


class HumanMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    debate_id: int
    sender_id: int
    message: str
    message_type: str
    audio_url: str | None
    created_at: datetime


class FeedbackCreate(BaseModel):
    feedback: str = Field(min_length=1, max_length=5000)


class FeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    debate_id: int
    author_id: int
    feedback: str
    created_at: datetime
