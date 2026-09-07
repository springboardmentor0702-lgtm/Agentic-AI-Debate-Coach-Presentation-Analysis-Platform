from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, ArgumentAnalysis
from ..schemas import ArgumentAnalysisRequest, ArgumentAnalysisResponse
from ..services.argument_engine import argument_engine
from .auth import get_current_user

router = APIRouter(prefix="/arguments", tags=["Argument Analysis Engine"])

@router.post("/analyze", response_model=ArgumentAnalysisResponse)
def analyze_argument(
    req: ArgumentAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analysis = argument_engine.analyze(req.text)
    
    # Optionally save to database
    if req.session_id:
        record = ArgumentAnalysis(
            session_id=req.session_id,
            turn_id=req.turn_id,
            claim=analysis["claim"],
            evidence=analysis["evidence"],
            reasoning_quality=analysis["reasoning_quality"],
            clarity_score=analysis["clarity_score"],
            relevance_score=analysis["relevance_score"],
            evidence_strength_score=analysis["evidence_strength_score"],
            logical_consistency_score=analysis["logical_consistency_score"],
            persuasiveness_score=analysis["persuasiveness_score"],
            feedback=analysis["feedback"]
        )
        db.add(record)
        db.commit()

    return analysis

@router.get("/glossary")
def get_glossary(current_user: User = Depends(get_current_user)):
    """Returns all plain-English definitions for complex debate and logic terms."""
    from ..services.glossary import get_all_glossary_terms
    return get_all_glossary_terms()

@router.post("/glossary/explain")
def explain_difficult_words(
    req: dict,
    current_user: User = Depends(get_current_user)
):
    """Finds complex debate words in submitted text and returns plain English explanations."""
    from ..services.glossary import extract_difficult_words
    text = req.get("text", "")
    return extract_difficult_words(text)

