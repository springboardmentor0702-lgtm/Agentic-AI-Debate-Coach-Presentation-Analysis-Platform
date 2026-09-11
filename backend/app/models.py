import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Float, Integer, ForeignKey, JSON, Boolean

from .core.database import Base


def uid():
    return uuid.uuid4().hex


class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=uid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, default="")
    role = Column(String, default="learner")
    experience_level = Column(String, default="beginner")
    preferred_topics = Column(JSON, default=list)
    presentation_domains = Column(JSON, default=list)
    learning_goals = Column(JSON, default=list)
    coaching_preferences = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class DebateTopic(Base):
    __tablename__ = "debate_topics"
    id = Column(String(36), primary_key=True, default=uid)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    category = Column(String, default="general")
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)


class DebateSession(Base):
    __tablename__ = "debate_sessions"
    id = Column(String(36), primary_key=True, default=uid)
    user_id = Column(String(36), ForeignKey("users.id"))
    topic_id = Column(String(36), ForeignKey("debate_topics.id"))
    format = Column(String, default="ai_simulation")
    position = Column(String, default="pro")
    status = Column(String, default="scheduled")
    scheduled_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DebateTurn(Base):
    __tablename__ = "debate_turns"
    id = Column(String(36), primary_key=True, default=uid)
    session_id = Column(String(36), ForeignKey("debate_sessions.id"), index=True)
    speaker = Column(String)
    turn_number = Column(Integer, default=0)
    phase = Column(String, default="rebuttal")
    content = Column(Text, nullable=False)
    analysis = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class SessionScore(Base):
    __tablename__ = "session_scores"
    id = Column(String(36), primary_key=True, default=uid)
    session_id = Column(String(36), ForeignKey("debate_sessions.id"), index=True)
    argument_quality = Column(Float)
    evidence_usage = Column(Float)
    logical_consistency = Column(Float)
    rebuttal_effectiveness = Column(Float)
    communication_skills = Column(Float)
    overall_score = Column(Float)
    breakdown = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class Report(Base):
    __tablename__ = "reports"
    id = Column(String(36), primary_key=True, default=uid)
    session_id = Column(String(36), ForeignKey("debate_sessions.id"), index=True)
    content = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(36), primary_key=True, default=uid)
    user_id = Column(String(36), ForeignKey("users.id"), index=True)
    type = Column(String, default="info")  # info|reminder|feedback|milestone|announcement
    title = Column(String)
    message = Column(Text, default="")
    is_read = Column(Boolean, default=False)
    dedupe_key = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
