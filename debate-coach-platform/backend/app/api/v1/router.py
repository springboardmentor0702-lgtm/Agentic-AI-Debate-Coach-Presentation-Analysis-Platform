from fastapi import APIRouter

from app.api.v1 import admin, analysis, analytics, auth, community, debates, health, notifications, presentations, profile

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(debates.router)
api_router.include_router(analysis.router)
api_router.include_router(presentations.router)
api_router.include_router(analytics.router)
api_router.include_router(notifications.router)
api_router.include_router(admin.router)
api_router.include_router(community.router)

