from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from routers.dashboards import _feedback_bullets
from services.permissions import can_view_student
import models
import schemas

router = APIRouter(prefix="/api/v1/coach-feedback", tags=["Coach Feedback"])


def _load_student_and_check(user_id: int, current_user: models.User, db: Session) -> models.User:
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Student not found.")
    if not can_view_student(current_user, target):
        raise HTTPException(status_code=403, detail="You can only send feedback to your own assigned students.")
    return target


@router.get("/suggestion/{student_id}")
def get_ai_suggestion(
    student_id: int,
    session_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Draft an AI feedback message for a specific student that the sender
    (Coach/Educator/Administrator) can review and edit before sending.
    If session_id is omitted, drafts from the student's most recent
    completed session."""
    student = _load_student_and_check(student_id, current_user, db)

    score = None
    if session_id is not None:
        score = (
            db.query(models.PerformanceScore)
            .filter(models.PerformanceScore.session_id == session_id, models.PerformanceScore.user_id == student_id)
            .order_by(models.PerformanceScore.created_at.desc())
            .first()
        )
    if score is None:
        score = (
            db.query(models.PerformanceScore)
            .filter(models.PerformanceScore.user_id == student_id)
            .order_by(models.PerformanceScore.created_at.desc())
            .first()
        )

    if score is None:
        return {
            "student_id": student_id,
            "session_id": session_id,
            "suggested_message": (
                f"Hi {student.full_name.split(' ')[0]}, you haven't completed a scored debate session yet. "
                "Try running one in Simulation, then I'll be able to send you specific feedback."
            ),
        }

    strengths, improvements = _feedback_bullets(score)
    session_obj = db.query(models.DebateSession).filter(models.DebateSession.id == score.session_id).first()
    topic_line = f' on "{session_obj.topic}"' if session_obj and session_obj.topic else ""
    first_name = student.full_name.split(" ")[0]

    # Pull one real line from the actual conversation so the draft references
    # something the student genuinely said, not just their score.
    last_turn = (
        db.query(models.SimulationTurn)
        .filter(models.SimulationTurn.session_id == score.session_id)
        .order_by(models.SimulationTurn.turn_index.desc())
        .first()
    )
    conversation_line = ""
    if last_turn and last_turn.user_argument:
        snippet = last_turn.user_argument.strip()
        if len(snippet) > 140:
            snippet = snippet[:140].rsplit(" ", 1)[0] + "..."
        conversation_line = f'\nOne argument that stood out: "{snippet}"\n'

    message = (
        f"Hi {first_name}, nice work{topic_line} — overall score {round(score.overall_weighted_score, 1)}%.\n"
        f"{conversation_line}\n"
        f"What went well:\n- " + "\n- ".join(strengths[:2] or ["Solid, consistent effort this session."]) + "\n\n"
        f"Where to focus next:\n- " + "\n- ".join(improvements[:2] or ["Keep pushing into harder debate formats."]) + "\n\n"
        "Let's build on this in your next session."
    )
    return {"student_id": student_id, "session_id": score.session_id, "suggested_message": message}


@router.post("/send", response_model=schemas.CoachFeedbackResponse)
def send_feedback(
    payload: schemas.CoachFeedbackSend,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a (possibly edited) feedback message to a student. The sender
    must be that student's assigned Coach/Educator, or an Administrator."""
    student = _load_student_and_check(payload.student_id, current_user, db)

    if payload.session_id is not None:
        session_exists = db.query(models.DebateSession).filter(
            models.DebateSession.id == payload.session_id, models.DebateSession.user_id == student.id
        ).first()
        if not session_exists:
            raise HTTPException(status_code=400, detail="That session does not belong to this student.")

    record = models.CoachFeedback(
        student_id=student.id,
        coach_id=current_user.id,
        session_id=payload.session_id,
        message=payload.message.strip(),
        created_at=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    session_obj = db.query(models.DebateSession).filter(models.DebateSession.id == record.session_id).first() if record.session_id else None
    return schemas.CoachFeedbackResponse(
        id=record.id,
        student_id=record.student_id,
        coach_id=record.coach_id,
        coach_name=current_user.full_name,
        session_id=record.session_id,
        session_title=session_obj.title if session_obj else None,
        message=record.message,
        created_at=record.created_at,
    )


@router.get("/inbox", response_model=List[schemas.CoachFeedbackResponse])
def get_my_inbox(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Messages sent TO the current logged-in user (typically a Learner),
    most recent first. Powers the "Messages from your Coach" panel."""
    rows = (
        db.query(models.CoachFeedback)
        .filter(models.CoachFeedback.student_id == current_user.id)
        .order_by(models.CoachFeedback.created_at.desc())
        .all()
    )
    results = []
    for r in rows:
        coach = db.query(models.User).filter(models.User.id == r.coach_id).first()
        session_obj = db.query(models.DebateSession).filter(models.DebateSession.id == r.session_id).first() if r.session_id else None
        results.append(schemas.CoachFeedbackResponse(
            id=r.id, student_id=r.student_id, coach_id=r.coach_id,
            coach_name=coach.full_name if coach else "Your coach",
            session_id=r.session_id, session_title=session_obj.title if session_obj else None,
            message=r.message, created_at=r.created_at,
        ))
    return results


@router.get("/sent/{student_id}", response_model=List[schemas.CoachFeedbackResponse])
def get_feedback_sent_to_student(student_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """History of feedback sent to one specific student, for the sender to
    review before drafting the next message. Scoped the same way as sending."""
    student = _load_student_and_check(student_id, current_user, db)
    rows = (
        db.query(models.CoachFeedback)
        .filter(models.CoachFeedback.student_id == student.id)
        .order_by(models.CoachFeedback.created_at.desc())
        .all()
    )
    results = []
    for r in rows:
        coach = db.query(models.User).filter(models.User.id == r.coach_id).first()
        session_obj = db.query(models.DebateSession).filter(models.DebateSession.id == r.session_id).first() if r.session_id else None
        results.append(schemas.CoachFeedbackResponse(
            id=r.id, student_id=r.student_id, coach_id=r.coach_id,
            coach_name=coach.full_name if coach else "Coach",
            session_id=r.session_id, session_title=session_obj.title if session_obj else None,
            message=r.message, created_at=r.created_at,
        ))
    return results
