-- LOGOS.AI local SQLite database schema
-- Run this script with SQLite, or start the FastAPI app to create the same tables through SQLAlchemy.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'Learner',
    experience_level VARCHAR DEFAULT 'Intermediate',
    preferred_topics VARCHAR DEFAULT 'Technology, Ethics, Policy',
    presentation_domains VARCHAR DEFAULT 'Public Speaking, Keynotes',
    learning_goals VARCHAR DEFAULT 'Reduce filler words, Master counterarguments',
    coaching_preferences VARCHAR DEFAULT 'Real-time alerts, Detailed post-session audits',
    created_at DATETIME
);

CREATE TABLE IF NOT EXISTS debate_sessions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR NOT NULL,
    topic TEXT NOT NULL,
    format VARCHAR DEFAULT 'AI Simulation',
    assigned_position VARCHAR DEFAULT 'Affirmative',
    status VARCHAR DEFAULT 'Active',
    scheduled_at DATETIME,
    created_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS argument_analyses (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    raw_speech_text TEXT NOT NULL,
    claim_identified TEXT,
    evidence_strength FLOAT DEFAULT 0,
    reasoning_quality FLOAT DEFAULT 0,
    clarity_score FLOAT DEFAULT 0,
    relevance_score FLOAT DEFAULT 0,
    logical_consistency FLOAT DEFAULT 0,
    persuasiveness_score FLOAT DEFAULT 0,
    created_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES debate_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS fallacy_logs (
    id INTEGER PRIMARY KEY,
    analysis_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    fallacy_type VARCHAR NOT NULL,
    explanation TEXT,
    correction_suggestion TEXT,
    detected_at DATETIME,
    FOREIGN KEY (analysis_id) REFERENCES argument_analyses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS counterarguments (
    id INTEGER PRIMARY KEY,
    analysis_id INTEGER NOT NULL,
    rebuttal_type VARCHAR DEFAULT 'Logical',
    rebuttal_text TEXT NOT NULL,
    challenge_question TEXT,
    strategy_tip TEXT,
    created_at DATETIME,
    FOREIGN KEY (analysis_id) REFERENCES argument_analyses(id)
);

CREATE TABLE IF NOT EXISTS simulation_turns (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    turn_index INTEGER NOT NULL,
    user_argument TEXT NOT NULL,
    opponent_persona VARCHAR NOT NULL,
    opponent_rebuttal TEXT NOT NULL,
    fallacies_json TEXT NOT NULL DEFAULT '[]',
    rebuttal_strength_percent FLOAT DEFAULT 0,
    coaching_tip TEXT NOT NULL,
    created_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES debate_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS presentation_metrics (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    speech_pace_wpm FLOAT DEFAULT 140,
    filler_words_count INTEGER DEFAULT 0,
    filler_words_list VARCHAR DEFAULT '',
    confidence_score FLOAT DEFAULT 0,
    clarity_score FLOAT DEFAULT 0,
    engagement_score FLOAT DEFAULT 0,
    created_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES debate_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS performance_scores (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    argument_quality FLOAT DEFAULT 0,
    evidence_use FLOAT DEFAULT 0,
    logical_consistency FLOAT DEFAULT 0,
    rebuttal_effectiveness FLOAT DEFAULT 0,
    communication_skills FLOAT DEFAULT 0,
    overall_weighted_score FLOAT DEFAULT 0,
    created_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES debate_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS coaching_plans (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    skill_gap_summary TEXT,
    targeted_recommendations TEXT,
    learning_path_steps TEXT,
    progress_status VARCHAR DEFAULT 'In Progress',
    updated_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS ix_debate_sessions_user_id ON debate_sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_argument_analyses_session_id ON argument_analyses(session_id);
CREATE INDEX IF NOT EXISTS ix_fallacy_logs_analysis_id ON fallacy_logs(analysis_id);
CREATE INDEX IF NOT EXISTS ix_simulation_turns_session_id ON simulation_turns(session_id);
CREATE INDEX IF NOT EXISTS ix_presentation_metrics_session_id ON presentation_metrics(session_id);
CREATE INDEX IF NOT EXISTS ix_performance_scores_session_id ON performance_scores(session_id);
