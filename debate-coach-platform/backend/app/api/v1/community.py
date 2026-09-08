from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.models import DebateFeedback, DebateRequest, HumanDebate, HumanDebateMessage, Notification, RoleEnum, Skill, User
from app.schemas.community import (
    DebateRequestCreate, DebateRequestOut, DebateRequestUpdate, ExpertDebateCreate, FeedbackCreate, FeedbackOut,
    ExpertConnectionOut, ExpertProfileOut, HumanDebateOut, HumanMessageCreate, HumanMessageOut, LearnerProfileOut, PersonOut,
    PracticeDebateCreate,
)

router = APIRouter(prefix="/community", tags=["community"])
EXPERT_ROLES = (RoleEnum.DEBATE_COACH.value, "DEBATE_EXPERT")


@router.get("/experts", response_model=list[PersonOut])
def list_experts(db: Session = Depends(get_db), current_user: User = Depends(require_roles("LEARNER"))) -> list[PersonOut]:
    experts = db.query(User).filter(User.role.in_(EXPERT_ROLES), User.is_active.is_(True), User.id != current_user.id).order_by(User.full_name).all()
    return [PersonOut.model_validate(expert) for expert in experts]


@router.get("/experts/{expert_id}", response_model=ExpertProfileOut)
def get_expert_profile(expert_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("LEARNER"))) -> ExpertProfileOut:
    expert = db.query(User).filter(User.id == expert_id, User.role.in_(EXPERT_ROLES), User.is_active.is_(True)).first()
    if not expert:
        raise HTTPException(status_code=404, detail="Expert profile not found")
    profile = expert.profile
    skills = db.query(Skill).filter(Skill.user_id == expert.id).order_by(Skill.name).all()
    return ExpertProfileOut(
        id=expert.id,
        full_name=expert.full_name,
        email=expert.email,
        role=expert.role,
        is_active=expert.is_active,
        experience_level=profile.experience_level if profile else "Beginner",
        presentation_domains=profile.presentation_domains if profile else None,
        coaching_preferences=profile.coaching_preferences if profile else None,
        skills=[{"id": skill.id, "name": skill.name, "score": skill.score} for skill in skills],
    )


@router.get("/learners", response_model=list[PersonOut])
def list_learners(db: Session = Depends(get_db), current_user: User = Depends(require_roles(*EXPERT_ROLES))) -> list[PersonOut]:
    learners = db.query(User).filter(User.role == RoleEnum.LEARNER.value, User.is_active.is_(True)).order_by(User.full_name).all()
    return [PersonOut.model_validate(learner) for learner in learners]


@router.get("/practice/learners", response_model=list[PersonOut])
def list_practice_learners(db: Session = Depends(get_db), current_user: User = Depends(require_roles("LEARNER"))) -> list[PersonOut]:
    learners = db.query(User).filter(User.role == RoleEnum.LEARNER.value, User.is_active.is_(True), User.id != current_user.id).order_by(User.full_name).all()
    return [PersonOut.model_validate(learner) for learner in learners]


@router.get("/learners/{learner_id}", response_model=LearnerProfileOut)
def get_learner_profile(learner_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(*EXPERT_ROLES))) -> LearnerProfileOut:
    learner = db.query(User).filter(User.id == learner_id, User.role == RoleEnum.LEARNER.value, User.is_active.is_(True)).first()
    if not learner:
        raise HTTPException(status_code=404, detail="Learner profile not found")
    profile = learner.profile
    skills = db.query(Skill).filter(Skill.user_id == learner.id).order_by(Skill.name).all()
    experts = db.query(User).filter(User.role.in_(EXPERT_ROLES), User.is_active.is_(True)).order_by(User.full_name).all()
    requests = db.query(DebateRequest).filter(DebateRequest.learner_id == learner.id).order_by(DebateRequest.updated_at.desc()).all()
    debates = db.query(HumanDebate).filter(HumanDebate.learner_id == learner.id).all()
    connected_ids = {item.expert_id for item in requests} | {item.expert_id for item in debates}
    connected_experts = []
    for expert in experts:
        expert_requests = [item for item in requests if item.expert_id == expert.id]
        expert_debates = [item for item in debates if item.expert_id == expert.id]
        if expert.id in connected_ids:
            connected_experts.append(ExpertConnectionOut(
                id=expert.id,
                full_name=expert.full_name,
                email=expert.email,
                role=expert.role,
                is_active=expert.is_active,
                request_count=len(expert_requests),
                debate_count=len(expert_debates),
                latest_status=expert_requests[0].status if expert_requests else (expert_debates[0].status if expert_debates else None),
            ))

    def expert_profile(expert: User) -> ExpertProfileOut:
        expert_profile_data = expert.profile
        expert_skills = db.query(Skill).filter(Skill.user_id == expert.id).order_by(Skill.name).all()
        return ExpertProfileOut(
            id=expert.id,
            full_name=expert.full_name,
            email=expert.email,
            role=expert.role,
            is_active=expert.is_active,
            experience_level=expert_profile_data.experience_level if expert_profile_data else "Beginner",
            presentation_domains=expert_profile_data.presentation_domains if expert_profile_data else None,
            coaching_preferences=expert_profile_data.coaching_preferences if expert_profile_data else None,
            skills=[{"id": skill.id, "name": skill.name, "score": skill.score} for skill in expert_skills],
        )

    return LearnerProfileOut(
        id=learner.id,
        full_name=learner.full_name,
        email=learner.email,
        role=learner.role,
        is_active=learner.is_active,
        experience_level=profile.experience_level if profile else "Beginner",
        preferred_debate_topics=profile.preferred_debate_topics if profile else None,
        presentation_domains=profile.presentation_domains if profile else None,
        learning_goals=profile.learning_goals if profile else None,
        coaching_preferences=profile.coaching_preferences if profile else None,
        skills=[{"id": skill.id, "name": skill.name, "score": skill.score} for skill in skills],
        connected_expert_count=len(connected_ids),
        connected_experts=connected_experts,
        available_experts=[expert_profile(expert) for expert in experts],
    )


@router.post("/requests", response_model=DebateRequestOut, status_code=status.HTTP_201_CREATED)
def create_request(payload: DebateRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("LEARNER"))) -> DebateRequestOut:
    expert = db.query(User).filter(User.id == payload.expert_id, User.role.in_(EXPERT_ROLES), User.is_active.is_(True)).first()
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")
    request = DebateRequest(learner_id=current_user.id, expert_id=expert.id, topic=payload.topic)
    db.add(request)
    db.commit()
    db.refresh(request)
    return DebateRequestOut.model_validate(request)


@router.post("/debates/start", response_model=HumanDebateOut, status_code=status.HTTP_201_CREATED)
def start_expert_debate(payload: ExpertDebateCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(*EXPERT_ROLES))) -> HumanDebateOut:
    learner = db.query(User).filter(User.id == payload.learner_id, User.role == RoleEnum.LEARNER.value, User.is_active.is_(True)).first()
    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found")
    request = DebateRequest(learner_id=learner.id, expert_id=current_user.id, topic=payload.topic, status="ACCEPTED")
    db.add(request)
    db.flush()
    debate = HumanDebate(request_id=request.id, learner_id=learner.id, expert_id=current_user.id, topic=payload.topic, status="ACTIVE")
    db.add(debate)
    db.commit()
    db.refresh(debate)
    return HumanDebateOut.model_validate(debate)


@router.post("/practice/debates/start", response_model=DebateRequestOut, status_code=status.HTTP_201_CREATED)
def start_practice_debate(payload: PracticeDebateCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("LEARNER"))) -> DebateRequestOut:
    partner = db.query(User).filter(User.id == payload.learner_id, User.role == RoleEnum.LEARNER.value, User.is_active.is_(True), User.id != current_user.id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Practice learner not found")
    request = DebateRequest(learner_id=current_user.id, expert_id=partner.id, topic=payload.topic, status="PENDING")
    db.add(request)
    db.add(Notification(
        user_id=partner.id,
        notification_type="PRACTICE_DEBATE_REQUEST",
        title="New practice debate request",
        message=f"{current_user.full_name} invited you to practice a debate: {payload.topic}",
    ))
    db.commit()
    db.refresh(request)
    return DebateRequestOut.model_validate(request)


@router.get("/requests", response_model=list[DebateRequestOut])
def list_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[DebateRequestOut]:
    query = db.query(DebateRequest)
    if current_user.role == RoleEnum.LEARNER.value:
        query = query.filter(or_(DebateRequest.learner_id == current_user.id, DebateRequest.expert_id == current_user.id))
    elif current_user.role in EXPERT_ROLES:
        query = query.filter(DebateRequest.expert_id == current_user.id)
    else:
        query = query.filter(or_(DebateRequest.learner_id == current_user.id, DebateRequest.expert_id == current_user.id))
    return [DebateRequestOut.model_validate(item) for item in query.order_by(DebateRequest.created_at.desc()).all()]


@router.put("/requests/{request_id}", response_model=HumanDebateOut | DebateRequestOut)
def update_request(request_id: int, payload: DebateRequestUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> HumanDebateOut | DebateRequestOut:
    request = db.query(DebateRequest).filter(DebateRequest.id == request_id, DebateRequest.status == "PENDING").first()
    if request and request.expert_id == current_user.id:
        target = db.query(User).filter(User.id == request.expert_id).first()
        if not target or (current_user.role not in EXPERT_ROLES and current_user.role != RoleEnum.LEARNER.value):
            request = None
    elif request:
        request = None
    if not request:
        raise HTTPException(status_code=404, detail="Pending practice request not found")
    request.status = payload.status
    if payload.status == "ACCEPTED":
        debate = HumanDebate(request_id=request.id, learner_id=request.learner_id, expert_id=request.expert_id, topic=request.topic)
        db.add(debate)
        db.commit()
        db.refresh(debate)
        return HumanDebateOut.model_validate(debate)
    db.commit()
    db.refresh(request)
    return DebateRequestOut.model_validate(request)


@router.get("/practice/notifications", response_model=list[dict])
def practice_notifications(db: Session = Depends(get_db), current_user: User = Depends(require_roles("LEARNER"))) -> list[dict]:
    notifications = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.notification_type == "PRACTICE_DEBATE_REQUEST").order_by(Notification.created_at.desc()).limit(20).all()
    return [{"id": item.id, "title": item.title, "message": item.message, "is_read": item.is_read, "created_at": item.created_at} for item in notifications]


@router.get("/debates", response_model=list[HumanDebateOut])
def list_human_debates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[HumanDebateOut]:
    debates = db.query(HumanDebate).filter(or_(HumanDebate.learner_id == current_user.id, HumanDebate.expert_id == current_user.id)).order_by(HumanDebate.created_at.desc()).all()
    return [HumanDebateOut.model_validate(item) for item in debates]


@router.get("/debates/{debate_id}/messages", response_model=list[HumanMessageOut])
def list_messages(debate_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[HumanMessageOut]:
    debate = _get_debate(debate_id, db, current_user)
    messages = db.query(HumanDebateMessage).filter(HumanDebateMessage.debate_id == debate.id).order_by(HumanDebateMessage.created_at).all()
    return [HumanMessageOut.model_validate(item) for item in messages]


@router.post("/debates/{debate_id}/messages", response_model=HumanMessageOut, status_code=status.HTTP_201_CREATED)
def send_message(debate_id: int, payload: HumanMessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> HumanMessageOut:
    debate = _get_debate(debate_id, db, current_user)
    if payload.message_type == "AUDIO" and not payload.audio_url:
        raise HTTPException(status_code=400, detail="audio_url is required for audio messages")
    message = HumanDebateMessage(debate_id=debate.id, sender_id=current_user.id, message=payload.message, message_type=payload.message_type, audio_url=payload.audio_url)
    db.add(message)
    db.commit()
    db.refresh(message)
    return HumanMessageOut.model_validate(message)


@router.post("/debates/{debate_id}/feedback", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def add_feedback(debate_id: int, payload: FeedbackCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(*EXPERT_ROLES))) -> FeedbackOut:
    debate = _get_debate(debate_id, db, current_user)
    feedback = DebateFeedback(debate_id=debate.id, author_id=current_user.id, feedback=payload.feedback)
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return FeedbackOut.model_validate(feedback)


def _get_debate(debate_id: int, db: Session, current_user: User) -> HumanDebate:
    debate = db.query(HumanDebate).filter(HumanDebate.id == debate_id, or_(HumanDebate.learner_id == current_user.id, HumanDebate.expert_id == current_user.id)).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate room not found")
    return debate
