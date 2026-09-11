import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import Base, engine, SessionLocal
from .models import (User, DebateTopic, DebateSession, DebateTurn,  # noqa
                     SessionScore, Report, Notification)
from .core.security import hash_password
from .api import auth, debates, analysis, dashboards, notifications, admin

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("app")

app = FastAPI(title="Agentic AI Debate Coach & Presentation Analysis Platform", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    logger.info("%s %s -> %s (%.2fs)", request.method, request.url.path,
                response.status_code, time.time() - start)
    return response


SEED_TOPICS = [
    ("Social media does more harm than good", "social"),
    ("AI will create more jobs than it destroys", "technology"),
    ("Standardized testing should be abolished", "education"),
    ("Universal basic income should be implemented", "economics"),
    ("Voting should be mandatory", "politics"),
]
SEED_USERS = [
    ("admin@platform.com", "admin123", "Platform Admin", "admin"),
    ("coach@platform.com", "coach123", "Demo Coach", "coach"),
    ("educator@platform.com", "educator123", "Demo Educator", "educator"),
]


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(DebateTopic).first():
            for title, cat in SEED_TOPICS:
                db.add(DebateTopic(title=title, category=cat))
        for email, pw, name, role in SEED_USERS:
            if not db.query(User).filter(User.email == email).first():
                db.add(User(email=email, hashed_password=hash_password(pw),
                            full_name=name, role=role))
        db.commit()
    finally:
        db.close()


app.include_router(auth.router)
app.include_router(debates.router)
app.include_router(analysis.router)
app.include_router(dashboards.router)
app.include_router(notifications.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "debate-coach-platform", "version": "2.0.0"}
