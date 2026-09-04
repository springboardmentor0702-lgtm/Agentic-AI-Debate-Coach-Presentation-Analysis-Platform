import sys
sys.path.insert(0,'.')
from app.database.db import Base, engine
import app.models
from sqlalchemy import inspect, text
Base.metadata.create_all(bind=engine)
inspector=inspect(engine)
cols={c["name"] for c in inspector.get_columns("debate_messages")} if "debate_messages" in inspector.get_table_names() else set()
with engine.begin() as conn:
    if cols and "round_number" not in cols:
        conn.execute(text("ALTER TABLE debate_messages ADD COLUMN round_number INTEGER"))
    if cols and "phase" not in cols:
        conn.execute(text("ALTER TABLE debate_messages ADD COLUMN phase VARCHAR(40)"))
print('Database schema created/verified.')
