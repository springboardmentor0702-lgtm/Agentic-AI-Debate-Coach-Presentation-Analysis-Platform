"""
Thin REST wrapper around Supabase's PostgREST + Auth Admin APIs.
Deliberately plain `requests`/`httpx` calls, no supabase-py SDK - see
project docs for why (dependency weight, avoiding another abstraction
layer over what's already a simple REST interface).
"""
from typing import Optional

import httpx
import requests

from app.config import settings


def _headers(use_service_key: bool) -> dict:
    key = settings.SUPABASE_SERVICE_KEY if use_service_key else settings.SUPABASE_ANON_KEY
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _raise_with_detail(resp: requests.Response, action: str, table: str) -> None:
    """
    Bare `resp.raise_for_status()` only ever produces "400 Client
    Error: Bad Request for url: ..." - it throws away the actual
    Postgres/PostgREST error body, which is the one piece of
    information that actually explains WHY a request failed (a
    specific constraint name, a specific column, a specific type
    mismatch). This past debugging round spent real time on a wrong
    guess purely because that detail wasn't visible in the traceback -
    every mutation call now includes it directly.
    """
    if not resp.ok:
        raise requests.exceptions.HTTPError(
            f"{resp.status_code} error {action} {table}: {resp.text}", response=resp
        )


def get_user_from_token(access_token: str) -> dict:
    """
    Verifies a Supabase access token by asking Supabase who it belongs
    to. Returns the user dict (id, email, ...). Raises if the token is
    missing, expired, or invalid.
    """
    resp = requests.get(
        f"{settings.SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey": settings.SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {access_token}",
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def create_auth_user(email: str, password: str) -> dict:
    """
    Creates a new Supabase Auth account directly via the Admin API -
    used only for admin-provisioned accounts (Segment 19), bypassing
    the normal self-registration flow. `email_confirm: True` marks it
    pre-confirmed, since this project has no email-sending set up -
    there is no invite email; the admin has to share the password with
    the person themselves, out-of-band.
    """
    resp = requests.post(
        f"{settings.SUPABASE_URL}/auth/v1/admin/users",
        headers=_headers(use_service_key=True),
        json={"email": email, "password": password, "email_confirm": True},
        timeout=10,
    )
    _raise_with_detail(resp, "creating auth user for", email)
    data = resp.json()
    return data.get("user", data)


def update_auth_user(user_id: str, updates: dict) -> dict:
    """
    Updates a Supabase Auth account's own login credentials (email
    and/or password) directly via the Admin API - separate from
    editing `profiles` table fields.
    """
    resp = requests.put(
        f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
        headers=_headers(use_service_key=True),
        json=updates,
        timeout=10,
    )
    _raise_with_detail(resp, "updating auth user", user_id)
    data = resp.json()
    return data.get("user", data)


def delete_auth_user(user_id: str) -> None:
    """Deletes a Supabase Auth account directly via the Admin API."""
    resp = requests.delete(
        f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
        headers=_headers(use_service_key=True),
        timeout=10,
    )
    _raise_with_detail(resp, "deleting auth user", user_id)


def db_select(table: str, params: Optional[dict] = None, use_service_key: bool = True) -> list:
    resp = requests.get(
        f"{settings.SUPABASE_URL}/rest/v1/{table}",
        headers=_headers(use_service_key),
        params=params or {},
        timeout=10,
    )
    _raise_with_detail(resp, "reading from", table)
    return resp.json()


# --- Shared async HTTP client ---
#
# One client, created once and reused for every async call, rather
# than a new httpx.AsyncClient() per call (that was Segment 18's own
# bug, already fixed - a fresh client per call under concurrent load
# opened far more simultaneous connections than necessary and caused
# real ConnectTimeout failures).
_async_client: Optional[httpx.AsyncClient] = None


def _get_async_client() -> httpx.AsyncClient:
    global _async_client
    if _async_client is None or _async_client.is_closed:
        _async_client = httpx.AsyncClient(
            timeout=httpx.Timeout(20.0, connect=10.0),
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
        )
    return _async_client


async def db_select_async(table: str, params: Optional[dict] = None, use_service_key: bool = True) -> list:
    """Async twin of db_select() above - see that function's docstring."""
    client = _get_async_client()
    resp = await client.get(
        f"{settings.SUPABASE_URL}/rest/v1/{table}",
        headers=_headers(use_service_key),
        params=params or {},
    )
    resp.raise_for_status()
    return resp.json()


def db_insert(table: str, data: dict, use_service_key: bool = True) -> dict:
    resp = requests.post(
        f"{settings.SUPABASE_URL}/rest/v1/{table}",
        headers=_headers(use_service_key),
        json=data,
        timeout=10,
    )
    _raise_with_detail(resp, "inserting into", table)
    result = resp.json()
    return result[0] if isinstance(result, list) and result else result


def db_update(table: str, match: dict, data: dict, use_service_key: bool = True) -> dict:
    params = {k: f"eq.{v}" for k, v in match.items()}
    resp = requests.patch(
        f"{settings.SUPABASE_URL}/rest/v1/{table}",
        headers=_headers(use_service_key),
        params=params,
        json=data,
        timeout=10,
    )
    _raise_with_detail(resp, "updating", table)
    result = resp.json()
    return result[0] if isinstance(result, list) and result else result


def db_delete(table: str, match: dict, use_service_key: bool = True) -> None:
    params = {k: f"eq.{v}" for k, v in match.items()}
    resp = requests.delete(
        f"{settings.SUPABASE_URL}/rest/v1/{table}",
        headers=_headers(use_service_key),
        params=params,
        timeout=10,
    )
    _raise_with_detail(resp, "deleting from", table)


def call_rpc(fn_name: str, params: dict, use_service_key: bool = True) -> list:
    resp = requests.post(
        f"{settings.SUPABASE_URL}/rest/v1/rpc/{fn_name}",
        headers=_headers(use_service_key),
        json=params,
        timeout=15,
    )
    _raise_with_detail(resp, "calling rpc", fn_name)
    return resp.json()
