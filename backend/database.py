from sqlalchemy import create_engine
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
    logging.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite primary database.")
    fallback_url = "sqlite:///./logos_ai.db"
    engine = create_engine(fallback_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

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
