from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from database import get_db
import models
import schemas


router = APIRouter(prefix="/api/v1/auth", tags=["User Authentication & Role-Based Access"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
VALID_ROLES = ["Learner", "Debate Coach", "Educator", "Administrator"]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _legacy_sha256(password: str) -> str:
    import hashlib

    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, stored_hash: str) -> bool:
    """Support old SHA-256 records while writing new records with PBKDF2."""
    if len(stored_hash) == 64 and all(char in "0123456789abcdef" for char in stored_hash.lower()):
        return _legacy_sha256(password) == stored_hash.lower()
    return pwd_context.verify(password, stored_hash)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.utcnow()
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    claims = {**data, "exp": expire, "iat": now}
    return jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate JWT token.") from exc


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    payload = decode_access_token(token)
    user_id = payload.get("user_id")
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated user was not found.")
    return user


def require_role(allowed_roles: List[str]):
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied for role '{current_user.role}'. Required role: {allowed_roles}.",
            )
        return current_user

    return role_checker


def _token_for_user(user: models.User) -> dict:
    return {
        "access_token": create_access_token({"sub": user.email, "user_id": user.id, "role": user.role}),
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "full_name": user.full_name,
    }


@router.post("/register", response_model=schemas.Token)
def register_user(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    role = user_data.role if user_data.role in VALID_ROLES else "Learner"
    email = user_data.email.strip().lower()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="Account with this email already exists.")

    new_user = models.User(
        email=email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name.strip(),
        role=role,
        experience_level=user_data.experience_level or "Intermediate",
        preferred_topics=user_data.preferred_topics or "Technology, Ethics, Policy",
        presentation_domains="Public Speaking, Keynotes, Parliamentary",
        learning_goals="Reduce filler words, Master cross-examination counterarguments",
        coaching_preferences="Real-time alerts, Post-session logic audits",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return _token_for_user(new_user)


@router.post("/login", response_model=schemas.Token)
def login_user(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email.strip().lower()).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password credentials.")
    if len(user.hashed_password) == 64 and all(char in "0123456789abcdef" for char in user.hashed_password.lower()):
        user.hashed_password = hash_password(credentials.password)
        db.commit()
    return _token_for_user(user)


@router.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return login_user(schemas.UserLogin(email=form_data.username, password=form_data.password), db)


@router.post("/oauth2/login", response_model=schemas.Token)
def oauth2_login(provider: str = "Google", email: Optional[str] = None, role: Optional[str] = "Learner", db: Session = Depends(get_db)):
    """Development OAuth handoff; production should validate the provider token server-side."""
    target_email = (email or f"user_{provider.lower()}@logos.ai").strip().lower()
    user = db.query(models.User).filter(models.User.email == target_email).first()
    if not user:
        user = models.User(
            email=target_email,
            hashed_password=hash_password(f"oauth2_sso_{provider}_secret"),
            full_name=f"{provider.capitalize()} User",
            role=role if role in VALID_ROLES else "Learner",
            experience_level="Intermediate",
            preferred_topics="AI Ethics, High-Stakes Debate",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return {
        **_token_for_user(user),
    }


@router.get("/profile/me", response_model=schemas.UserProfileResponse)
def get_my_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/profile/me", response_model=schemas.UserProfileResponse)
def update_my_profile(
    full_name: Optional[str] = None,
    experience_level: Optional[str] = None,
    preferred_topics: Optional[str] = None,
    presentation_domains: Optional[str] = None,
    learning_goals: Optional[str] = None,
    coaching_preferences: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updates = {
        "full_name": full_name,
        "experience_level": experience_level,
        "preferred_topics": preferred_topics,
        "presentation_domains": presentation_domains,
        "learning_goals": learning_goals,
        "coaching_preferences": coaching_preferences,
    }
    for field, value in updates.items():
        if value is not None:
            setattr(current_user, field, value.strip())
    db.commit()
    db.refresh(current_user)
    return current_user
