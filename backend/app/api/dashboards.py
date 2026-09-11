from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_user, require_roles
from ..models import User, DebateSession, SessionScore, DebateTopic

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])
NULL_ID = "0" * 32
SKILLS = ["argument_quality", "evidence_usage", "logical_consistency",
          "rebuttal_effectiveness", "communication_skills"]


@router.get("/learner")
def learner(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(DebateSession).filter(DebateSession.user_id == user.id).all()
    ids = [s.id for s in sessions] or [NULL_ID]
    scores = db.query(SessionScore).filter(SessionScore.session_id.in_(ids)) \
        .order_by(SessionScore.created_at).all()
    trend = [{"date": str(x.created_at), "overall": x.overall_score} for x in scores]
    keys = SKILLS + ["overall_score"]
    avg = ({k: round(sum(getattr(x, k) for x in scores) / len(scores), 1) for k in keys}
           if scores else {k: 0 for k in keys})
    return {"total_sessions": len(sessions), "completed": len(scores),
            "average_scores": avg, "improvement_trend": trend}


def _student_row(db: Session, l: User) -> dict:
    sess = db.query(DebateSession).filter(DebateSession.user_id == l.id).all()
    ids = [s.id for s in sess]
    rows = db.query(SessionScore).filter(SessionScore.session_id.in_(ids or [NULL_ID])).all()
    avg_overall = round(sum(r.overall_score for r in rows) / len(rows), 1) if rows else None
    skill_avg = ({s: round(sum(getattr(r, s) for r in rows) / len(rows), 1) for s in SKILLS}
                 if rows else {})
    weakest = min(skill_avg, key=skill_avg.get) if skill_avg else None
    return {"student": l.full_name or l.email, "email": l.email, "user_id": l.id,
            "sessions": len(sess), "completed": len(rows), "avg_overall": avg_overall,
            "skills": skill_avg, "weakest_skill": weakest,
            "last_activity": max((str(s.created_at) for s in sess), default=None)}


@router.get("/coach")
def coach(user: User = Depends(require_roles("coach", "educator", "admin")),
          db: Session = Depends(get_db)):
    learners = db.query(User).filter(User.role == "learner").all()
    students = [_student_row(db, l) for l in learners]
    recent = db.query(SessionScore, DebateSession, User, DebateTopic) \
        .join(DebateSession, SessionScore.session_id == DebateSession.id) \
        .join(User, DebateSession.user_id == User.id) \
        .join(DebateTopic, DebateSession.topic_id == DebateTopic.id) \
        .order_by(SessionScore.created_at.desc()).limit(10).all()
    recent_evals = [{"student": u.full_name or u.email, "topic": t.title,
                     "score": sc.overall_score, "date": str(sc.created_at)}
                    for sc, _s, u, t in recent]
    return {"students": students, "recent_evaluations": recent_evals}


@router.get("/educator")
def educator(user: User = Depends(require_roles("educator", "admin")),
             db: Session = Depends(get_db)):
    learners = db.query(User).filter(User.role == "learner").all()
    students = [_student_row(db, l) for l in learners]
    ranked = sorted([r for r in students if r["avg_overall"] is not None],
                    key=lambda r: r["avg_overall"], reverse=True)
    all_scores = db.query(SessionScore).all()
    class_avg = ({s: round(sum(getattr(r, s) for r in all_scores) / len(all_scores), 1) for s in SKILLS}
                 if all_scores else {})
    return {"class_summary": {"total_students": len(learners),
                              "total_sessions": db.query(DebateSession).count(),
                              "class_avg_skills": class_avg},
            "rankings": ranked, "students": students}


@router.get("/admin")
def admin_stats(user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    return {"users": db.query(User).count(), "sessions": db.query(DebateSession).count(),
            "turns": db.query(SessionScore).count()}
