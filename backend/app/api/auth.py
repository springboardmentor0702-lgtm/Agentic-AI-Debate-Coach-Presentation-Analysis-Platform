import uuid

import requests
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.database import get_db
from ..core.security import (hash_password, verify_password, create_access_token, get_current_user)
from ..models import User
from ..schemas import RegisterIn, Token, UserOut, ProfileIn
from ..services.notifications_service import notify

router = APIRouter(prefix="/api/auth", tags=["auth"])
ROLES = {"learner", "coach", "educator", "admin"}


@router.post("/register", response_model=UserOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered")
    role = body.role if body.role in ROLES else "learner"
    u = User(email=body.email, hashed_password=hash_password(body.password),
             full_name=body.full_name, role=role, experience_level=body.experience_level)
    db.add(u)
    db.commit()
    db.refresh(u)
    notify(db, u.id, "info", "Welcome to the AI Debate Coach!",
           "Start your first debate session to get scored and coached.")
    db.commit()
    return u


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == form.username).first()
    if not u or not verify_password(form.password, u.hashed_password):
        raise HTTPException(401, "Incorrect email or password")
    return Token(access_token=create_access_token(u.email, u.role), role=u.role)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/profile", response_model=UserOut)
def update_profile(body: ProfileIn, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    for k, v in body.dict(exclude_none=True).items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


# ---------------- Google OAuth2 (Module 1) ----------------
@router.get("/oauth/google/url")
def google_url():
    if not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_SECRET):
        raise HTTPException(400, "Google OAuth not configured - set GOOGLE_CLIENT_ID and GOOGLE_SECRET")
    redirect_uri = f"{settings.FRONTEND_URL}/oauth/callback"
    url = ("https://accounts.google.com/o/oauth2/v2/auth?response_type=code"
           f"&client_id={settings.GOOGLE_CLIENT_ID}&redirect_uri={redirect_uri}"
           "&scope=openid%20email%20profile&prompt=select_account")
    return {"url": url}


@router.get("/oauth/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    if not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_SECRET):
        raise HTTPException(400, "Google OAuth not configured")
    r = requests.post("https://oauth2.googleapis.com/token", data={
        "code": code, "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_SECRET,
        "redirect_uri": f"{settings.FRONTEND_URL}/oauth/callback",
        "grant_type": "authorization_code"}, timeout=15)
    access = r.json().get("access_token")
    if not access:
        raise HTTPException(401, "Google token exchange failed")
    info = requests.get("https://www.googleapis.com/oauth2/v2/userinfo",
                        headers={"Authorization": f"Bearer {access}"}, timeout=15).json()
    email = info.get("email")
    if not email:
        raise HTTPException(401, "Google account has no email")
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(email=email, hashed_password=hash_password(uuid.uuid4().hex),
                 full_name=info.get("name", ""), role="learner")
        db.add(u)
        db.commit()
        db.refresh(u)
    token = create_access_token(u.email, u.role)
    return RedirectResponse(f"{settings.FRONTEND_URL}/oauth/callback?token={token}")
