from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Request
from fastapi.responses import JSONResponse

from config import settings


class InMemoryRateLimitMiddleware:
    """Small single-process limiter for development and single-worker deployments.

    Production multi-worker deployments should place the same policy at an API
    gateway or replace this store with Redis so limits are shared across workers.
    """

    def __init__(self, app):
        self.app = app
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return
        path = scope.get("path", "")
        if path in {"/", "/health", "/docs", "/redoc", "/openapi.json", "/api/v1/openapi.json"} or path.endswith("/openapi.json"):
            await self.app(scope, receive, send)
            return
        headers = dict(scope.get("headers") or [])
        forwarded = headers.get(b"x-forwarded-for", b"").decode("utf-8").split(",")[0].strip()
        client = scope.get("client")
        client_host = forwarded or (client[0] if client else "unknown")
        key = f"{client_host}:{path}"
        now = time.monotonic()
        cutoff = now - settings.RATE_LIMIT_WINDOW_SECONDS
        with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()
            allowed = len(events) < settings.RATE_LIMIT_REQUESTS
            if allowed:
                events.append(now)
        if not allowed:
            response = JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please retry later."},
                headers={"Retry-After": str(settings.RATE_LIMIT_WINDOW_SECONDS)},
            )
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)
