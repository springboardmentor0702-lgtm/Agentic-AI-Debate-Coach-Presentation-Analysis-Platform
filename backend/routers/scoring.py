from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from services.ai_engine import ai_engine_service

router = APIRouter(prefix="/api/v1/scoring", tags=["Performance Scoring Engine"])

@router.post("/calculate", response_model=schemas.WeightedScoreResponse)
def calculate_score(session_id: int, arg_quality: float = 85.0, evidence: float = 80.0, logic: float = 90.0, rebuttal: float = 88.0, comms: float = 82.0, user_id: int = 1, db: Session = Depends(get_db)):
    overall = ai_engine_service.calculate_weighted_score(arg_quality, evidence, logic, rebuttal, comms)
    
    score_rec = models.PerformanceScore(
        session_id=session_id,
        user_id=user_id,
        argument_quality=arg_quality,
        evidence_use=evidence,
        logical_consistency=logic,
        rebuttal_effectiveness=rebuttal,
        communication_skills=comms,
        overall_weighted_score=overall
    )
    db.add(score_rec)
    db.commit()
    db.refresh(score_rec)
    
    return {
        "session_id": session_id,
        "argument_quality": arg_quality,
        "evidence_use": evidence,
        "logical_consistency": logic,
        "rebuttal_effectiveness": rebuttal,
        "communication_skills": comms,
        "overall_weighted_score": overall
    }
