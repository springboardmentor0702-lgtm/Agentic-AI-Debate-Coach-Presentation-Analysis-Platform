from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user_optional, get_current_user
from routers.notifications import create_notification
from services.speech_engine import speech_engine_service
import models
import schemas


router = APIRouter(prefix="/api/v1/presentation-analysis", tags=["Presentation Analysis Engine"])


@router.post("/evaluate", response_model=schemas.PresentationMetricResponse)
def evaluate_presentation(
    payload: schemas.SpeechAnalysisSubmit,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    try:
        metric_data = speech_engine_service.analyze_speech(payload.speech_text, payload.audio_duration_seconds or 60.0)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    session_id = payload.session_id

    # If authenticated user, automatically persist session, metrics, scores, and notification
    if current_user is not None:
        if session_id is None:
            snippet = payload.speech_text.strip()
            topic_str = (snippet[:60] + "...") if len(snippet) > 60 else snippet
            new_session = models.DebateSession(
                user_id=current_user.id,
                title="Vocal Metrics & Speech Analysis",
                topic=topic_str or "Live Speech & Presentation Practice",
                format="Vocal Matrix",
                assigned_position="Speaker",
                status="Completed",
                scheduled_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            db.add(new_session)
            db.commit()
            db.refresh(new_session)
            session_id = new_session.id

        # Save Presentation Metric record
        metric = models.PresentationMetric(
            session_id=session_id,
            user_id=current_user.id,
            speech_pace_wpm=metric_data["speech_pace_wpm"],
            filler_words_count=metric_data["filler_words_count"],
            filler_words_list=metric_data["filler_words_list"],
            confidence_score=metric_data["confidence_score"],
            clarity_score=metric_data["clarity_score"],
            engagement_score=metric_data["engagement_score"],
            created_at=datetime.utcnow()
        )
        db.add(metric)

        # Save or update Performance Score
        overall_score = float(metric_data.get("overall_score", 85))
        perf_score = models.PerformanceScore(
            session_id=session_id,
            user_id=current_user.id,
            argument_quality=overall_score,
            evidence_use=metric_data["clarity_score"],
            logical_consistency=metric_data["confidence_score"],
            rebuttal_effectiveness=overall_score,
            communication_skills=metric_data["clarity_score"],
            overall_weighted_score=overall_score,
            created_at=datetime.utcnow()
        )
        db.add(perf_score)

        # Generate real-time Notification
        wpm = metric_data["speech_pace_wpm"]
        clarity = metric_data["clarity_score"]
        create_notification(
            db=db,
            user_id=current_user.id,
            category="Vocal Matrix",
            title="Vocal Matrix Session Completed",
            message=f"Pace: {wpm} WPM | Clarity: {clarity}% | Overall Score: {int(overall_score)}/100."
        )

        db.commit()

    return {"session_id": session_id, **metric_data}


@router.get("/history")
def get_presentation_history(
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Fetches full persistent Vocal Matrix & Speech Analysis history for the user."""
    target_user_id = current_user.id if current_user else (user_id or 1)

    metrics_records = (
        db.query(models.PresentationMetric)
        .filter(models.PresentationMetric.user_id == target_user_id)
        .order_by(models.PresentationMetric.created_at.desc())
        .all()
    )

    history_list = []
    for m in metrics_records:
        session = db.query(models.DebateSession).filter(models.DebateSession.id == m.session_id).first()
        title = session.title if session else "Vocal Metrics Session"
        topic = session.topic if session else "Speech Prosody Evaluation"
        
        # Calculate overall score estimate if not stored
        overall_score = int(round(m.confidence_score * 0.4 + m.clarity_score * 0.4 + (95 if 130 <= m.speech_pace_wpm <= 160 else 75) * 0.2))

        history_list.append({
            "id": m.id,
            "session_id": m.session_id,
            "title": title,
            "topic": topic,
            "wpm": m.speech_pace_wpm,
            "filler_words_count": m.filler_words_count,
            "filler_words_list": m.filler_words_list,
            "confidence_score": m.confidence_score,
            "clarity_score": m.clarity_score,
            "engagement_score": m.engagement_score,
            "overall_score": overall_score,
            "date": m.created_at.strftime("%Y-%m-%d %H:%M") if m.created_at else "Recent",
            "created_at": m.created_at.isoformat() if m.created_at else datetime.utcnow().isoformat()
        })

    return history_list
