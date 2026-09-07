import bcrypt
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserProfile
from ..schemas import Token, UserRegister, UserLogin, UserResponse
from ..config import settings

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8')[:72], hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8')[:72], salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize empty profile
    profile = UserProfile(user_id=new_user.id)
    db.add(profile)
    db.commit()

    token_data = {"sub": new_user.email, "role": new_user.role, "id": new_user.id}
    token = create_access_token(token_data)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role
        }
    }

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated.")

    token_data = {"sub": user.email, "role": user.role, "id": user.id}
    token = create_access_token(token_data)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.post("/demo-login/{role}", response_model=Token)
def demo_login(role: str, db: Session = Depends(get_db)):
    """Fast one-click demo login for evaluating different user roles."""
    clean_role = role.strip().lower()
    role_map = {
        "learner": ("learner@debate.ai", "Learner", "Alex Morgan"),
        "coach": ("coach@debate.ai", "Debate Coach", "Coach Marcus Sterling"),
        "educator": ("educator@debate.ai", "Educator", "Prof. Diana Vance"),
        "admin": ("admin@debate.ai", "Administrator", "System Admin")
    }

    if clean_role not in role_map:
        raise HTTPException(status_code=400, detail=f"Invalid demo role. Choose from: {list(role_map.keys())}")

    email, canonical_role, default_name = role_map[clean_role]
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Create demo user if not present
        user = User(
            email=email,
            hashed_password=get_password_hash("password123"),
            full_name=default_name,
            role=canonical_role
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        profile = UserProfile(user_id=user.id)
        db.add(profile)
        db.commit()

    token_data = {"sub": user.email, "role": user.role, "id": user.id}
    token = create_access_token(token_data)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
