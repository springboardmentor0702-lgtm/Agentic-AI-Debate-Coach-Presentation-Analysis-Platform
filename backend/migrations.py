"""Small, dependency-free schema migration runner.

Fresh databases are created from SQLAlchemy metadata and existing installations are
upgraded with additive, idempotent migrations. For larger future changes this can
be replaced by Alembic without changing the application contract.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

LOGGER = logging.getLogger(__name__)
CURRENT_SCHEMA_VERSION = 3


def _ensure_version_table(engine: Engine) -> None:
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INTEGER PRIMARY KEY,
                    applied_at TIMESTAMP NOT NULL
                )
                """
            )
        )


def _applied_versions(engine: Engine) -> set[int]:
    with engine.connect() as connection:
        rows = connection.execute(text("SELECT version FROM schema_migrations")).fetchall()
    return {int(row[0]) for row in rows}


def _add_missing_columns(engine: Engine, table_name: str, columns: dict[str, str]) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns(table_name)}
    with engine.begin() as connection:
        for column_name, column_type in columns.items():
            if column_name not in existing:
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))


def _create_indexes(engine: Engine, statements: tuple[str, ...]) -> None:
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _migration_1_audio_and_workflow_schema(engine: Engine) -> None:
    _add_missing_columns(
        engine,
        "presentation_metrics",
        {
            "duration_seconds": "FLOAT",
            "pause_count": "INTEGER",
            "silence_ratio_percent": "FLOAT",
            "average_volume_percent": "FLOAT",
        },
    )
    _create_indexes(
        engine,
        (
            "CREATE INDEX IF NOT EXISTS ix_debate_sessions_user_id ON debate_sessions (user_id)",
            "CREATE INDEX IF NOT EXISTS ix_simulation_turns_session_id ON simulation_turns (session_id)",
            "CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id)",
            "CREATE INDEX IF NOT EXISTS ix_coach_feedback_session_id ON coach_feedback (session_id)",
        ),
    )


def _migration_2_security_and_workflow_schema(engine: Engine) -> None:
    """Add security state to users and indexes for new workflow records."""
    _add_missing_columns(
        engine,
        "users",
        {
            "is_active": "BOOLEAN NOT NULL DEFAULT TRUE",
            "failed_login_attempts": "INTEGER NOT NULL DEFAULT 0",
            "locked_until": "TIMESTAMP",
            "last_login_at": "TIMESTAMP",
        },
    )
    _create_indexes(
        engine,
        (
            "CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON refresh_tokens (user_id)",
            "CREATE INDEX IF NOT EXISTS ix_refresh_tokens_expires_at ON refresh_tokens (expires_at)",
            "CREATE INDEX IF NOT EXISTS ix_coach_assignments_coach_id ON coach_assignments (coach_id)",
            "CREATE INDEX IF NOT EXISTS ix_coach_assignments_learner_id ON coach_assignments (learner_id)",
            "CREATE INDEX IF NOT EXISTS ix_learning_progress_user_id ON learning_progress (user_id)",
            "CREATE INDEX IF NOT EXISTS ix_uploaded_artifacts_user_id ON uploaded_artifacts (user_id)",
            "CREATE INDEX IF NOT EXISTS ix_certificates_certificate_id ON certificates (certificate_id)",
        ),
    )


def _migration_3_ai_feedback_schema(engine: Engine) -> None:
    """Add ai_feedback column to presentation_metrics."""
    _add_missing_columns(
        engine,
        "presentation_metrics",
        {
            "ai_feedback": "TEXT",
        },
    )


def run_migrations(engine: Engine) -> int:
    """Apply pending migrations and return the resulting schema version."""
    _ensure_version_table(engine)
    applied = _applied_versions(engine)
    migrations = {
        1: _migration_1_audio_and_workflow_schema,
        2: _migration_2_security_and_workflow_schema,
        3: _migration_3_ai_feedback_schema,
    }
    for version in range(1, CURRENT_SCHEMA_VERSION + 1):
        if version in applied:
            continue
        migration = migrations.get(version)
        if migration is None:
            raise RuntimeError(f"Migration {version} is not registered.")
        LOGGER.info("Applying database migration %s", version)
        migration(engine)
        with engine.begin() as connection:
            connection.execute(
                text("INSERT INTO schema_migrations (version, applied_at) VALUES (:version, :applied_at)"),
                {"version": version, "applied_at": datetime.now(timezone.utc)},
            )
    return CURRENT_SCHEMA_VERSION


if __name__ == "__main__":
    from database import Base, engine
    import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    version = run_migrations(engine)
    print(f"Database schema is at version {version}.")
