from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime
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
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("DebateSession", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    topic = Column(Text, nullable=False)
    format = Column(String, default="AI Simulation")  # "Debate", "Speech Analysis", "Vocal Matrix", "Agent Simulation", "Oxford Style", "Parliamentary"
    assigned_position = Column(String, default="Affirmative")
    status = Column(String, default="Active")
    scheduled_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    analyses = relationship("ArgumentAnalysis", back_populates="session", cascade="all, delete-orphan")
    presentation_metrics = relationship("PresentationMetric", back_populates="session", cascade="all, delete-orphan")
    performance_scores = relationship("PerformanceScore", back_populates="session", cascade="all, delete-orphan")
    simulation_turns = relationship("SimulationTurn", back_populates="session", cascade="all, delete-orphan")


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
    created_at = Column(DateTime, default=datetime.utcnow)

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
    detected_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("ArgumentAnalysis", back_populates="fallacies")


class Counterargument(Base):
    __tablename__ = "counterarguments"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("argument_analyses.id"), nullable=False, index=True)
    rebuttal_type = Column(String, default="Logical")
    rebuttal_text = Column(Text, nullable=False)
    challenge_question = Column(Text)
    strategy_tip = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DebateSession", back_populates="performance_scores")


class CoachingPlan(Base):
    __tablename__ = "coaching_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    skill_gap_summary = Column(Text)
    targeted_recommendations = Column(Text)
    learning_path_steps = Column(Text)
    progress_status = Column(String, default="In Progress")
    updated_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String, default="System")  # "Debate", "Speech Analysis", "Vocal Matrix", "Agent Simulation", "Milestone Alert", "Platform Announcement"
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")
