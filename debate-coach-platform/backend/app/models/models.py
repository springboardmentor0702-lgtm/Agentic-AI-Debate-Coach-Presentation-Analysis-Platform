from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RoleEnum(str, PyEnum):
    LEARNER = "LEARNER"
    DEBATE_COACH = "DEBATE_COACH"
    EDUCATOR = "EDUCATOR"
    ADMIN = "ADMIN"


class DebateStatus(str, PyEnum):
    CREATED = "CREATED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class DebateFormat(str, PyEnum):
    ONE_ON_ONE = "ONE_ON_ONE"
    PARLIAMENTARY = "PARLIAMENTARY"
    OXFORD = "OXFORD"
    POLICY = "POLICY"
    PUBLIC_FORUM = "PUBLIC_FORUM"
    AI_DEBATE_SIMULATION = "AI_DEBATE_SIMULATION"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default=RoleEnum.LEARNER.value, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    profile: Mapped["UserProfile | None"] = relationship(back_populates="user")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user")
    debates: Mapped[list["DebateSession"]] = relationship(back_populates="user")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
    presentations: Mapped[list["Presentation"]] = relationship(back_populates="user")
    coaching_recommendations: Mapped[list["CoachingRecommendation"]] = relationship(back_populates="user")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token: Mapped[str] = mapped_column(String(512), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user: Mapped[User] = relationship(back_populates="refresh_tokens")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    experience_level: Mapped[str] = mapped_column(String(50), default="Beginner", nullable=False)
    preferred_debate_topics: Mapped[str | None] = mapped_column(Text)
    presentation_domains: Mapped[str | None] = mapped_column(Text)
    learning_goals: Mapped[str | None] = mapped_column(Text)
    coaching_preferences: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user: Mapped[User] = relationship(back_populates="profile")


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class SkillHistory(Base):
    __tablename__ = "skill_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_name: Mapped[str] = mapped_column(String(100), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    source: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    format: Mapped[str] = mapped_column(String(50), default=DebateFormat.ONE_ON_ONE.value, nullable=False)
    user_position: Mapped[str] = mapped_column(String(255), nullable=False)
    ai_position: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default=DebateStatus.CREATED.value, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user: Mapped[User] = relationship(back_populates="debates")
    messages: Mapped[list["DebateMessage"]] = relationship(back_populates="debate_session", cascade="all, delete-orphan")
    analyses: Mapped[list["DebateAnalysis"]] = relationship(back_populates="debate_session", cascade="all, delete-orphan")


class DebateMessage(Base):
    __tablename__ = "debate_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    debate_session_id: Mapped[int] = mapped_column(ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False)
    sender: Mapped[str] = mapped_column(String(20), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    debate_session: Mapped[DebateSession] = relationship(back_populates="messages")


class DebateAnalysis(Base):
    __tablename__ = "debate_analysis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    debate_session_id: Mapped[int] = mapped_column(ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False)
    scores: Mapped[str | None] = mapped_column(Text)
    strengths: Mapped[str | None] = mapped_column(Text)
    weaknesses: Mapped[str | None] = mapped_column(Text)
    suggestions: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    debate_session: Mapped[DebateSession] = relationship(back_populates="analyses")


class FallacyResult(Base):
    __tablename__ = "fallacy_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    debate_session_id: Mapped[int | None] = mapped_column(ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    fallacies: Mapped[str] = mapped_column(Text, nullable=False)
    overall_reasoning_quality: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    recommendations: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class PerformanceScore(Base):
    __tablename__ = "performance_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    debate_session_id: Mapped[int | None] = mapped_column(ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=True)
    argument_quality: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    evidence_usage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    logical_consistency: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rebuttal_effectiveness: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    communication_skills: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    strengths: Mapped[str | None] = mapped_column(Text)
    weaknesses: Mapped[str | None] = mapped_column(Text)
    recommendations: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Presentation(Base):
    __tablename__ = "presentations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="UPLOADED", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user: Mapped[User] = relationship(back_populates="presentations")
    analysis: Mapped["PresentationAnalysis | None"] = relationship(back_populates="presentation", cascade="all, delete-orphan")


class PresentationAnalysis(Base):
    __tablename__ = "presentation_analysis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    presentation_id: Mapped[int] = mapped_column(ForeignKey("presentations.id", ondelete="CASCADE"), unique=True, nullable=False)
    transcript: Mapped[str | None] = mapped_column(Text)
    pace: Mapped[float | None] = mapped_column(Float)
    filler_word_usage: Mapped[int | None] = mapped_column(Integer)
    clarity_score: Mapped[float | None] = mapped_column(Float)
    confidence_score: Mapped[float | None] = mapped_column(Float)
    engagement_score: Mapped[float | None] = mapped_column(Float)
    speaking_duration_seconds: Mapped[float | None] = mapped_column(Float)
    words_per_minute: Mapped[float | None] = mapped_column(Float)
    long_pauses: Mapped[int | None] = mapped_column(Integer)
    ai_feedback: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    presentation: Mapped[Presentation] = relationship(back_populates="analysis")


class CoachingRecommendation(Base):
    __tablename__ = "coaching_recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    priority_skills: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_exercises: Mapped[str] = mapped_column(Text, nullable=False)
    weekly_plan: Mapped[str] = mapped_column(Text, nullable=False)
    improvement_goals: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user: Mapped[User] = relationship(back_populates="coaching_recommendations")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user: Mapped[User] = relationship(back_populates="notifications")


class Class(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    educator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ClassStudent(Base):
    __tablename__ = "class_students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class DebateRequest(Base):
    __tablename__ = "debate_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    learner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expert_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class HumanDebate(Base):
    __tablename__ = "human_debates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("debate_requests.id", ondelete="CASCADE"), unique=True, nullable=False)
    learner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expert_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class HumanDebateMessage(Base):
    __tablename__ = "human_debate_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    debate_id: Mapped[int] = mapped_column(ForeignKey("human_debates.id", ondelete="CASCADE"), nullable=False)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(String(20), default="TEXT", nullable=False)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class DebateFeedback(Base):
    __tablename__ = "debate_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    debate_id: Mapped[int] = mapped_column(ForeignKey("human_debates.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
