from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
import json
from services.ai_engine import ai_engine_service

router = APIRouter(prefix="/api/v1/counterarguments", tags=["Counterargument Generation Engine"])

@router.post("/generate")
def generate_counterarguments(payload: schemas.ArgumentSubmit, user_id: int = 1, db: Session = Depends(get_db)):
    # Analyze the argument
    res = ai_engine_service.analyze_argument(payload.speech_text)
    
    # Save argument analysis to database
    new_analysis = models.ArgumentAnalysis(
        session_id=payload.session_id,
        user_id=user_id,
        raw_speech_text=payload.speech_text,
        claim_identified=res["claim_identified"],
        evidence_strength=res["evidence_strength"],
        reasoning_quality=res["reasoning_quality"],
        clarity_score=res["clarity_score"],
        relevance_score=res["relevance_score"],
        logical_consistency=res["logical_consistency"],
        persuasiveness_score=res["persuasiveness_score"]
    )
    
    db.add(new_analysis)
    db.commit()
    db.refresh(new_analysis)
    
    # Save fallacies to database
    for fallacy in res["fallacies"]:
        new_fallacy = models.FallacyLog(
            analysis_id=new_analysis.id,
            user_id=user_id,
            fallacy_type=fallacy["fallacy_type"],
            explanation=fallacy["explanation"],
            correction_suggestion=fallacy["correction_suggestion"]
        )
        db.add(new_fallacy)
    
    # Save counterarguments to database
    for counterarg in res["counterarguments"]:
        new_counterarg = models.Counterargument(
            analysis_id=new_analysis.id,
            rebuttal_type=counterarg["rebuttal_type"],
            rebuttal_text=counterarg["rebuttal_text"],
            challenge_question=counterarg["challenge_question"],
            strategy_tip=counterarg["strategy_tip"]
        )
        db.add(new_counterarg)
    
    db.commit()
    
    return {
        "analysis_id": new_analysis.id,
        "claim": res["claim_identified"],
        "evidence_strength": res["evidence_strength"],
        "reasoning_quality": res["reasoning_quality"],
        "logical_consistency": res["logical_consistency"],
        "rebuttal_types_count": len(res["counterarguments"]),
        "rebuttals": res["counterarguments"],
        "fallacies_detected": res["fallacies"]
    }

@router.get("/analysis/{analysis_id}")
def get_counterarguments(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.query(models.ArgumentAnalysis).filter(
        models.ArgumentAnalysis.id == analysis_id
    ).first()
    
    if not analysis:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    counterarguments = db.query(models.Counterargument).filter(
        models.Counterargument.analysis_id == analysis_id
    ).all()
    
    return {
        "analysis_id": analysis.id,
        "claim_identified": analysis.claim_identified,
        "counterarguments": [
            {
                "rebuttal_type": ca.rebuttal_type,
                "rebuttal_text": ca.rebuttal_text,
                "challenge_question": ca.challenge_question,
                "strategy_tip": ca.strategy_tip
            }
            for ca in counterarguments
        ]
    }

@router.get("/types")
def get_counterargument_types():
    return {
        "types": [
            {
                "name": "Logical",
                "description": "Challenges the logical structure and assumptions of the argument",
                "example": "Your premise assumes a linear causal relationship that ignores external variables"
            },
            {
                "name": "Evidence-Based",
                "description": "Uses empirical data and studies to counter claims",
                "example": "Recent studies contradict this stance by showing counter-correlation"
            },
            {
                "name": "Ethical",
                "description": "Frames the argument from a moral or normative perspective",
                "example": "This policy disproportionately burdens underrepresented stakeholders"
            },
            {
                "name": "Practical",
                "description": "Focuses on feasibility, implementation challenges, and operational friction",
                "example": "Implementation faces severe operational bottlenecks and fiscal overruns"
            },
            {
                "name": "Policy",
                "description": "Proposes alternative regulatory frameworks or policy solutions",
                "example": "Alternative frameworks achieve identical objectives with lower risk"
            }
        ]
    }
