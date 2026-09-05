"""Database Viewer CLI for LOGOS.AI SQLite Databases.
Usage:
    python view_db.py              # Lists all tables, columns, and row counts
    python view_db.py users        # Shows all records from 'users' table
    python view_db.py sessions     # Shows all records from 'debate_sessions' table
    python view_db.py all          # Dumps a summary of all tables with data
"""

import sys
import os
import sqlite3
import json

def get_db_path():
    candidates = [
        os.path.join(os.path.dirname(__file__), "logos_ai.db"),
        os.path.join(os.path.dirname(__file__), "..", "logos_ai.db"),
        "logos_ai.db",
        "backend/logos_ai.db"
    ]
    for path in candidates:
        if os.path.exists(path):
            return os.path.abspath(path)
    return candidates[0]

def inspect_db(target_table=None):
    db_path = get_db_path()
    if not os.path.exists(db_path):
        print(f"[!] Database file not found at: {db_path}")
        return

    print("=" * 80)
    print(f"DATABASE: {db_path}")
    print("=" * 80)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [row[0] for row in cursor.fetchall() if row[0] != "sqlite_sequence"]

    if not target_table:
        print(f"\nFound {len(tables)} tables:\n")
        print(f"{'Table Name':<30} | {'Rows':<8} | Columns")
        print("-" * 80)
        for tbl in tables:
            cursor.execute(f'SELECT COUNT(*) FROM "{tbl}"')
            count = cursor.fetchone()[0]
            cursor.execute(f'PRAGMA table_info("{tbl}")')
            cols = [c[1] for c in cursor.fetchall()]
            cols_preview = ", ".join(cols[:5]) + ("..." if len(cols) > 5 else "")
            print(f"{tbl:<30} | {count:<8} | {cols_preview}")
        
        print("\n" + "=" * 80)
        print("To view data in a specific table, run:")
        print("    python backend/view_db.py <table_name>")
        print("Example:")
        print("    python backend/view_db.py users")
        print("    python backend/view_db.py debate_sessions")
        print("    python backend/view_db.py all")
        print("=" * 80)
        conn.close()
        return

    if target_table == "all":
        for tbl in tables:
            print_table_data(cursor, tbl)
    else:
        # Match table by exact or partial name
        matched = [t for t in tables if target_table.lower() in t.lower()]
        if not matched:
            print(f"[!] Table matching '{target_table}' not found.")
            print(f"Available tables: {', '.join(tables)}")
        else:
            for tbl in matched:
                print_table_data(cursor, tbl)

    conn.close()

def print_table_data(cursor, table_name, limit=20):
    print("\n" + "#" * 80)
    print(f" TABLE: {table_name}")
    print("#" * 80)
    
    cursor.execute(f'PRAGMA table_info("{table_name}")')
    columns = [c[1] for c in cursor.fetchall()]
    
    cursor.execute(f'SELECT * FROM "{table_name}" LIMIT {limit}')
    rows = cursor.fetchall()
    
    if not rows:
        print(" (Table is empty)")
        return

    for idx, row in enumerate(rows, 1):
        print(f"\n--- Row #{idx} ---")
        for col in columns:
            val = row[col]
            # Truncate very long strings for neat display
            if isinstance(val, str) and len(val) > 120:
                val = val[:117] + "..."
            print(f"  {col:<25}: {val}")

if __name__ == "__main__":
    table_arg = sys.argv[1] if len(sys.argv) > 1 else None
    inspect_db(table_arg)
