"""
Every protected route in every future segment depends on
`get_current_user` (needs a profile) or `require_role(...)` (needs a
profile with one of the given roles) from here, instead of
reimplementing auth checks per-router.
"""
import time

from fastapi import Depends, Header, HTTPException

from app.core import supabase_client

# In-memory cache so a burst of API calls from the same logged-in user
# (e.g. a page that fires 3 requests on load) doesn't each independently
# pay for two full network round-trips to Supabase (token verification +
# profile fetch) before doing any real work. This was the main cause of
# pages feeling slow - not Supabase itself being slow, but every request
# redundantly re-verifying auth from scratch.
#
# Per-process memory, 30 second TTL: fine for this deployment (single
# uvicorn process); if this were ever horizontally scaled across
# multiple instances, this would need to move to something shared
# (Redis) - not needed at this project's scale. One consequence worth
# knowing: a role change (e.g. promoting someone to admin) can take up
# to 30 seconds - or an immediate effect after they log out and back in,
# which issues a new token - to be reflected, since the old token's
# cached profile stays valid for that window.
_cache: dict = {}
CACHE_TTL_SECONDS = 30


def _cache_get(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry["cached_at"]) < CACHE_TTL_SECONDS:
        return entry["value"]
    return None


def _cache_set(key: str, value) -> None:
    _cache[key] = {"value": value, "cached_at": time.time()}


async def get_verified_user(authorization: str = Header(None)) -> dict:
    """
    Confirms the caller has a valid Supabase session. Does NOT require
    a profile to exist yet - used by the one endpoint that creates the
    profile in the first place (POST /profiles/me).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")
    token = authorization.removeprefix("Bearer ").strip()

    cached = _cache_get(f"auth:{token}")
    if cached is not None:
        return cached

    try:
        auth_user = supabase_client.get_user_from_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please log in again.")

    _cache_set(f"auth:{token}", auth_user)
    return auth_user


async def get_current_user(auth_user: dict = Depends(get_verified_user)) -> dict:
    """
    Confirms the caller has a valid session AND a completed profile.
    This is what nearly every protected route in the app should depend
    on from Segment 2 onward.
    """
    cached = _cache_get(f"profile:{auth_user['id']}")
    if cached is not None:
        return {**auth_user, "profile": cached}

    profiles = supabase_client.db_select(
        "profiles", params={"id": f"eq.{auth_user['id']}", "select": "*"}
    )
    if not profiles:
        raise HTTPException(
            status_code=404,
            detail="No profile found for this account. Complete registration first.",
        )

    _cache_set(f"profile:{auth_user['id']}", profiles[0])
    return {**auth_user, "profile": profiles[0]}


def require_role(*allowed_roles: str):
    """
    Usage:
        @router.get("/coach/students")
        def list_students(user: dict = Depends(require_role("debate_coach", "admin"))):
            ...
    """
    async def dependency(user: dict = Depends(get_current_user)) -> dict:
        role = user["profile"].get("role")
        if role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"This action requires one of these roles: {', '.join(allowed_roles)}.",
            )
        return user

    return dependency
