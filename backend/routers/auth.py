from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from database import get_db
from models import User

from schemas import (
    RegisterRequest,
    LoginRequest
)

from security import (
    hash_password,
    verify_password,
    create_token,
    current_user
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


# --------------------------------
# REGISTER
# --------------------------------

@router.post("/register")
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):

    existing_user = (
        db.query(User)
        .filter(
            User.email == request.email
        )
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    allowed_roles = {
        "learner",
        "coach",
        "educator",
        "admin"
    }

    role = request.role

    if role not in allowed_roles:

        role = "learner"

    user = User(
        name=request.name,
        email=request.email,
        password_hash=hash_password(
            request.password
        ),
        role=role
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
            "role": user.role
        }
    }


# --------------------------------
# LOGIN
# --------------------------------

@router.post("/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):

    user = (
        db.query(User)
        .filter(
            User.email == request.email
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        request.password,
        user.password_hash
    ):

        raise HTTPException(
            status_code=401,
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
            "role": user.role
        }
    }


# --------------------------------
# CURRENT USER
# --------------------------------

@router.get("/me")
def get_current_user(
    user: User = Depends(current_user)
):

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role
    }
