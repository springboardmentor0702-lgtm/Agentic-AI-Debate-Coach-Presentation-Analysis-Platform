"""
One-time fix for existing databases created before the mentor_id column existed.

Why this is needed:
  The app uses Base.metadata.create_all() on startup, which only creates
  tables that don't exist yet - it never adds new columns to a table that
  was already created. Since your database's `users` table was created in
  an earlier session (before the coach/educator student-assignment feature
  existed), it is missing the `mentor_id` column the new code expects,
  causing every request that touches a user account to fail with:
      sqlalchemy.exc.ProgrammingError ... column "mentor_id" does not exist

This script adds that one column WITHOUT deleting any of your existing
accounts or data. It is safe to run more than once.

Usage (from the backend/ folder, with your virtual environment active):
    python add_mentor_column.py
"""
from sqlalchemy import inspect, text
from database import engine

COLUMN_NAME = "mentor_id"
TABLE_NAME = "users"


def main():
    inspector = inspect(engine)
    existing_columns = [c["name"] for c in inspector.get_columns(TABLE_NAME)]

    if COLUMN_NAME in existing_columns:
        print(f"Nothing to do - '{TABLE_NAME}.{COLUMN_NAME}' already exists.")
        return

    print(f"Adding missing column '{COLUMN_NAME}' to '{TABLE_NAME}'...")
    with engine.begin() as conn:
        conn.execute(text(
            f'ALTER TABLE {TABLE_NAME} ADD COLUMN {COLUMN_NAME} INTEGER REFERENCES {TABLE_NAME}(id)'
        ))
    print("Done. Your existing accounts and data were not affected.")
    print("You can now restart the backend (uvicorn) normally.")


if __name__ == "__main__":
    main()
