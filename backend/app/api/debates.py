from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_user
from ..models import User, DebateTopic, DebateSession, DebateTurn, SessionScore
from ..schemas import TopicIn, SessionIn, TurnIn
from .deps import owned_session
from ..services.argument_analysis import analyze_argument
from ..services.fallacy_detection import detect_fallacies
from ..services.debate_simulation import ai_opponent_turn
from ..services.notifications_service import notify

router = APIRouter(prefix="/api", tags=["debates"])


@router.post("/topics")
def create_topic(body: TopicIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = DebateTopic(title=body.title, description=body.description,
                    category=body.category, created_by=user.id)
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "title": t.title}


@router.get("/topics")
def list_topics(db: Session = Depends(get_db)):
    return [{"id": t.id, "title": t.title, "description": t.description, "category": t.category}
            for t in db.query(DebateTopic).order_by(DebateTopic.created_at.desc()).limit(50)]


@router.post("/sessions")
def create_session(body: SessionIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    topic_id = body.topic_id
    topic_title = ""
    if not topic_id and body.topic_title:
        t = DebateTopic(title=body.topic_title, created_by=user.id)
        db.add(t)
        db.commit()
        db.refresh(t)
        topic_id = t.id
        topic_title = body.topic_title
    else:
        tt = db.get(DebateTopic, topic_id)
        topic_title = tt.title if tt else ""
    if not topic_id:
        return {"error": "topic_id or topic_title required"}

    scheduled_at = None
    if body.scheduled_at:
        try:
            scheduled_at = datetime.fromisoformat(body.scheduled_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            scheduled_at = None
    status = "scheduled" if (scheduled_at and scheduled_at > datetime.utcnow()) else "active"

    s = DebateSession(user_id=user.id, topic_id=topic_id, format=body.format,
                      position=body.position, status=status,
                      scheduled_at=scheduled_at,
                      started_at=datetime.utcnow() if status == "active" else None)
    db.add(s)
    db.commit()
    db.refresh(s)

    if status == "scheduled":
        notify(db, user.id, "info", "Debate scheduled",
               f'Your debate on "{topic_title}" is scheduled for {scheduled_at}.',
               dedupe_key=f"scheduled:{s.id}")
        db.commit()
    return {"id": s.id, "status": s.status}


@router.get("/sessions")
def my_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(DebateSession).filter(DebateSession.user_id == user.id) \
        .order_by(DebateSession.created_at.desc()).all()
    out = []
    for s in sessions:
        topic = db.get(DebateTopic, s.topic_id)
        sc = db.query(SessionScore).filter(SessionScore.session_id == s.id).first()
        out.append({"id": s.id, "topic": topic.title if topic else "", "format": s.format,
                    "position": s.position, "status": s.status, "created_at": str(s.created_at),
                    "score": round(sc.overall_score) if sc else None})
    return out


@router.get("/sessions/{session_id}")
def get_session(s: DebateSession = Depends(owned_session), db: Session = Depends(get_db)):
    topic = db.get(DebateTopic, s.topic_id)
    turns = db.query(DebateTurn).filter(DebateTurn.session_id == s.id) \
        .order_by(DebateTurn.turn_number).all()
    return {"id": s.id, "topic": topic.title if topic else "", "format": s.format,
            "position": s.position, "status": s.status,
            "turns": [{"speaker": t.speaker, "phase": t.phase, "content": t.content,
                       "analysis": t.analysis, "turn_number": t.turn_number} for t in turns]}


@router.post("/sessions/{session_id}/turns")
def add_turn(body: TurnIn, s: DebateSession = Depends(owned_session), db: Session = Depends(get_db)):
    if s.status == "scheduled":
        s.status = "active"
        s.started_at = datetime.utcnow()
    topic = db.get(DebateTopic, s.topic_id)
    topic_title = topic.title if topic else "the given topic"
    n = db.query(DebateTurn).filter(DebateTurn.session_id == s.id).count() + 1

    arg = analyze_argument(body.content, topic_title)
    fal = detect_fallacies(body.content)
    analysis = {"argument": arg, "fallacies": fal}
    db.add(DebateTurn(session_id=s.id, speaker="user", turn_number=n,
                      phase=body.phase, content=body.content, analysis=analysis))

    ai_response, ai_analysis = None, None
    if s.format == "ai_simulation":
        ai_position = "con" if s.position == "pro" else "pro"
        ai_text = ai_opponent_turn(topic_title, ai_position, body.content, body.phase, n + 1)
        ai_analysis = {"argument": analyze_argument(ai_text, topic_title),
                       "fallacies": detect_fallacies(ai_text)}
        db.add(DebateTurn(session_id=s.id, speaker="ai", turn_number=n + 1, phase=body.phase,
                          content=ai_text, analysis=ai_analysis))
        ai_response = ai_text
    db.commit()
    return {"user_analysis": analysis, "ai_response": ai_response, "ai_analysis": ai_analysis}
