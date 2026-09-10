-- MindArena AI: Complete PostgreSQL & Supabase Database Migration
-- Includes RLS policies, indexes, foreign keys, and pgvector for coaching RAG

-- Enable UUID and Vector extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('learner', 'coach', 'educator', 'admin')),
    username TEXT UNIQUE NOT NULL,
    experience_level TEXT DEFAULT 'intermediate' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    participate_in_comparison BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DEBATE_TOPICS
CREATE TABLE IF NOT EXISTS debate_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT DEFAULT 'intermediate',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ARGUMENT_ANALYSES
CREATE TABLE IF NOT EXISTS argument_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    argument TEXT NOT NULL,
    overall_score NUMERIC(5,2) NOT NULL,
    scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    claims JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_quality NUMERIC(5,2),
    logical_strength NUMERIC(5,2),
    fallacies JSONB DEFAULT '[]'::jsonb,
    counterarguments JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FALLACY_DETECTIONS
CREATE TABLE IF NOT EXISTS fallacy_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    argument_text TEXT NOT NULL,
    credibility_score NUMERIC(5,2) NOT NULL,
    fallacies_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COUNTERARGUMENTS
CREATE TABLE IF NOT EXISTS counterarguments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    target_argument TEXT NOT NULL,
    counterarguments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CASE_REVIEWS
CREATE TABLE IF NOT EXISTS case_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    argument_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
    fallacy_detection JSONB NOT NULL DEFAULT '{}'::jsonb,
    synthesis TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PRESENTATION_ANALYSES
CREATE TABLE IF NOT EXISTS presentation_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Untitled Presentation',
    transcript TEXT NOT NULL,
    duration_seconds NUMERIC(8,2) NOT NULL,
    words_per_minute NUMERIC(6,2) NOT NULL,
    pace JSONB NOT NULL DEFAULT '{}'::jsonb,
    filler_words JSONB NOT NULL DEFAULT '[]'::jsonb,
    clarity_score NUMERIC(5,2),
    confidence_score NUMERIC(5,2),
    structure_score NUMERIC(5,2),
    recommendations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DEBATE_SESSIONS
CREATE TABLE IF NOT EXISTS debate_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('ai', 'human')),
    user_stance TEXT DEFAULT 'pro' CHECK (user_stance IN ('pro', 'con')),
    invite_status TEXT DEFAULT 'accepted' CHECK (invite_status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    round_count INT DEFAULT 1,
    final_verdict JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DEBATE_ROUNDS
CREATE TABLE IF NOT EXISTS debate_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    speaker_role TEXT NOT NULL,
    speech_text TEXT NOT NULL,
    judge_feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. PERFORMANCE_SNAPSHOTS
CREATE TABLE IF NOT EXISTS performance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    overall_score NUMERIC(5,2) NOT NULL,
    debate_score NUMERIC(5,2) NOT NULL,
    presentation_score NUMERIC(5,2) NOT NULL,
    logical_reasoning NUMERIC(5,2) NOT NULL,
    evidence_quality NUMERIC(5,2) NOT NULL,
    practice_streak INT DEFAULT 0,
    components JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. GOALS
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    metric TEXT NOT NULL,
    target_value NUMERIC(6,2) NOT NULL,
    current_value NUMERIC(6,2) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'in_progress')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. CLASSES
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. CLASS_MEMBERS
CREATE TABLE IF NOT EXISTS class_members (
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (class_id, learner_id)
);

-- 14. COACH_FEEDBACK
CREATE TABLE IF NOT EXISTS coach_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('argument', 'debate', 'presentation', 'general')),
    item_id UUID,
    feedback_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. RESEARCH_BRIEFS
CREATE TABLE IF NOT EXISTS research_briefs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    brief JSONB NOT NULL DEFAULT '{}'::jsonb,
    iterations INT NOT NULL DEFAULT 1,
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. COACHING_AGENT_SESSIONS
CREATE TABLE IF NOT EXISTS coaching_agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    tools_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    tool_results JSONB NOT NULL DEFAULT '{}'::jsonb,
    proposed_goal JSONB DEFAULT NULL,
    final_recommendation TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. COACHING_EMBEDDINGS (pgvector RAG)
CREATE TABLE IF NOT EXISTS coaching_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_argument_analyses_user_id ON argument_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_debate_sessions_user_id ON debate_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_debate_sessions_opponent_id ON debate_sessions(opponent_id);
CREATE INDEX IF NOT EXISTS idx_debate_rounds_session_id ON debate_rounds(session_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_class_members_learner_id ON class_members(learner_id);
CREATE INDEX IF NOT EXISTS idx_coaching_embeddings_category ON coaching_embeddings(category);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE argument_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fallacy_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterarguments ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Standard RLS Policies: Users see their own data
CREATE POLICY profiles_user_policy ON profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY argument_analyses_user_policy ON argument_analyses
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY fallacy_detections_user_policy ON fallacy_detections
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY counterarguments_user_policy ON counterarguments
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY case_reviews_user_policy ON case_reviews
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY presentation_analyses_user_policy ON presentation_analyses
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY debate_sessions_user_policy ON debate_sessions
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = opponent_id);

CREATE POLICY goals_user_policy ON goals
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = assigned_by);

CREATE POLICY notifications_user_policy ON notifications
    FOR ALL USING (auth.uid() = user_id);
