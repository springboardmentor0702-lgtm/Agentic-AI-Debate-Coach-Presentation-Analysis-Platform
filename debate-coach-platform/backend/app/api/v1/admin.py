"""Admin management endpoints."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.models import RoleEnum, User

router = APIRouter(prefix="/admin", tags=["admin"])


# ============================================================================
# Schemas
# ============================================================================


class UserListItem(BaseModel):
    """User list item for admin view."""

    id: int
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserDetailSchema(BaseModel):
    """Detailed user schema for admin view."""

    id: int
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpdateUserRequest(BaseModel):
    """Update user request."""

    full_name: str | None = Field(None, min_length=1, max_length=255)
    role: str | None = Field(None, pattern="^(LEARNER|DEBATE_COACH|EDUCATOR|ADMIN)$")
    is_active: bool | None = None


class CreateUserRequest(BaseModel):
    """Create user request (admin only)."""

    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = Field(default="LEARNER", pattern="^(LEARNER|DEBATE_COACH|EDUCATOR|ADMIN)$")


class AdminStatsResponse(BaseModel):
    """Admin statistics response."""

    total_users: int
    total_active_users: int
    total_inactive_users: int
    users_by_role: dict[str, int]
    total_debates: int
    total_presentations: int


# ============================================================================
# Helper Functions
# ============================================================================


def check_admin(user: User) -> None:
    """Check if user is admin."""
    if user.role != RoleEnum.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/users", response_model=list[UserListItem])
def list_users(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    role: str | None = None,
    is_active: bool | None = None,
    limit: int = 100,
) -> list[UserListItem]:
    """List all users (admin only)."""
    check_admin(current_user)

    stmt = select(User)

    if role:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)

    stmt = stmt.order_by(User.created_at.desc()).limit(limit)
    result = db.execute(stmt)
    users = result.scalars().all()

    return [UserListItem.model_validate(u) for u in users]


@router.get("/users/{user_id}", response_model=UserDetailSchema)
def get_user_detail(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserDetailSchema:
    """Get detailed user information (admin only)."""
    check_admin(current_user)

    stmt = select(User).where(User.id == user_id)
    result = db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return UserDetailSchema.model_validate(user)


@router.post("/users", response_model=UserDetailSchema, status_code=status.HTTP_201_CREATED)
def create_user(
    request: CreateUserRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserDetailSchema:
    """Create a new user (admin only)."""
    check_admin(current_user)

    # Check if user already exists
    stmt = select(User).where(User.email == request.email)
    result = db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Import here to avoid circular imports
    from app.core.security import hash_password

    user = User(
        full_name=request.full_name,
        email=request.email,
        password_hash=hash_password(request.password),
        role=request.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserDetailSchema.model_validate(user)


@router.put("/users/{user_id}", response_model=UserDetailSchema)
def update_user(
    user_id: int,
    request: UpdateUserRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserDetailSchema:
    """Update user (admin only)."""
    check_admin(current_user)

    stmt = select(User).where(User.id == user_id)
    result = db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if request.full_name is not None:
        user.full_name = request.full_name
    if request.role is not None:
        user.role = request.role
    if request.is_active is not None:
        user.is_active = request.is_active

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return UserDetailSchema.model_validate(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Delete a user (admin only)."""
    check_admin(current_user)

    stmt = select(User).where(User.id == user_id)
    result = db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Prevent deleting self
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")

    db.delete(user)
    db.commit()


@router.post("/users/{user_id}/deactivate", response_model=UserDetailSchema)
def deactivate_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserDetailSchema:
    """Deactivate a user (admin only)."""
    check_admin(current_user)

    stmt = select(User).where(User.id == user_id)
    result = db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = False
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return UserDetailSchema.model_validate(user)


@router.post("/users/{user_id}/activate", response_model=UserDetailSchema)
def activate_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserDetailSchema:
    """Activate a user (admin only)."""
    check_admin(current_user)

    stmt = select(User).where(User.id == user_id)
    result = db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = True
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return UserDetailSchema.model_validate(user)


@router.get("/statistics", response_model=AdminStatsResponse)
def get_admin_statistics(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminStatsResponse:
    """Get admin statistics (admin only)."""
    check_admin(current_user)

    from sqlalchemy import func

    from app.models.models import DebateSession, Presentation

    # Total users
    stmt = select(func.count(User.id))
    result = db.execute(stmt)
    total_users = result.scalar() or 0

    # Active users
    stmt = select(func.count(User.id)).where(User.is_active.is_(True))
    result = db.execute(stmt)
    active_users = result.scalar() or 0

    # Inactive users
    inactive_users = total_users - active_users

    # Users by role
    users_by_role = {}
    for role in ["LEARNER", "DEBATE_COACH", "EDUCATOR", "ADMIN"]:
        stmt = select(func.count(User.id)).where(User.role == role)
        result = db.execute(stmt)
        count = result.scalar() or 0
        users_by_role[role] = count

    # Total debates
    stmt = select(func.count(DebateSession.id))
    result = db.execute(stmt)
    total_debates = result.scalar() or 0

    # Total presentations
    stmt = select(func.count(Presentation.id))
    result = db.execute(stmt)
    total_presentations = result.scalar() or 0

    return AdminStatsResponse(
        total_users=total_users,
        total_active_users=active_users,
        total_inactive_users=inactive_users,
        users_by_role=users_by_role,
        total_debates=total_debates,
        total_presentations=total_presentations,
    )
