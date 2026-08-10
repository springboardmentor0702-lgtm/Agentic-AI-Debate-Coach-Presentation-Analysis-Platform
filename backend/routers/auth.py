from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from config import settings
import models, schemas
import hashlib
import jwt
from datetime import datetime, timedelta
from typing import Optional, List

router = APIRouter(prefix="/api/v1/auth", tags=["User Authentication & Role-Based Access"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="JWT Token has expired. Please log in again.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate JWT signature.")

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> models.User:
    if not authorization or not authorization.startswith("Bearer "):
        # Return or create demo default user if unauthenticated
        user = db.query(models.User).filter(models.User.email == "learner@logos.ai").first()
        if not user:
            user = models.User(
                email="learner@logos.ai",
                hashed_password=hash_password("password123"),
                full_name="Standard Learner",
                role="Learner",
                experience_level="Intermediate",
                preferred_topics="Technology, Ethics, Policy"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    user_id: int = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token claims.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User associated with token not found.")
    return user

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"Access denied for role '{current_user.role}'. Required role: {allowed_roles}."
            )
        return current_user
    return role_checker

# --- 1. User Registration (Generates Cryptographic JWT) ---
@router.post("/register", response_model=schemas.Token)
def register_user(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    valid_roles = ["Learner", "Debate Coach", "Educator", "Administrator"]
    role = user_data.role if user_data.role in valid_roles else "Learner"

    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Account with this email already exists.")
    
    new_user = models.User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=role,
        experience_level=user_data.experience_level or "Intermediate",
        preferred_topics=user_data.preferred_topics or "Technology, Ethics, Policy",
        presentation_domains="Public Speaking, Keynotes, Parliamentary",
        learning_goals="Reduce filler words, Master cross-examination counterarguments",
        coaching_preferences="Real-time alerts, Post-session logic audits"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    jwt_token = create_access_token(data={"sub": new_user.email, "user_id": new_user.id, "role": new_user.role})
    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "user_id": new_user.id,
        "role": new_user.role,
        "full_name": new_user.full_name
    }

# --- 2. Standard Login (Generates Cryptographic JWT) ---
@router.post("/login", response_model=schemas.Token)
def login_user(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or user.hashed_password != hash_password(credentials.password):
        raise HTTPException(status_code=401, detail="Invalid email or password credentials.")
    
    jwt_token = create_access_token(data={"sub": user.email, "user_id": user.id, "role": user.role})
    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "full_name": user.full_name
    }

# --- 3. OAuth2 Password Flow Token Endpoint ---
@router.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or user.hashed_password != hash_password(form_data.password):
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    
    jwt_token = create_access_token(data={"sub": user.email, "user_id": user.id, "role": user.role})
    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "full_name": user.full_name
    }

# --- 4. OAuth2 Single Sign-On (Google, Apple, Binance, Wallet) ---
@router.post("/oauth2/login", response_model=schemas.Token)
def oauth2_login(provider: str = "Google", email: Optional[str] = None, role: Optional[str] = "Learner", db: Session = Depends(get_db)):
    target_email = email if email else f"user_{provider.lower()}@logos.ai"
    display_name = f"{provider.capitalize()} User"

    user = db.query(models.User).filter(models.User.email == target_email).first()
    if not user:
        user = models.User(
            email=target_email,
            hashed_password=hash_password(f"oauth2_sso_{provider}_secret"),
            full_name=display_name,
            role=role if role in ["Learner", "Debate Coach", "Educator", "Administrator"] else "Learner",
            experience_level="Intermediate",
            preferred_topics="AI Ethics, High-Stakes Debate"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_access_token(data={"sub": user.email, "user_id": user.id, "role": user.role, "provider": provider})
    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "full_name": user.full_name
    }

# --- 5. Profile & RBAC Verification ---
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
    db: Session = Depends(get_db)
):
    if full_name is not None:
        current_user.full_name = full_name
    if experience_level is not None:
        current_user.experience_level = experience_level
    if preferred_topics is not None:
        current_user.preferred_topics = preferred_topics
    if presentation_domains is not None:
        current_user.presentation_domains = presentation_domains
    if learning_goals is not None:
        current_user.learning_goals = learning_goals
    if coaching_preferences is not None:
        current_user.coaching_preferences = coaching_preferences

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
