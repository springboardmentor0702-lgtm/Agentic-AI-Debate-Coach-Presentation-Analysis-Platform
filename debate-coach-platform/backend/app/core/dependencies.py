"""Backward-compatible dependency imports for the API modules.

This project contains the shared auth dependency logic in ``deps.py``.
Some newer route modules import ``app.core.dependencies`` instead, so we
re-export the same symbols here to avoid import errors.
"""

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db

__all__ = ["get_current_user", "require_roles", "get_db"]
