from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    JSON
)

from database import Base


class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(120),
        nullable=False
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String(512),
        nullable=False
    )

    role = Column(
        String(30),
        default="learner",
        nullable=False
    )

    experience_level = Column(
        String(50),
        default="beginner"
    )

    preferred_topics = Column(
        JSON,
        default=list
    )

    presentation_domains = Column(
        JSON,
        default=list
    )

    learning_goals = Column(
        JSON,
        default=list
    )

    coaching_preferences = Column(
        JSON,
        default=list
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


class DebateSession(Base):

    __tablename__ = "debate_sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    topic = Column(
        String(500),
        nullable=False
    )

    format = Column(
        String(80),
        default="one-on-one"
    )

    position = Column(
        String(50),
        default="for"
    )

    status = Column(
        String(30),
        default="active"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    completed_at = Column(
        DateTime,
        nullable=True
    )
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import Text
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey

from datetime import datetime

from database import Base


class PresentationAnalysis(Base):

    __tablename__ = "presentation_analyses"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    transcript = Column(
        Text,
        nullable=False
    )

    duration_seconds = Column(
        Float,
        nullable=False
    )

    overall_score = Column(
        Float,
        nullable=False
    )

    pace_score = Column(
        Float,
        nullable=False
    )

    filler_score = Column(
        Float,
        nullable=False
    )

    confidence_score = Column(
        Float,
        nullable=False
    )

    clarity_score = Column(
        Float,
        nullable=False
    )

    engagement_score = Column(
        Float,
        nullable=False
    )

    feedback = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )
