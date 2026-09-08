"""PostgreSQL primary database plus optional MongoDB document store."""
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


mongo_db_instance = None
try:
    import pymongo
    mongo_client = pymongo.MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=1500)
    mongo_client.admin.command("ping")
    mongo_db_instance = mongo_client[settings.MONGO_DB]
    logging.info("MongoDB secondary store connected.")
except Exception as exc:
    logging.info("MongoDB secondary store unavailable; PostgreSQL remains the primary store: %s", exc)


def get_mongo_db():
    return mongo_db_instance
