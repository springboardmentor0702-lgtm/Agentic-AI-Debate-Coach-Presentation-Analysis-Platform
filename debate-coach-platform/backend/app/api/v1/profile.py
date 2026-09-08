from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Skill, UserProfile
from app.schemas.profile import SkillOut, SkillUpdate, UserProfileOut, UserProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserProfileOut)
def get_profile(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> UserProfileOut:
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return UserProfileOut.model_validate(profile)


@router.put("", response_model=UserProfileOut)
def update_profile(payload: UserProfileUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> UserProfileOut:
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return UserProfileOut.model_validate(profile)


@router.get("/skills", response_model=list[SkillOut])
def get_skills(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[SkillOut]:
    skills = db.query(Skill).filter(Skill.user_id == current_user.id).all()
    return [SkillOut.model_validate(skill) for skill in skills]


@router.put("/skills", response_model=list[SkillOut])
def upsert_skills(payload: list[SkillUpdate], db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[SkillOut]:
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one skill is required")

    skills = []
    for item in payload:
        skill = db.query(Skill).filter(Skill.user_id == current_user.id, Skill.name == item.skill_name).first()
        if skill:
            skill.score = item.score
        else:
            skill = Skill(user_id=current_user.id, name=item.skill_name, score=item.score)
            db.add(skill)
        skills.append(skill)

    db.commit()
    for skill in skills:
        db.refresh(skill)
    return [SkillOut.model_validate(skill) for skill in skills]
