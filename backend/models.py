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

class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    topic = Column(Text, nullable=False)
    format = Column(String, default="AI Simulation") # 1-on-1, Parliamentary, Oxford, Policy, Public Forum, AI Simulation
    assigned_position = Column(String, default="Affirmative") # Affirmative, Negative
    status = Column(String, default="Active") # Active, Completed, Scheduled
    scheduled_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    analyses = relationship("ArgumentAnalysis", back_populates="session")
    presentation_metrics = relationship("PresentationMetric", back_populates="session")
    performance_scores = relationship("PerformanceScore", back_populates="session")

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
