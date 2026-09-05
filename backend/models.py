from datetime import datetime, timezone


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="Learner")
    experience_level = Column(String, default="Intermediate")
    preferred_topics = Column(String, default="Technology, Ethics, Policy")
    presentation_domains = Column(String, default="Public Speaking, Keynotes")
    learning_goals = Column(String, default="Reduce filler words, Master counterarguments")
    coaching_preferences = Column(String, default="Real-time alerts, Detailed post-session audits")
    is_active = Column(Boolean, default=True, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive)

    sessions = relationship("DebateSession", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    feedback_received = relationship(
        "CoachFeedback",
        foreign_keys="CoachFeedback.learner_id",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    feedback_given = relationship(
        "CoachFeedback",
        foreign_keys="CoachFeedback.coach_id",
        back_populates="coach",
    )
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    assignments_as_coach = relationship(
        "CoachAssignment", foreign_keys="CoachAssignment.coach_id", back_populates="coach", cascade="all, delete-orphan"
    )
    assignments_as_learner = relationship(
        "CoachAssignment", foreign_keys="CoachAssignment.learner_id", back_populates="learner", cascade="all, delete-orphan"
    )
    progress_records = relationship("LearningProgress", back_populates="user", cascade="all, delete-orphan")
    uploaded_artifacts = relationship("UploadedArtifact", back_populates="user", cascade="all, delete-orphan")


class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    topic = Column(Text, nullable=False)
    format = Column(String, default="AI Simulation")
    assigned_position = Column(String, default="Affirmative")
    status = Column(String, default="Active")
    scheduled_at = Column(DateTime, default=utc_now_naive)
    created_at = Column(DateTime, default=utc_now_naive)

    user = relationship("User", back_populates="sessions")
    analyses = relationship("ArgumentAnalysis", back_populates="session", cascade="all, delete-orphan")
    presentation_metrics = relationship("PresentationMetric", back_populates="session", cascade="all, delete-orphan")
    performance_scores = relationship("PerformanceScore", back_populates="session", cascade="all, delete-orphan")
    simulation_turns = relationship("SimulationTurn", back_populates="session", cascade="all, delete-orphan")
    feedback = relationship("CoachFeedback", back_populates="session", cascade="all, delete-orphan")
    uploaded_artifacts = relationship("UploadedArtifact", back_populates="session", cascade="all, delete-orphan")


class ArgumentAnalysis(Base):
    __tablename__ = "argument_analyses"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    raw_speech_text = Column(Text, nullable=False)
    claim_identified = Column(Text)
    evidence_strength = Column(Float, default=0.0)
    reasoning_quality = Column(Float, default=0.0)
    clarity_score = Column(Float, default=0.0)
    relevance_score = Column(Float, default=0.0)
    logical_consistency = Column(Float, default=0.0)
    persuasiveness_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now_naive)

    session = relationship("DebateSession", back_populates="analyses")
    fallacies = relationship("FallacyLog", back_populates="analysis", cascade="all, delete-orphan")
    counterarguments = relationship("Counterargument", back_populates="analysis", cascade="all, delete-orphan")


class FallacyLog(Base):
    __tablename__ = "fallacy_logs"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("argument_analyses.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    fallacy_type = Column(String, nullable=False)
    explanation = Column(Text)
    correction_suggestion = Column(Text)
    detected_at = Column(DateTime, default=utc_now_naive)

    analysis = relationship("ArgumentAnalysis", back_populates="fallacies")


class Counterargument(Base):
    __tablename__ = "counterarguments"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("argument_analyses.id"), nullable=False, index=True)
    rebuttal_type = Column(String, default="Logical")
    rebuttal_text = Column(Text, nullable=False)
    challenge_question = Column(Text)
    strategy_tip = Column(Text)
    created_at = Column(DateTime, default=utc_now_naive)

    analysis = relationship("ArgumentAnalysis", back_populates="counterarguments")


class SimulationTurn(Base):
    __tablename__ = "simulation_turns"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    turn_index = Column(Integer, nullable=False)
    user_argument = Column(Text, nullable=False)
    opponent_persona = Column(String, nullable=False)
    opponent_rebuttal = Column(Text, nullable=False)
    fallacies_json = Column(Text, nullable=False, default="[]")
    rebuttal_strength_percent = Column(Float, default=0.0)
    coaching_tip = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now_naive)

    session = relationship("DebateSession", back_populates="simulation_turns")


class PresentationMetric(Base):
    __tablename__ = "presentation_metrics"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    speech_pace_wpm = Column(Float, default=140.0)
    filler_words_count = Column(Integer, default=0)
    filler_words_list = Column(String, default="")
    confidence_score = Column(Float, default=0.0)
    clarity_score = Column(Float, default=0.0)
    engagement_score = Column(Float, default=0.0)
    duration_seconds = Column(Float, nullable=True)
    pause_count = Column(Integer, nullable=True)
    silence_ratio_percent = Column(Float, nullable=True)
    average_volume_percent = Column(Float, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive)

    session = relationship("DebateSession", back_populates="presentation_metrics")


class PerformanceScore(Base):
    __tablename__ = "performance_scores"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    argument_quality = Column(Float, default=0.0)
    evidence_use = Column(Float, default=0.0)
    logical_consistency = Column(Float, default=0.0)
    rebuttal_effectiveness = Column(Float, default=0.0)
    communication_skills = Column(Float, default=0.0)
    overall_weighted_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now_naive)

    session = relationship("DebateSession", back_populates="performance_scores")


class CoachingPlan(Base):
    __tablename__ = "coaching_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    skill_gap_summary = Column(Text)
    targeted_recommendations = Column(Text)
    learning_path_steps = Column(Text)
    progress_status = Column(String, default="In Progress")
    updated_at = Column(DateTime, default=utc_now_naive)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    source_type = Column(String, nullable=True)
    source_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)
    read_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="notifications")


class CoachFeedback(Base):
    __tablename__ = "coach_feedback"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False, index=True)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    learner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    rating = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)

    session = relationship("DebateSession", back_populates="feedback")
    coach = relationship("User", foreign_keys=[coach_id], back_populates="feedback_given")
    learner = relationship("User", foreign_keys=[learner_id], back_populates="feedback_received")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    event_type = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=True)
    resource_id = Column(Integer, nullable=True)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)

    user = relationship("User")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked_at = Column(DateTime, nullable=True)
    replaced_by_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)
    user = relationship("User", back_populates="refresh_tokens")


class CoachAssignment(Base):
    __tablename__ = "coach_assignments"
    __table_args__ = (UniqueConstraint("coach_id", "learner_id", name="uq_coach_learner_assignment"),)

    id = Column(Integer, primary_key=True, index=True)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    learner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String, default="Active", nullable=False)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)
    updated_at = Column(DateTime, default=utc_now_naive, nullable=False)
    coach = relationship("User", foreign_keys=[coach_id], back_populates="assignments_as_coach")
    learner = relationship("User", foreign_keys=[learner_id], back_populates="assignments_as_learner")


class LearningProgress(Base):
    __tablename__ = "learning_progress"
    __table_args__ = (UniqueConstraint("user_id", "skill", name="uq_learning_progress_user_skill"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    skill = Column(String, nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    practice_count = Column(Integer, default=0, nullable=False)
    streak_days = Column(Integer, default=0, nullable=False)
    last_practiced_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=utc_now_naive, nullable=False)
    user = relationship("User", back_populates="progress_records")


class UploadedArtifact(Base):
    __tablename__ = "uploaded_artifacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=True, index=True)
    storage_key = Column(String, unique=True, nullable=False)
    original_filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sha256 = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    user = relationship("User", back_populates="uploaded_artifacts")
    session = relationship("DebateSession", back_populates="uploaded_artifacts")


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    certificate_id = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False, index=True)
    issued_at = Column(DateTime, default=utc_now_naive, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    score = Column(Float, nullable=False)
    user = relationship("User")
    session = relationship("DebateSession")
