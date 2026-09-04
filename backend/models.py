from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    JSON
)
from database import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(512), nullable=False)
    role = Column(String(30), default="learner", nullable=False)  # learner, coach, educator, admin
    experience_level = Column(String(50), default="beginner")  # beginner, intermediate, advanced
    preferred_topics = Column(JSON, default=list)
    presentation_domains = Column(JSON, default=list)
    learning_goals = Column(JSON, default=list)
    coaching_preferences = Column(JSON, default=list)
    created_at = Column(DateTime, default=utc_now)


class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    topic = Column(String(500), nullable=False)
    format = Column(String(80), default="One-on-One Debate")
    position = Column(String(50), default="for")  # for / against
    status = Column(String(30), default="active")  # active / completed
    persona = Column(String(50), default="skeptical")
    turns = Column(JSON, default=list)  # list of {role, content, coach_feedback, timestamp}
    scores = Column(JSON, default=dict)  # final weighted scores
    created_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)


class PresentationAnalysis(Base):
    __tablename__ = "presentation_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    transcript = Column(Text, nullable=False)
    duration_seconds = Column(Float, nullable=False, default=60.0)
    overall_score = Column(Float, nullable=False, default=0.0)
    pace_score = Column(Float, nullable=False, default=0.0)
    filler_score = Column(Float, nullable=False, default=0.0)
    confidence_score = Column(Float, nullable=False, default=0.0)
    clarity_score = Column(Float, nullable=False, default=0.0)
    engagement_score = Column(Float, nullable=False, default=0.0)
    metrics_data = Column(JSON, default=dict)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="reminder")  # reminder, feedback, practice, milestone, announcement
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)


class CoachingPlan(Base):
    __tablename__ = "coaching_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    strongest_skill = Column(String(100), default="")
    weakest_skill = Column(String(100), default="")
    recommendations = Column(JSON, default=list)
    learning_plan = Column(JSON, default=list)
    created_at = Column(DateTime, default=utc_now)
