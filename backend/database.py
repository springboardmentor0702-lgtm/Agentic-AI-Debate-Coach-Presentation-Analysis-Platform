from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings
import logging

# Primary Database Setup (PostgreSQL with SQLite fallback)
try:
    if settings.DATABASE_URL.startswith("sqlite"):
        engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        # PostgreSQL Engine
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        # Verify connection
        with engine.connect() as conn:
            pass
        logging.info("Connected to PostgreSQL Primary Database.")
except Exception as e:
    if settings.is_production:
        raise RuntimeError(f"Primary database connection failed in production: {e}") from e
    logging.warning(f"Primary database connection failed ({e}). Falling back to SQLite primary database.")
    engine = create_engine(settings.SQLITE_FALLBACK_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_schema_compatibility():
    """Apply additive compatibility changes for databases created by older releases."""
    inspector = inspect(engine)
    if "presentation_metrics" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("presentation_metrics")}
    additions = {
        "duration_seconds": "FLOAT",
        "pause_count": "INTEGER",
        "silence_ratio_percent": "FLOAT",
        "average_volume_percent": "FLOAT",
    }
    with engine.begin() as connection:
        for column_name, column_type in additions.items():
            if column_name not in existing:
                connection.execute(text(f"ALTER TABLE presentation_metrics ADD COLUMN {column_name} {column_type}"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Secondary Database Setup (MongoDB for Transcripts & Audit Logs)
mongo_db_instance = None
try:
    import pymongo
    mongo_client = pymongo.MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
    mongo_db_instance = mongo_client[settings.MONGO_DB]
    logging.info("Connected to MongoDB Secondary Database.")
except Exception as e:
    logging.warning(f"MongoDB connection optional fallback active ({e}).")

def get_mongo_db():
    return mongo_db_instance
