from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

import models


def utc_now_naive() -> datetime:
    """Return UTC for the existing naive-UTC database timestamp contract."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def record_audit(
    db: Session,
    event_type: str,
    *,
    user_id: Optional[int] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    detail: Optional[str] = None,
) -> models.AuditEvent:
    event = models.AuditEvent(
        user_id=user_id,
        event_type=event_type,
        resource_type=resource_type,
        resource_id=resource_id,
        detail=detail,
        created_at=utc_now_naive(),
    )
    db.add(event)
    return event
