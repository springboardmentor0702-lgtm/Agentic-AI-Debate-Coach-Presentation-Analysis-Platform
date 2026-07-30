from sqlalchemy import inspect, text


def _timestamp_type(engine) -> str:
    if engine.dialect.name == "postgresql":
        return "TIMESTAMP"
    return "DATETIME"


def sync_debate_session_schema(engine) -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "debate_sessions" not in table_names:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("debate_sessions")}
    statements = []

    if "description" not in existing_columns:
        statements.append("ALTER TABLE debate_sessions ADD COLUMN description TEXT DEFAULT ''")
    if "timezone" not in existing_columns:
        statements.append("ALTER TABLE debate_sessions ADD COLUMN timezone VARCHAR DEFAULT 'UTC'")
    if "duration_minutes" not in existing_columns:
        statements.append("ALTER TABLE debate_sessions ADD COLUMN duration_minutes INTEGER DEFAULT 60")
    if "visibility" not in existing_columns:
        statements.append("ALTER TABLE debate_sessions ADD COLUMN visibility VARCHAR DEFAULT 'Private'")
    if "updated_at" not in existing_columns:
        statements.append(f"ALTER TABLE debate_sessions ADD COLUMN updated_at {_timestamp_type(engine)} DEFAULT CURRENT_TIMESTAMP")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))