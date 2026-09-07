from datetime import datetime
import json
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="Learner")  # Learner, Debate Coach, Educator, Administrator
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    debate_sessions = relationship("DebateSession", back_populates="user", cascade="all, delete-orphan")
    presentation_analyses = relationship("PresentationAnalysis", back_populates="user", cascade="all, delete-orphan")
    debate_scores = relationship("DebateScore", back_populates="user", cascade="all, delete-orphan")
    learning_paths = relationship("LearningPath", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("ReportRecord", back_populates="user", cascade="all, delete-orphan")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    experience_level = Column(String(50), default="Beginner")  # Beginner, Intermediate, Advanced, Champion
    preferred_topics = Column(Text, default="[]")  # JSON list
    presentation_domains = Column(Text, default="[]")  # JSON list (e.g., Tech, Ethics, Policy)
    learning_goals = Column(Text, default="[]")  # JSON list
    coaching_preferences = Column(String(100), default="Socratic & Analytical")
    bio = Column(Text, default="")
    avatar_url = Column(String(255), default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")

class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    topic = Column(Text, nullable=False)
    format = Column(String(100), default="Oxford Debate")  
    # Formats: One-on-One Debate, Parliamentary Debate, Oxford Debate, Policy Debate, Public Forum Debate, AI Debate Simulation
    user_position = Column(String(50), default="Affirmative")  # Affirmative, Negative
    opponent_type = Column(String(50), default="AI")  # AI, Human
    ai_persona = Column(String(100), default="Dr. Eleanor Vance (Empirical Scholar)")
    status = Column(String(50), default="active")  # draft, active, completed
    duration_minutes = Column(Integer, default=15)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="debate_sessions")
    turns = relationship("DebateTurn", back_populates="session", cascade="all, delete-orphan", order_by="DebateTurn.turn_number")
    analyses = relationship("ArgumentAnalysis", back_populates="session", cascade="all, delete-orphan")
    fallacies = relationship("FallacyDetection", back_populates="session", cascade="all, delete-orphan")
    counterarguments = relationship("Counterargument", back_populates="session", cascade="all, delete-orphan")
    scores = relationship("DebateScore", back_populates="session", cascade="all, delete-orphan")

class DebateTurn(Base):
    __tablename__ = "debate_turns"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False)
    speaker = Column(String(50), nullable=False)  # User, AI Opponent, Coach
    turn_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    audio_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DebateSession", back_populates="turns")

class ArgumentAnalysis(Base):
    __tablename__ = "argument_analyses"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=True)
    turn_id = Column(Integer, ForeignKey("debate_turns.id"), nullable=True)
    claim = Column(Text, nullable=False)
    evidence = Column(Text, default="")
    reasoning_quality = Column(Text, default="")
    clarity_score = Column(Float, default=75.0)
    relevance_score = Column(Float, default=80.0)
    evidence_strength_score = Column(Float, default=70.0)
    logical_consistency_score = Column(Float, default=85.0)
    persuasiveness_score = Column(Float, default=78.0)
    feedback = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DebateSession", back_populates="analyses")

class FallacyDetection(Base):
    __tablename__ = "fallacy_detections"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=True)
    turn_id = Column(Integer, ForeignKey("debate_turns.id"), nullable=True)
    fallacy_type = Column(String(100), nullable=False)  
    # Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, Red Herring
    quote = Column(Text, nullable=False)
    explanation = Column(Text, nullable=False)
    correction_suggestion = Column(Text, nullable=False)
    severity = Column(String(50), default="Medium")  # Low, Medium, High
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DebateSession", back_populates="fallacies")

class Counterargument(Base):
    __tablename__ = "counterarguments"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=True)
    turn_id = Column(Integer, ForeignKey("debate_turns.id"), nullable=True)
    argument_type = Column(String(100), nullable=False)  
    # Logical Rebuttals, Evidence-Based Rebuttals, Ethical Counterarguments, Practical Counterarguments, Policy Counterarguments
    rebuttal_text = Column(Text, nullable=False)
    strategy_tip = Column(Text, default="")
    challenge_question = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DebateSession", back_populates="counterarguments")

class PresentationAnalysis(Base):
    __tablename__ = "presentation_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    transcript = Column(Text, nullable=False)
    duration_seconds = Column(Float, default=60.0)
    speech_pace_wpm = Column(Float, default=140.0)
    filler_words_count = Column(Integer, default=0)
    filler_words_breakdown = Column(Text, default="{}")  # JSON string
    confidence_score = Column(Float, default=80.0)
    clarity_score = Column(Float, default=85.0)
    engagement_score = Column(Float, default=78.0)
    feedback = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="presentation_analyses")

class DebateScore(Base):
    __tablename__ = "debate_scores"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Exact Weighted Model:
    # Argument Quality (30%)
    # Evidence Usage (20%)
    # Logical Consistency (20%)
    # Rebuttal Effectiveness (15%)
    # Communication Skills (15%)
    argument_quality = Column(Float, nullable=False, default=75.0)
    evidence_usage = Column(Float, nullable=False, default=70.0)
    logical_consistency = Column(Float, nullable=False, default=80.0)
    rebuttal_effectiveness = Column(Float, nullable=False, default=75.0)
    communication_skills = Column(Float, nullable=False, default=85.0)
    overall_score = Column(Float, nullable=False, default=77.0)
    grade = Column(String(10), default="B+")  # A+, A, B+, B, C, etc.
    strengths = Column(Text, default="[]")  # JSON list
    weaknesses = Column(Text, default="[]")  # JSON list
    feedback_summary = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="debate_scores")
    session = relationship("DebateSession", back_populates="scores")

class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    progress_percentage = Column(Float, default=0.0)
    status = Column(String(50), default="in_progress")  # in_progress, completed
    milestones_json = Column(Text, default="[]")  # JSON list of modules & drills
    current_level = Column(String(50), default="Beginner")
    target_level = Column(String(50), default="Advanced Debater")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="learning_paths")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="alert")  # reminder, alert, milestone, feedback, announcement
    is_read = Column(Boolean, default=False)
    link = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class ReportRecord(Base):
    __tablename__ = "report_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_type = Column(String(50), nullable=False)  # debate, presentation, performance, coaching, progress
    title = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    format = Column(String(20), default="pdf")  # pdf, csv, excel
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")
