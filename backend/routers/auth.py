from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from services.security import new_refresh_token, record_audit, token_hash, utc_now_naive
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
    if len(stored_hash) == 64 and all(char in "0123456789abcdef" for char in stored_hash.lower()):
        return _legacy_sha256(password) == stored_hash.lower()
    return pwd_context.verify(password, stored_hash)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    return jwt.encode({**data, "exp": expire, "iat": now, "type": "access"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate JWT token.") from exc
    if payload.get("type", "access") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token type.")
    return payload


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    payload = decode_access_token(token)
    user_id = payload.get("user_id")
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated user is inactive or missing.")
    return user


def require_role(allowed_roles: List[str]):
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Access denied for role '{current_user.role}'.")
        return current_user
    return role_checker


def _issue_refresh_token(user: models.User, db: Session) -> str:
    raw = new_refresh_token()
    db.add(models.RefreshToken(user_id=user.id, token_hash=token_hash(raw), expires_at=utc_now_naive() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)))
    return raw


def _token_for_user(user: models.User, db: Session) -> dict:
    return {"access_token": create_access_token({"sub": user.email, "user_id": user.id, "role": user.role}), "token_type": "bearer", "user_id": user.id, "role": user.role, "full_name": user.full_name, "refresh_token": _issue_refresh_token(user, db)}


@router.get("/admin/users", response_model=List[schemas.AdminUserSummary])
def list_users(limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0), current_user: models.User = Depends(require_role(["Administrator"])), db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.created_at.desc(), models.User.id.desc()).offset(offset).limit(limit).all()


@router.patch("/admin/users/{user_id}/role", response_model=schemas.AdminUserSummary)
def update_user_role(user_id: int, payload: schemas.AdminRoleUpdate, current_user: models.User = Depends(require_role(["Administrator"])), db: Session = Depends(get_db)):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User was not found.")
    if target.id == current_user.id and payload.role != "Administrator":
        raise HTTPException(status_code=400, detail="An administrator cannot demote their own account.")
    if target.role == "Administrator" and payload.role != "Administrator" and db.query(models.User).filter(models.User.role == "Administrator", models.User.is_active.is_(True)).count() <= 1:
        raise HTTPException(status_code=400, detail="The final administrator cannot be demoted.")
    target.role = payload.role
    record_audit(db, "user.role_changed", user_id=current_user.id, resource_type="user", resource_id=target.id, detail=payload.role)
    db.commit()
    db.refresh(target)
    return target


@router.post("/register", response_model=schemas.Token)
def register_user(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    email = user_data.email.strip().lower()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="Account with this email already exists.")
    requested_role = user_data.role if user_data.role in VALID_ROLES else "Learner"
    role = requested_role if settings.ALLOW_SELF_ASSIGN_ROLES and not settings.is_production else "Learner"
    new_user = models.User(email=email, hashed_password=hash_password(user_data.password), full_name=user_data.full_name.strip(), role=role, experience_level=user_data.experience_level or "Intermediate", preferred_topics=user_data.preferred_topics or "Technology, Ethics, Policy", presentation_domains="Public Speaking, Keynotes, Parliamentary", learning_goals="Reduce filler words, Master cross-examination counterarguments", coaching_preferences="Real-time alerts, Post-session logic audits")
    db.add(new_user)
    db.flush()
    record_audit(db, "user.registered", user_id=new_user.id, resource_type="user", resource_id=new_user.id)
    response = _token_for_user(new_user, db)
    db.commit()
    return response


@router.post("/login", response_model=schemas.Token)
def login_user(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    email = credentials.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    now = utc_now_naive()
    if user and user.locked_until and user.locked_until > now:
        raise HTTPException(status_code=423, detail="Account temporarily locked after repeated failures.")
    if not user or not verify_password(credentials.password, user.hashed_password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.MAX_FAILED_LOGINS:
                user.locked_until = now + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
                user.failed_login_attempts = 0
            record_audit(db, "auth.login_failed", user_id=user.id, resource_type="user", resource_id=user.id)
            db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password credentials.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive.")
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    if len(user.hashed_password) == 64 and all(char in "0123456789abcdef" for char in user.hashed_password.lower()):
        user.hashed_password = hash_password(credentials.password)
    response = _token_for_user(user, db)
    record_audit(db, "auth.login_succeeded", user_id=user.id, resource_type="user", resource_id=user.id)
    db.commit()
    return response


@router.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return login_user(schemas.UserLogin(email=form_data.username, password=form_data.password), db)


@router.post("/refresh", response_model=schemas.Token)
def refresh_access_token(payload: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    stored = db.query(models.RefreshToken).filter(models.RefreshToken.token_hash == token_hash(payload.refresh_token)).first()
    now = utc_now_naive()
    if not stored or stored.revoked_at or stored.expires_at <= now or not stored.user or not stored.user.is_active:
        raise HTTPException(status_code=401, detail="Refresh token is invalid or expired.")
    stored.revoked_at = now
    user = stored.user
    response = _token_for_user(user, db)
    replacement = db.query(models.RefreshToken).filter(models.RefreshToken.token_hash == token_hash(response["refresh_token"])).first()
    if replacement:
        stored.replaced_by_id = replacement.id
    record_audit(db, "auth.token_refreshed", user_id=user.id, resource_type="user", resource_id=user.id)
    db.commit()
    return response


@router.post("/logout", response_model=schemas.MessageResponse)
def logout(payload: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    stored = db.query(models.RefreshToken).filter(models.RefreshToken.token_hash == token_hash(payload.refresh_token)).first()
    if stored and not stored.revoked_at:
        stored.revoked_at = utc_now_naive()
        record_audit(db, "auth.logout", user_id=stored.user_id, resource_type="user", resource_id=stored.user_id)
        db.commit()
    return {"message": "Logged out."}


@router.get("/profile/me", response_model=schemas.UserProfileResponse)
def get_my_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/profile/me", response_model=schemas.UserProfileResponse)
def update_my_profile(payload: Optional[schemas.UserProfileUpdate] = Body(default=None), full_name: Optional[str] = None, experience_level: Optional[str] = None, preferred_topics: Optional[str] = None, presentation_domains: Optional[str] = None, learning_goals: Optional[str] = None, coaching_preferences: Optional[str] = None, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    updates = payload.model_dump(exclude_none=True) if payload else {"full_name": full_name, "experience_level": experience_level, "preferred_topics": preferred_topics, "presentation_domains": presentation_domains, "learning_goals": learning_goals, "coaching_preferences": coaching_preferences}
    for field, value in updates.items():
        if value is not None and str(value).strip():
            setattr(current_user, field, str(value).strip())
    record_audit(db, "user.profile_updated", user_id=current_user.id, resource_type="user", resource_id=current_user.id)
    db.commit()
    db.refresh(current_user)
    return current_user
