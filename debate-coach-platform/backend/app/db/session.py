from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.settings import settings
from app.db.base import Base

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
poolclass = StaticPool if settings.database_url.startswith("sqlite") else None

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
    poolclass=poolclass,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

