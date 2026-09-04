"""
Admin-configurable platform settings (Segment 19).

A simple key-value store in the `app_settings` table - persists across
backend restarts, unlike an in-memory value would. Currently backs
just one setting (the Peer Comparison minimum pool size, previously
only changeable by editing `.env`), but the pattern is reusable for
any future admin-configurable value without needing a new migration
each time.
"""
from app.config import settings as app_config
from app.core import supabase_client


async def get_setting_async(key: str, default: str) -> str:
    rows = await supabase_client.db_select_async("app_settings", params={"key": f"eq.{key}"})
    return rows[0]["value"] if rows else default


def set_setting(key: str, value: str) -> None:
    existing = supabase_client.db_select("app_settings", params={"key": f"eq.{key}"})
    if existing:
        supabase_client.db_update("app_settings", {"key": key}, {"value": value})
    else:
        supabase_client.db_insert("app_settings", {"key": key, "value": value})


async def get_comparison_min_pool_size() -> int:
    value = await get_setting_async(
        "comparison_min_pool_size", str(app_config.COMPARISON_MIN_POOL_SIZE)
    )
    try:
        return int(value)
    except (TypeError, ValueError):
        return app_config.COMPARISON_MIN_POOL_SIZE
