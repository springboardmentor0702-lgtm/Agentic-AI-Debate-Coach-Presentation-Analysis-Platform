import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from database import Base, engine, SessionLocal
from models import User
from security import hash_password, create_token


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def test_user(client):
    db = SessionLocal()
    existing = db.query(User).filter(User.email == "test_debater@example.com").first()
    if not existing:
        user = User(
            name="Test Debater",
            email="test_debater@example.com",
            password_hash=hash_password("password123"),
            role="learner",
            experience_level="intermediate"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user = existing
    token = create_token(user)
    db.close()
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}
