import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserProfile
from ..schemas import UserResponse, UserProfileResponse, UserProfileUpdate
from .auth import get_current_user, require_role

router = APIRouter(prefix="/users", tags=["User Profile & Skill Management"])

def serialize_profile(profile: UserProfile) -> dict:
    if not profile:
        return {}
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "experience_level": profile.experience_level,
        "preferred_topics": json.loads(profile.preferred_topics) if profile.preferred_topics else [],
        "presentation_domains": json.loads(profile.presentation_domains) if profile.presentation_domains else [],
        "learning_goals": json.loads(profile.learning_goals) if profile.learning_goals else [],
        "coaching_preferences": profile.coaching_preferences or "Socratic & Analytical",
        "bio": profile.bio or "",
        "avatar_url": profile.avatar_url or "",
        "updated_at": profile.updated_at
    }

@router.get("/profile", response_model=UserProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return serialize_profile(profile)

@router.put("/profile", response_model=UserProfileResponse)
def update_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    if profile_in.experience_level is not None:
        profile.experience_level = profile_in.experience_level
    if profile_in.preferred_topics is not None:
        profile.preferred_topics = json.dumps(profile_in.preferred_topics)
    if profile_in.presentation_domains is not None:
        profile.presentation_domains = json.dumps(profile_in.presentation_domains)
    if profile_in.learning_goals is not None:
        profile.learning_goals = json.dumps(profile_in.learning_goals)
    if profile_in.coaching_preferences is not None:
        profile.coaching_preferences = profile_in.coaching_preferences
    if profile_in.bio is not None:
        profile.bio = profile_in.bio
    if profile_in.avatar_url is not None:
        profile.avatar_url = profile_in.avatar_url

    db.commit()
    db.refresh(profile)
    return serialize_profile(profile)

@router.get("/", response_model=List[UserResponse])
def list_users(
    current_user: User = Depends(require_role(["Debate Coach", "Educator", "Administrator"])),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    results = []
    for u in users:
        p_dict = serialize_profile(u.profile) if u.profile else None
        results.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "profile": p_dict
        })
    return results

@router.put("/{user_id}/role")
def update_user_role(
    user_id: int,
    new_role: str,
    current_user: User = Depends(require_role(["Administrator"])),
    db: Session = Depends(get_db)
):
    valid_roles = ["Learner", "Debate Coach", "Educator", "Administrator"]
    if new_role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.role = new_role
    db.commit()
    return {"message": f"User {target.email} updated to role {new_role}"}
