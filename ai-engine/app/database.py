import psycopg2
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
db_mongo = mongo_client[settings.MONGO_DB_NAME]


def get_postgres_connection():
    try:
        return psycopg2.connect(settings.DATABASE_URL)
    except psycopg2.OperationalError as error:
        if "password authentication failed" in str(error):
            raise RuntimeError(
                "PostgreSQL authentication failed. Update DATABASE_URL in ai-engine/.env "
                "with the real password for the local postgres user."
            ) from error
        raise


def init_postgres():
    conn = get_postgres_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS debate_performance (
            id SERIAL PRIMARY KEY,
            session_id TEXT NOT NULL,
            debate_format TEXT NOT NULL,
            words_per_minute INTEGER,
            pace_status TEXT NOT NULL,
            filler_word_count INTEGER NOT NULL,
            fallacy_detected BOOLEAN NOT NULL,
            fallacy_type TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)

    # ✅ FIX: typed-mode sessions have no real speaking duration, so
    # words_per_minute is honestly NULL for them — this table originally
    # required it NOT NULL, from before that feature existed. Idempotent,
    # safe to run every startup.
    cursor.execute("ALTER TABLE debate_performance ALTER COLUMN words_per_minute DROP NOT NULL;")

    # Delivery Coach (Agent 3) columns
    cursor.execute("ALTER TABLE debate_performance ADD COLUMN IF NOT EXISTS confidence_score INTEGER;")
    cursor.execute("ALTER TABLE debate_performance ADD COLUMN IF NOT EXISTS clarity_score INTEGER;")  # speech clarity (delivery)
    cursor.execute("ALTER TABLE debate_performance ADD COLUMN IF NOT EXISTS grammar_issue_count INTEGER;")

    # Argument Analyst (Agent 4) columns — prefixed "arg_" to avoid colliding
    # with the Delivery Coach's own clarity_score column above (different concept:
    # argument clarity vs. speech delivery clarity).
    cursor.execute("ALTER TABLE debate_performance ADD COLUMN IF NOT EXISTS arg_clarity_score INTEGER;")
    cursor.execute("ALTER TABLE debate_performance ADD COLUMN IF NOT EXISTS relevance_score INTEGER;")
    cursor.execute("ALTER TABLE debate_performance ADD COLUMN IF NOT EXISTS evidence_strength_score INTEGER;")
    cursor.execute("ALTER TABLE debate_performance ADD COLUMN IF NOT EXISTS logical_consistency_score INTEGER;")
    cursor.execute("ALTER TABLE debate_performance ADD COLUMN IF NOT EXISTS persuasiveness_score INTEGER;")

    # ✅ NEW: real per-agent-call performance log — one row per LLM call
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_performance_log (
            id SERIAL PRIMARY KEY,
            session_id TEXT,
            agent_name TEXT NOT NULL,
            model TEXT NOT NULL,
            latency_ms INTEGER NOT NULL,
            input_tokens INTEGER,
            output_tokens INTEGER,
            total_tokens INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)

    conn.commit()
    cursor.close()
    conn.close()


def log_agent_call(session_id: str, agent_name: str, model: str, latency_ms: int,
                    input_tokens=None, output_tokens=None, total_tokens=None):
    """
    Real per-call logging. Token counts are only recorded when the LLM
    response actually exposes usage_metadata — if it doesn't (varies by
    call type), we store NULL rather than guess a number.
    """
    try:
        conn = get_postgres_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO agent_performance_log
                (session_id, agent_name, model, latency_ms, input_tokens, output_tokens, total_tokens)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
            """,
            (session_id, agent_name, model, latency_ms, input_tokens, output_tokens, total_tokens)
        )
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        # Never let logging failures break the actual debate turn
        print(f"agent_performance_log insert failed: {e}")