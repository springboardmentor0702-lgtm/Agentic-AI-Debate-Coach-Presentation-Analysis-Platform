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

    mentor_id = None
    if user_data.mentor_email:
        mentor = db.query(models.User).filter(models.User.email == user_data.mentor_email.strip().lower()).first()
        if not mentor:
            raise HTTPException(status_code=404, detail="No Debate Coach or Educator account found with that email.")
        if mentor.role not in ["Debate Coach", "Educator", "Administrator"]:
            raise HTTPException(status_code=400, detail="That email does not belong to a Debate Coach, Educator, or Administrator account.")
        mentor_id = mentor.id

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
        mentor_id=mentor_id,
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


def _display_name_from_email(email: str, provider: str) -> str:
    """Derive a human-readable display name from the email's local part.

    The OAuth stub below doesn't receive a real name from the provider (it
    isn't validating an actual Google ID token), so falling back to
    "{Provider} User" for every account made every OAuth login look like it
    belonged to a user literally named "Google". Instead, turn the part of
    the email before the @ into a name, e.g. "sarvagya.shivhare@gmail.com"
    -> "Sarvagya Shivhare".
    """
    local_part = email.split("@", 1)[0]
    words = [w for w in local_part.replace(".", " ").replace("_", " ").replace("-", " ").split(" ") if w]
    if not words:
        return f"{provider.capitalize()} User"
    return " ".join(w.capitalize() for w in words)


@router.post("/oauth2/login", response_model=schemas.Token)
def oauth2_login(
    provider: str = "Google",
    email: Optional[str] = None,
    full_name: Optional[str] = None,
    role: Optional[str] = "Learner",
    db: Session = Depends(get_db),
):
    """Development OAuth handoff; production should validate the provider token server-side."""
    target_email = (email or f"user_{provider.lower()}@logos.ai").strip().lower()
    user = db.query(models.User).filter(models.User.email == target_email).first()
    if not user:
        user = models.User(
            email=target_email,
            hashed_password=hash_password(f"oauth2_sso_{provider}_secret"),
            full_name=(full_name.strip() if full_name else _display_name_from_email(target_email, provider)),
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


def _mentee_summary(student: models.User, db: Session) -> schemas.MenteeSummary:
    sessions = db.query(models.DebateSession).filter(models.DebateSession.user_id == student.id).all()
    completed = [s for s in sessions if s.status == "Completed"]
    scores = db.query(models.PerformanceScore).filter(models.PerformanceScore.user_id == student.id).all()
    avg = round(sum(s.overall_weighted_score for s in scores) / len(scores), 1) if scores else 0.0
    return schemas.MenteeSummary(
        id=student.id,
        full_name=student.full_name,
        email=student.email,
        experience_level=student.experience_level,
        total_sessions=len(sessions),
        total_debates_completed=len(completed),
        average_overall_score=avg,
    )


@router.get("/users/mentees", response_model=List[schemas.MenteeSummary])
def get_my_mentees(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The list of learners assigned to the current Debate Coach / Educator
    (or, for an Administrator, every learner). Used to power the "MY
    STUDENTS" list on the Coach/Educator/Admin dashboard tab, so a coach or
    educator only ever sees their own students, never the whole platform."""
    if current_user.role not in ["Debate Coach", "Educator", "Administrator"]:
        raise HTTPException(status_code=403, detail="Only a Debate Coach, Educator, or Administrator can view a student list.")
    query = db.query(models.User).filter(models.User.role == "Learner")
    if current_user.role != "Administrator":
        query = query.filter(models.User.mentor_id == current_user.id)
    return [_mentee_summary(s, db) for s in query.all()]


@router.get("/users", response_model=List[schemas.UserAdminSummary])
def list_all_users(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Administrator-only: every account on the platform, for the ADMIN VIEW
    user-management table."""
    if current_user.role != "Administrator":
        raise HTTPException(status_code=403, detail="Administrator access required.")
    return db.query(models.User).order_by(models.User.id.asc()).all()


@router.put("/users/{user_id}", response_model=schemas.UserAdminSummary)
def edit_user(
    user_id: int,
    edits: schemas.UserEditRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Role-scoped user editing:
    - Administrator: may edit any user's full_name, experience_level, role, and mentor assignment.
    - Debate Coach / Educator: may edit only their OWN assigned students (mentor_id == current_user.id),
      and only full_name / experience_level - never role or mentor assignment.
    - Everyone else: forbidden.
    """
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    if current_user.role == "Administrator":
        if edits.full_name is not None:
            target.full_name = edits.full_name.strip()
        if edits.experience_level is not None:
            target.experience_level = edits.experience_level.strip()
        if edits.role is not None:
            if edits.role not in VALID_ROLES:
                raise HTTPException(status_code=400, detail=f"Role must be one of {VALID_ROLES}.")
            target.role = edits.role
        if edits.mentor_email is not None:
            if edits.mentor_email.strip() == "":
                target.mentor_id = None
            else:
                mentor = db.query(models.User).filter(models.User.email == edits.mentor_email.strip().lower()).first()
                if not mentor or mentor.role not in ["Debate Coach", "Educator", "Administrator"]:
                    raise HTTPException(status_code=400, detail="mentor_email must belong to a Debate Coach, Educator, or Administrator account.")
                target.mentor_id = mentor.id
    elif current_user.role in ["Debate Coach", "Educator"]:
        if target.mentor_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only edit your own assigned students.")
        if edits.role is not None or edits.mentor_email is not None:
            raise HTTPException(status_code=403, detail="A Debate Coach or Educator cannot change a student's role or mentor assignment.")
        if edits.full_name is not None:
            target.full_name = edits.full_name.strip()
        if edits.experience_level is not None:
            target.experience_level = edits.experience_level.strip()
    else:
        raise HTTPException(status_code=403, detail="You do not have permission to edit user accounts.")

    db.commit()
    db.refresh(target)
    return target


@router.post("/users", response_model=schemas.UserAdminSummary)
def create_user_as_admin(
    new_user: schemas.UserCreateByAdmin,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Administrator-only: create any account directly (any role), for the
    ALL ACCOUNTS table's "+ Add User" action. Mirrors /register's validation
    but lets an admin set the role explicitly instead of defaulting to Learner."""
    if current_user.role != "Administrator":
        raise HTTPException(status_code=403, detail="Administrator access required.")

    email = new_user.email.strip().lower()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    role = new_user.role if new_user.role in VALID_ROLES else "Learner"
    mentor_id = None
    if new_user.mentor_email and new_user.mentor_email.strip():
        mentor = db.query(models.User).filter(models.User.email == new_user.mentor_email.strip().lower()).first()
        if not mentor or mentor.role not in ["Debate Coach", "Educator", "Administrator"]:
            raise HTTPException(status_code=400, detail="mentor_email must belong to a Debate Coach, Educator, or Administrator account.")
        mentor_id = mentor.id

    user = models.User(
        email=email,
        hashed_password=hash_password(new_user.password),
        full_name=new_user.full_name.strip(),
        role=role,
        experience_level=(new_user.experience_level or "Intermediate").strip(),
        preferred_topics="Technology, Ethics, Policy",
        mentor_id=mentor_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user_as_admin(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Administrator-only: permanently delete an account and everything
    tied to it (sessions, scores, analyses, coaching plan, coach feedback).
    Also un-assigns anyone who had this account listed as their mentor,
    and clears this account as the sender/recipient of any coach feedback."""
    if current_user.role != "Administrator":
        raise HTTPException(status_code=403, detail="Administrator access required.")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account while logged in as it.")

    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    session_ids = [s.id for s in db.query(models.DebateSession.id).filter(models.DebateSession.user_id == user_id).all()]
    db.query(models.PerformanceScore).filter(models.PerformanceScore.user_id == user_id).delete(synchronize_session=False)
    db.query(models.ArgumentAnalysis).filter(models.ArgumentAnalysis.user_id == user_id).delete(synchronize_session=False)
    db.query(models.FallacyLog).filter(models.FallacyLog.user_id == user_id).delete(synchronize_session=False)
    db.query(models.SimulationTurn).filter(models.SimulationTurn.user_id == user_id).delete(synchronize_session=False)
    db.query(models.PresentationMetric).filter(models.PresentationMetric.user_id == user_id).delete(synchronize_session=False)
    db.query(models.CoachingPlan).filter(models.CoachingPlan.user_id == user_id).delete(synchronize_session=False)
    db.query(models.CoachFeedback).filter(
        (models.CoachFeedback.student_id == user_id) | (models.CoachFeedback.coach_id == user_id)
    ).delete(synchronize_session=False)
    if session_ids:
        db.query(models.DebateSession).filter(models.DebateSession.id.in_(session_ids)).delete(synchronize_session=False)
    # Anyone who had this account as their mentor becomes unassigned rather than orphaned.
    db.query(models.User).filter(models.User.mentor_id == user_id).update({"mentor_id": None}, synchronize_session=False)

    db.delete(target)
    db.commit()
    return {"message": f"Account {target.email} and all associated data were deleted."}
