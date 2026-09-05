from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user, require_role
from services.security import record_audit, utc_now_naive
import models
import schemas

router = APIRouter(prefix="/api/v1/workflows", tags=["Coaching Workflows"])


@router.post("/assignments", response_model=schemas.AssignmentResponse)
def create_assignment(payload: schemas.AssignmentCreate, current_user: models.User = Depends(require_role(["Debate Coach", "Educator", "Administrator"])), db: Session = Depends(get_db)):
    learner = db.query(models.User).filter(models.User.id == payload.learner_id, models.User.is_active.is_(True)).first()
    if not learner or learner.role != "Learner":
        raise HTTPException(status_code=404, detail="Active learner was not found.")
    assignment = db.query(models.CoachAssignment).filter(models.CoachAssignment.coach_id == current_user.id, models.CoachAssignment.learner_id == learner.id).first()
    if assignment:
        assignment.status = "Active"
        assignment.updated_at = utc_now_naive()
    else:
        assignment = models.CoachAssignment(coach_id=current_user.id, learner_id=learner.id, status="Active")
        db.add(assignment)
    record_audit(db, "coach.assignment_created", user_id=current_user.id, resource_type="user", resource_id=learner.id)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/assignments", response_model=List[schemas.AssignmentResponse])
def list_assignments(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(models.CoachAssignment)
    if current_user.role == "Learner":
        query = query.filter(models.CoachAssignment.learner_id == current_user.id)
    elif current_user.role == "Debate Coach":
        query = query.filter(models.CoachAssignment.coach_id == current_user.id)
    elif current_user.role not in {"Educator", "Administrator"}:
        raise HTTPException(status_code=403, detail="Role is not allowed to view assignments.")
    return query.order_by(models.CoachAssignment.updated_at.desc()).all()


@router.patch("/assignments/{assignment_id}/status", response_model=schemas.AssignmentResponse)
def update_assignment_status(assignment_id: int, status: str = Query(..., pattern="^(Active|Paused|Completed)$"), current_user: models.User = Depends(require_role(["Debate Coach", "Educator", "Administrator"])), db: Session = Depends(get_db)):
    assignment = db.query(models.CoachAssignment).filter(models.CoachAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment was not found.")
    if current_user.role == "Debate Coach" and assignment.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not manage this assignment.")
    assignment.status = status
    assignment.updated_at = utc_now_naive()
    record_audit(db, "coach.assignment_status_changed", user_id=current_user.id, resource_type="assignment", resource_id=assignment.id, detail=status)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.put("/progress/me", response_model=schemas.LearningProgressResponse)
def update_progress(payload: schemas.LearningProgressUpdate, current_user: models.User = Depends(require_role(["Learner"])), db: Session = Depends(get_db)):
    skill = payload.skill.strip()
    progress = db.query(models.LearningProgress).filter(models.LearningProgress.user_id == current_user.id, models.LearningProgress.skill == skill).first()
    if not progress:
        progress = models.LearningProgress(user_id=current_user.id, skill=skill)
        db.add(progress)
    progress.score = payload.score
    progress.practice_count = payload.practice_count
    progress.streak_days = payload.streak_days
    progress.last_practiced_at = utc_now_naive()
    progress.updated_at = utc_now_naive()
    record_audit(db, "learner.progress_updated", user_id=current_user.id, resource_type="progress", detail=skill)
    db.commit()
    db.refresh(progress)
    return progress


@router.get("/progress/me", response_model=List[schemas.LearningProgressResponse])
def get_progress(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.LearningProgress).filter(models.LearningProgress.user_id == current_user.id).order_by(models.LearningProgress.updated_at.desc()).all()


@router.get("/progress/{learner_id}", response_model=List[schemas.LearningProgressResponse])
def get_learner_progress(learner_id: int, current_user: models.User = Depends(require_role(["Debate Coach", "Educator", "Administrator"])), db: Session = Depends(get_db)):
    learner = db.query(models.User).filter(models.User.id == learner_id, models.User.role == "Learner", models.User.is_active.is_(True)).first()
    if not learner:
        raise HTTPException(status_code=404, detail="Active learner was not found.")
    if current_user.role == "Debate Coach":
        assigned = db.query(models.CoachAssignment).filter(
            models.CoachAssignment.coach_id == current_user.id,
            models.CoachAssignment.learner_id == learner_id,
            models.CoachAssignment.status == "Active",
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="You do not manage this learner.")
    return db.query(models.LearningProgress).filter(models.LearningProgress.user_id == learner_id).order_by(models.LearningProgress.updated_at.desc()).all()


@router.get("/admin/audit", response_model=List[schemas.AuditEventResponse])
def list_audit_events(limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0), current_user: models.User = Depends(require_role(["Administrator"])), db: Session = Depends(get_db)):
    return db.query(models.AuditEvent).order_by(models.AuditEvent.created_at.desc(), models.AuditEvent.id.desc()).offset(offset).limit(limit).all()


@router.post("/certificates/{session_id}", response_model=schemas.CertificateResponse)
def issue_certificate(session_id: int, current_user: models.User = Depends(require_role(["Learner"])), db: Session = Depends(get_db)):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id, models.DebateSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session was not found.")
    score = db.query(models.PerformanceScore).filter(models.PerformanceScore.session_id == session_id, models.PerformanceScore.user_id == current_user.id).order_by(models.PerformanceScore.created_at.desc()).first()
    if session.status != "Completed" or not score or score.overall_weighted_score < 80:
        raise HTTPException(status_code=400, detail="A completed session with a score of at least 80 is required.")
    existing = db.query(models.Certificate).filter(models.Certificate.session_id == session_id, models.Certificate.user_id == current_user.id, models.Certificate.revoked_at.is_(None)).first()
    if existing:
        return existing
    certificate = models.Certificate(certificate_id=f"LOGOS-{uuid.uuid4().hex[:12].upper()}", user_id=current_user.id, session_id=session_id, score=score.overall_weighted_score)
    db.add(certificate)
    record_audit(db, "certificate.issued", user_id=current_user.id, resource_type="certificate", detail=str(session_id))
    db.commit()
    db.refresh(certificate)
    return certificate


@router.get("/certificates/verify/{certificate_id}", response_model=schemas.CertificateVerifyResponse)
def verify_certificate(certificate_id: str, db: Session = Depends(get_db)):
    certificate = db.query(models.Certificate).filter(models.Certificate.certificate_id == certificate_id).first()
    if not certificate or certificate.revoked_at:
        return {"certificate_id": certificate_id, "valid": False}
    return {"certificate_id": certificate_id, "valid": True, "user_name": certificate.user.full_name if certificate.user else None, "issued_at": certificate.issued_at, "score": certificate.score}
