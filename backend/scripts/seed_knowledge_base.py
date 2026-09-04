"""
One-time script: computes a real embedding for each coaching knowledge
entry and inserts it into Supabase. Run once after Segment 9's SQL
migration, from the `backend` folder with your venv activated:

    python scripts/seed_knowledge_base.py

Safe to re-run - skips any title already present in the table, so
adding new entries to coaching_knowledge_seed.py later and re-running
only inserts the new ones.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core import supabase_client
from app.core.llm_client import embed_text, embedding_to_pg_literal
from app.data.coaching_knowledge_seed import KNOWLEDGE_ENTRIES


def main():
    existing = supabase_client.db_select("coaching_knowledge", params={"select": "title"})
    existing_titles = {row["title"] for row in existing}

    inserted = 0
    for entry in KNOWLEDGE_ENTRIES:
        if entry["title"] in existing_titles:
            print(f"Skipping (already exists): {entry['title']}")
            continue

        print(f"Embedding: {entry['title']}...")
        embedding = embed_text(f"{entry['title']}: {entry['content']}")

        supabase_client.db_insert(
            "coaching_knowledge",
            {
                "category": entry["category"],
                "title": entry["title"],
                "content": entry["content"],
                "embedding": embedding_to_pg_literal(embedding),
            },
        )
        inserted += 1

    print(f"\nDone. Inserted {inserted} new entries, {len(existing_titles)} already existed.")


if __name__ == "__main__":
    main()
