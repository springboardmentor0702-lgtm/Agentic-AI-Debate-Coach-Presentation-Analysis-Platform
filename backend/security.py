from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os
from typing import Optional

from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User
from config import settings

ALGORITHM = settings.ALGORITHM
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# --------------------------------
# PASSWORD HASHING
# --------------------------------

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    rounds = 100000
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        rounds
    )
    return f"pbkdf2_sha256${rounds}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_password: str) -> bool:
    try:
        parts = stored_password.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        _, rounds, salt_hex, digest_hex = parts
        actual_digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(rounds)
        )
        return hmac.compare_digest(actual_digest.hex(), digest_hex)
    except Exception:
        return False


# --------------------------------
# JWT TOKEN
# --------------------------------

def create_token(user: User) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": expiration
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


# --------------------------------
# CURRENT USER
# --------------------------------

def current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"}
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise credentials_exception

    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception
    return user


# --------------------------------
# ROLE PERMISSION DEPENDENCY
# --------------------------------

ROLE_SYNONYMS = {
    "learner": {"learner", "student"},
    "coach": {"coach", "debate_coach", "debate coach"},
    "educator": {"educator", "teacher", "instructor"},
    "admin": {"admin", "administrator"}
}

def require_role(*required_roles: str):
    expanded = set()
    for r in required_roles:
        r_norm = r.lower().strip()
        expanded.add(r_norm)
        for canonical, syns in ROLE_SYNONYMS.items():
            if r_norm == canonical or r_norm in syns:
                expanded.update(syns)
                expanded.add(canonical)

    def dependency(user: User = Depends(current_user)):
        user_role = (user.role or "learner").lower().strip()
        if user_role not in expanded:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: required role '{', '.join(required_roles)}', but user has role '{user.role}'"
            )
        return user

    return dependency
