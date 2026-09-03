"""Print the configured LOGOS.AI database schema in a mentor-friendly format.

Run from the backend directory: .\\.venv\\Scripts\\python.exe show_schema.py
It works with both the local SQLite configuration and PostgreSQL.
"""

from sqlalchemy import create_engine, inspect

from config import settings


engine = create_engine(settings.DATABASE_URL)
inspector = inspect(engine)
print(f"LOGOS.AI database: {engine.url}\n")

for table in sorted(inspector.get_table_names()):
    print(table.upper())
    primary_key_columns = set(inspector.get_pk_constraint(table)["constrained_columns"])
    for column in inspector.get_columns(table):
        labels = []
        if column["name"] in primary_key_columns:
            labels.append("PK")
        if not column["nullable"]:
            labels.append("NOT NULL")
        if column.get("default") is not None:
            labels.append(f"DEFAULT {column['default']}")
        suffix = f" ({', '.join(labels)})" if labels else ""
        print(f"  - {column['name']}: {column['type']}{suffix}")
    for foreign_key in inspector.get_foreign_keys(table):
        local = ", ".join(foreign_key["constrained_columns"])
        remote = ", ".join(foreign_key["referred_columns"])
        print(f"  - FK: {local} -> {foreign_key['referred_table']}.{remote}")
    print()
