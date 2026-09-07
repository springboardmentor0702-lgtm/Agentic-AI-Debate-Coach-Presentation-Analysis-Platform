import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, PresentationAnalysis
from ..schemas import PresentationAnalysisRequest, PresentationAnalysisResponse
from ..services.speech_engine import speech_engine
from .auth import get_current_user

router = APIRouter(prefix="/presentation", tags=["Presentation Analysis Engine"])

@router.post("/analyze", response_model=PresentationAnalysisResponse)
def analyze_presentation(
    req: PresentationAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = speech_engine.analyze(req.transcript, req.duration_seconds)
    
    # Save to database
    record = PresentationAnalysis(
        user_id=current_user.id,
        title=req.title,
        transcript=req.transcript,
        duration_seconds=req.duration_seconds,
        speech_pace_wpm=result["speech_pace_wpm"],
        filler_words_count=result["filler_words_count"],
        filler_words_breakdown=json.dumps(result["filler_words_breakdown"]),
        confidence_score=result["confidence_score"],
        clarity_score=result["clarity_score"],
        engagement_score=result["engagement_score"],
        feedback=result["feedback"]
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    result["id"] = record.id
    result["title"] = record.title
    result["created_at"] = record.created_at
    return result

@router.get("/history", response_model=List[PresentationAnalysisResponse])
def get_presentation_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(PresentationAnalysis)
    if current_user.role == "Learner":
        query = query.filter(PresentationAnalysis.user_id == current_user.id)
    
    records = query.order_by(PresentationAnalysis.created_at.desc()).all()
    results = []
    for r in records:
        overall = (r.confidence_score * 0.35) + (r.clarity_score * 0.35) + (r.engagement_score * 0.30)
        results.append({
            "id": r.id,
            "title": r.title,
            "transcript": r.transcript,
            "duration_seconds": r.duration_seconds,
            "speech_pace_wpm": r.speech_pace_wpm,
            "pace_status": "Optimal" if 135 <= r.speech_pace_wpm <= 165 else "Reviewed",
            "filler_words_count": r.filler_words_count,
            "filler_words_breakdown": json.loads(r.filler_words_breakdown) if r.filler_words_breakdown else {},
            "confidence_score": r.confidence_score,
            "clarity_score": r.clarity_score,
            "engagement_score": r.engagement_score,
            "overall_presentation_score": round(overall, 1),
            "feedback": r.feedback,
            "created_at": r.created_at
        })
    return results
