from datetime import datetime
from datetime import timedelta
from datetime import timezone

import hashlib
import hmac
import os

from jose import jwt

from fastapi import Depends
from fastapi import HTTPException
from fastapi import status

from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.orm import Session

from database import get_db
from models import User

from config import settings


ALGORITHM = "HS256"


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)


# --------------------------------
# PASSWORD HASHING
# --------------------------------

def hash_password(password: str) -> str:

    salt = os.urandom(16)

    rounds = 310000

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        rounds
    )

    return (
        f"pbkdf2_sha256"
        f"${rounds}"
        f"${salt.hex()}"
        f"${digest.hex()}"
    )


def verify_password(
    password: str,
    stored_password: str
) -> bool:

    try:

        prefix, rounds, salt_hex, digest_hex = (
            stored_password.split("$")
        )

        if prefix != "pbkdf2_sha256":
            return False

        actual_digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(rounds)
        )

        return hmac.compare_digest(
            actual_digest.hex(),
            digest_hex
        )

    except Exception:

        return False


# --------------------------------
# JWT TOKEN
# --------------------------------

def create_token(user: User) -> str:

    expiration = (
        datetime.now(timezone.utc)
        +
        timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": expiration
    }

    token = jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


# --------------------------------
# CURRENT USER
# --------------------------------

def current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    try:

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = int(
            payload.get("sub")
        )

    except Exception:

        raise credentials_exception

    user = db.get(
        User,
        user_id
    )

    if user is None:

        raise credentials_exception

    return user


# --------------------------------
# ROLE CHECK
# --------------------------------

def require_role(*roles):

    def dependency(
        user: User = Depends(current_user)
    ):

        if user.role not in roles:

            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )

        return user

    return dependency
