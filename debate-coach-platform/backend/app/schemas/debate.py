from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DebateCreate(BaseModel):
    title: str
    topic: str
    format: str = "ONE_ON_ONE"
    user_position: str
    ai_position: str


class DebateUpdate(BaseModel):
    title: Optional[str] = None
    topic: Optional[str] = None
    format: Optional[str] = None
    user_position: Optional[str] = None
    ai_position: Optional[str] = None
    status: Optional[str] = None


class DebateMessageCreate(BaseModel):
    message: str


class DebateMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender: str
    message: str
    created_at: datetime


class DebateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    topic: str
    format: str
    user_position: str
    ai_position: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class DebateMessageResponse(BaseModel):
    ai_response: str
    argument_analysis: dict
    fallacies: list[dict]
    counterarguments: list[dict]
    coaching_tip: str


class DebateMessageHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender: str
    message: str
    created_at: datetime
    transcript: str | None = None
    audio_url: str | None = None
