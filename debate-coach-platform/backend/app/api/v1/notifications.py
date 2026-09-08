"""Notifications endpoints."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.models import Notification, User

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ============================================================================
# Schemas
# ============================================================================


class NotificationSchema(BaseModel):
    """Notification schema."""

    id: int
    user_id: int
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateNotificationRequest(BaseModel):
    """Create notification request."""

    notification_type: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1, max_length=1000)


# ============================================================================
# Endpoints
# ============================================================================


@router.get("", response_model=list[NotificationSchema])
async def list_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    unread_only: bool = False,
    limit: int = 50,
) -> list[NotificationSchema]:
    """List notifications for the current user."""
    stmt = select(Notification).where(Notification.user_id == current_user.id)

    if unread_only:
        stmt = stmt.where(Notification.is_read is False)

    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    notifications = result.scalars().all()

    return [NotificationSchema.model_validate(n) for n in notifications]


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Get count of unread notifications."""
    from sqlalchemy import func

    stmt = select(func.count(Notification.id)).where(
        (Notification.user_id == current_user.id) & (Notification.is_read is False)
    )
    result = await db.execute(stmt)
    unread_count = result.scalar() or 0

    return {"unread_count": unread_count}


@router.get("/{notification_id}", response_model=NotificationSchema)
async def get_notification(
    notification_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> NotificationSchema:
    """Get a specific notification."""
    stmt = select(Notification).where(
        (Notification.id == notification_id) & (Notification.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    return NotificationSchema.model_validate(notification)


@router.put("/{notification_id}/read", response_model=NotificationSchema)
async def mark_as_read(
    notification_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> NotificationSchema:
    """Mark a notification as read."""
    stmt = select(Notification).where(
        (Notification.id == notification_id) & (Notification.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)

    return NotificationSchema.model_validate(notification)


@router.put("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_as_read(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Mark all notifications as read."""
    stmt = select(Notification).where(
        (Notification.user_id == current_user.id) & (Notification.is_read is False)
    )
    result = await db.execute(stmt)
    notifications = result.scalars().all()

    for notification in notifications:
        notification.is_read = True

    await db.commit()


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete a notification."""
    stmt = select(Notification).where(
        (Notification.id == notification_id) & (Notification.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    await db.delete(notification)
    await db.commit()


@router.post("", response_model=NotificationSchema, status_code=status.HTTP_201_CREATED)
async def create_notification(
    user_id: int,
    request: CreateNotificationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> NotificationSchema:
    """Create a notification (self-notifications or admin-sent)."""
    # Allow users to create notifications for themselves
    # Or allow admin to create notifications for any user
    from app.models.models import RoleEnum

    if current_user.id != user_id and current_user.role != RoleEnum.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create notifications for other users")

    # Verify target user exists
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    notification = Notification(
        user_id=user_id,
        notification_type=request.notification_type,
        title=request.title,
        message=request.message,
        is_read=False,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    return NotificationSchema.model_validate(notification)
