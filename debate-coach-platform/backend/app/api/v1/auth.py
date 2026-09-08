from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.core.settings import settings
from app.db.session import get_db
from app.models.models import RefreshToken, User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, TokenResponse, UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if payload.role == "ADMIN":
        if not settings.admin_registration_key or payload.admin_key != settings.admin_registration_key:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin registration requires a valid admin key")
    elif payload.role not in {"LEARNER", "DEBATE_EXPERT", "DEBATE_COACH"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported registration role")

    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=payload.role.upper(),
    )
    db.add(user)
    db.flush()

    access_token = create_access_token(user.id)
    refresh_expires = datetime.now(timezone.utc) + timedelta(days=7)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    refresh_token = create_refresh_token(user.id)
    db.add(RefreshToken(user_id=user.id, token=refresh_token, expires_at=refresh_expires))
    db.commit()
    db.refresh(user)

    return AuthResponse(
        user=UserPublic.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/login", response_model=AuthResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive")

    access_token = create_access_token(user.id)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    refresh_token = create_refresh_token(user.id)
    refresh_expires = datetime.now(timezone.utc) + timedelta(days=7)
    db.add(RefreshToken(user_id=user.id, token=refresh_token, expires_at=refresh_expires))
    db.commit()

    return AuthResponse(
        user=UserPublic.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: dict, db: Session = Depends(get_db)) -> TokenResponse:
    refresh_value = payload.get("refresh_token")
    if not refresh_value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Refresh token required")

    token_record = db.query(RefreshToken).filter(RefreshToken.token == refresh_value).first()
    if not token_record or token_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired or invalid")

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")

    new_access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)
    token_record.token = new_refresh_token
    token_record.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    db.commit()

    return TokenResponse(access_token=new_access_token, refresh_token=new_refresh_token)


@router.post("/logout")
def logout_user(payload: dict, db: Session = Depends(get_db)) -> dict:
    refresh_value = payload.get("refresh_token")
    if refresh_value:
        db.query(RefreshToken).filter(RefreshToken.token == refresh_value).delete()
        db.commit()
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserPublic)
def get_current_profile(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(current_user)
