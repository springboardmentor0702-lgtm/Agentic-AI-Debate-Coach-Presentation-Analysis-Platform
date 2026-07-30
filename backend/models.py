from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="Learner") # Learner, Coach, Educator, Administrator
    experience_level = Column(String, default="Intermediate")
    preferred_topics = Column(String, default="Technology, Ethics, Policy")
    presentation_domains = Column(String, default="Public Speaking, Keynotes")
    learning_goals = Column(String, default="Reduce filler words, Master counterarguments")
    coaching_preferences = Column(String, default="Real-time alerts, Detailed post-session audits")
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("DebateSession", back_populates="user")
    participants = relationship("DebateParticipant", back_populates="user")
    invitations_sent = relationship("DebateInvitation", back_populates="inviter", foreign_keys="DebateInvitation.inviter_user_id")
    invitations_received = relationship("DebateInvitation", back_populates="invited_user", foreign_keys="DebateInvitation.invited_user_id")
    notifications = relationship("Notification", back_populates="user")

class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    topic = Column(Text, nullable=False)
    description = Column(Text, default="")
    format = Column(String, default="AI Simulation") # One-on-One, Parliamentary, Oxford, Policy, Public Forum, AI Simulation
    assigned_position = Column(String, default="Affirmative") # Affirmative, Negative
    status = Column(String, default="Active") # Draft, Scheduled, Live, Completed, Cancelled, Active (legacy)
    scheduled_at = Column(DateTime, default=datetime.utcnow)
    timezone = Column(String, default="UTC")
    duration_minutes = Column(Integer, default=60)
    visibility = Column(String, default="Private")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    analyses = relationship("ArgumentAnalysis", back_populates="session")
    presentation_metrics = relationship("PresentationMetric", back_populates="session")
    performance_scores = relationship("PerformanceScore", back_populates="session")
    participants = relationship("DebateParticipant", back_populates="session", cascade="all, delete-orphan")
    invitations = relationship("DebateInvitation", back_populates="session", cascade="all, delete-orphan")
    recordings = relationship("DebateRecording", back_populates="session", cascade="all, delete-orphan")


class DebateParticipant(Base):
    __tablename__ = "debate_participants"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    invited_email = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    position = Column(String, nullable=True)
    team = Column(String, nullable=True)
    participant_role = Column(String, default="Participant")
    invitation_status = Column(String, default="Pending")
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("DebateSession", back_populates="participants")
    user = relationship("User", back_populates="participants")


class DebateInvitation(Base):
    __tablename__ = "debate_invitations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False)
    inviter_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invited_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    invited_email = Column(String, nullable=True)
    status = Column(String, default="Pending")
    position = Column(String, nullable=True)
    team = Column(String, nullable=True)
    message = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    responded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("DebateSession", back_populates="invitations")
    inviter = relationship("User", back_populates="invitations_sent", foreign_keys=[inviter_user_id])
    invited_user = relationship("User", back_populates="invitations_received", foreign_keys=[invited_user_id])


class DebateRecording(Base):
    __tablename__ = "debate_recordings"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False)
    recording_type = Column(String, default="audio")
    recording_path = Column(Text, nullable=True)
    uploaded_file_name = Column(String, nullable=True)
    transcript = Column(Text, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DebateSession", back_populates="recordings")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    related_entity_type = Column(String, nullable=True)
    related_entity_id = Column(Integer, nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class ArgumentAnalysis(Base):
    __tablename__ = "argument_analyses"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    raw_speech_text = Column(Text, nullable=False)
    claim_identified = Column(Text)
    evidence_strength = Column(Float, default=0.0) # 0 to 100
    reasoning_quality = Column(Float, default=0.0)
    clarity_score = Column(Float, default=0.0)
    relevance_score = Column(Float, default=0.0)
    logical_consistency = Column(Float, default=0.0)
    persuasiveness_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DebateSession", back_populates="analyses")
    fallacies = relationship("FallacyLog", back_populates="analysis")
    counterarguments = relationship("Counterargument", back_populates="analysis")

class FallacyLog(Base):
    __tablename__ = "fallacy_logs"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("argument_analyses.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    fallacy_type = Column(String, nullable=False) # Ad Hominem, Straw Man, False Dilemma, Slippery Slope, etc.
    explanation = Column(Text)
    correction_suggestion = Column(Text)
    detected_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("ArgumentAnalysis", back_populates="fallacies")

class Counterargument(Base):
    __tablename__ = "counterarguments"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("argument_analyses.id"))
    rebuttal_type = Column(String, default="Logical") # Logical, Evidence-Based, Ethical, Practical, Policy
    rebuttal_text = Column(Text, nullable=False)
    challenge_question = Column(Text)
    strategy_tip = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("ArgumentAnalysis", back_populates="counterarguments")

class PresentationMetric(Base):
    __tablename__ = "presentation_metrics"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    speech_pace_wpm = Column(Float, default=140.0)
    filler_words_count = Column(Integer, default=0)
    filler_words_list = Column(String, default="") # e.g. "um:3, like:2"
    confidence_score = Column(Float, default=0.0)
    clarity_score = Column(Float, default=0.0)
    engagement_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DebateSession", back_populates="presentation_metrics")

class PerformanceScore(Base):
    __tablename__ = "performance_scores"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    argument_quality = Column(Float, default=0.0) # 30%
    evidence_use = Column(Float, default=0.0) # 20%
    logical_consistency = Column(Float, default=0.0) # 20%
    rebuttal_effectiveness = Column(Float, default=0.0) # 15%
    communication_skills = Column(Float, default=0.0) # 15%
    overall_weighted_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DebateSession", back_populates="performance_scores")

class CoachingPlan(Base):
    __tablename__ = "coaching_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    skill_gap_summary = Column(Text)
    targeted_recommendations = Column(Text)
    learning_path_steps = Column(Text)
    progress_status = Column(String, default="In Progress")
    updated_at = Column(DateTime, default=datetime.utcnow)
