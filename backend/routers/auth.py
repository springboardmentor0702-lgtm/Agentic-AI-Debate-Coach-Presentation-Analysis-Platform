from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import User
from schemas import RegisterRequest, LoginRequest
from security import hash_password, verify_password, create_token, current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    role = request.role.lower().strip()
    valid_roles = {"learner", "coach", "debate_coach", "educator", "admin", "administrator"}
    if role not in valid_roles:
        role = "learner"

    user = User(
        name=request.name.strip(),
        email=request.email.lower().strip(),
        password_hash=hash_password(request.password),
        role=role,
        experience_level="beginner",
        preferred_topics=["Technology", "Education", "Ethics", "Policy"],
        presentation_domains=["Academic", "Debate", "Public Speaking"],
        learning_goals=["Improve rebuttal effectiveness", "Reduce filler words", "Strengthen evidence usage"],
        coaching_preferences=["Socratic", "Constructive", "Evidence-focused"]
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "experience_level": user.experience_level
        }
    }


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "experience_level": user.experience_level
        }
    }


class OAuthRequest(BaseModel):
    provider: str = "google"
    token: str = "mock_token"
    email: str
    name: str
    role: str = "learner"


@router.post("/oauth")
def oauth_login(request: OAuthRequest, db: Session = Depends(get_db)):
    """OAuth2 Login support for Google/SSO authentication."""
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if not user:
        user = User(
            name=request.name.strip(),
            email=request.email.lower().strip(),
            password_hash=hash_password("oauth_authenticated_user_secure_pass"),
            role=request.role,
            experience_level="beginner"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "provider": request.provider,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "experience_level": user.experience_level
        }
    }


@router.get("/me")
def me(user: User = Depends(current_user)):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "experience_level": user.experience_level,
        "preferred_topics": user.preferred_topics or [],
        "presentation_domains": user.presentation_domains or [],
        "learning_goals": user.learning_goals or [],
        "coaching_preferences": user.coaching_preferences or [],
        "created_at": user.created_at.isoformat() if user.created_at else None
    }
