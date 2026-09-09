"""User History & Session Records Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db, AnalysisResult, DebateSession, PerformanceRecord

router = APIRouter(
    prefix="/history",
    tags=["History"],
    responses={404: {"description": "Not found"}},
)


# ──────────────────────────────────────────────────────────────────
# Session history — paths match frontend lib/api.js exactly
# ──────────────────────────────────────────────────────────────────

@router.get("/sessions")
def get_sessions():
    """
    Get all debate sessions (from in-memory store).
    Returns: list of sessions with id, topic, status, created_at, turn_count.
    """
    try:
        from backend.services.debate_service import list_sessions
        return list_sessions()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}")
def get_session_detail(session_id: str):
    """Get full details of a single debate session including transcript."""
    try:
        from backend.services.debate_service import get_session_detail
        return get_session_detail(session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────
# Analysis history (DB-backed)
# ──────────────────────────────────────────────────────────────────

@router.get("/analyses")
def get_analysis_history(
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """Get user's analysis history from the database."""
    try:
        analyses = db.query(AnalysisResult).order_by(
            AnalysisResult.created_at.desc()
        ).offset(offset).limit(limit).all()
        return {
            "status": "success",
            "total": len(analyses),
            "analyses": [
                {
                    "id": a.id,
                    "input_text": a.input_text[:100] + "..." if len(a.input_text) > 100 else a.input_text,
                    "analysis_type": a.analysis_type,
                    "created_at": a.created_at,
                }
                for a in analyses
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debates")
def get_debate_history(
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """Get debate session history from the database."""
    try:
        sessions = db.query(DebateSession).order_by(
            DebateSession.created_at.desc()
        ).offset(offset).limit(limit).all()
        return {
            "status": "success",
            "total": len(sessions),
            "debates": [
                {
                    "id": s.id,
                    "topic": s.topic,
                    "opponent_stance": s.opponent_stance,
                    "difficulty": s.difficulty,
                    "status": s.status,
                    "created_at": s.created_at,
                }
                for s in sessions
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/{session_id}")
def get_performance_records(session_id: str, db: Session = Depends(get_db)):
    """Get performance evaluation records for a debate session."""
    try:
        records = db.query(PerformanceRecord).filter(
            PerformanceRecord.session_id == session_id
        ).all()
        if not records:
            raise HTTPException(status_code=404, detail="No performance records found for this session")
        return {
            "status": "success",
            "session_id": session_id,
            "records": [
                {
                    "id": r.id,
                    "evaluation_data": r.evaluation_data,
                    "coaching_data": r.coaching_data,
                    "learning_plan": r.learning_plan,
                    "created_at": r.created_at,
                }
                for r in records
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/analysis/{analysis_id}")
def delete_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """Delete a specific analysis record."""
    try:
        analysis = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis record not found")
        db.delete(analysis)
        db.commit()
        return {"status": "success", "message": "Analysis record deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def history_health():
    return {"status": "healthy", "module": "History & Records", "version": "1.0.0"}
