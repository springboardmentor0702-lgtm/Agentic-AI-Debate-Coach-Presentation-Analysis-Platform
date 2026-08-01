from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from services.ai_engine import ai_engine_service

router = APIRouter(prefix="/api/v1/argument-analysis", tags=["Argument Analysis Engine"])

@router.post("/evaluate", response_model=schemas.ArgumentAnalysisResponse)
def evaluate_argument(payload: schemas.ArgumentSubmit, user_id: int = 1, db: Session = Depends(get_db)):
    # 1. AI Analysis
    analysis_res = ai_engine_service.analyze_argument(payload.speech_text)
    
    # 2. Persist Argument Analysis
    new_analysis = models.ArgumentAnalysis(
        session_id=payload.session_id,
        user_id=user_id,
        raw_speech_text=payload.speech_text,
        claim_identified=analysis_res["claim_identified"],
        evidence_strength=analysis_res["evidence_strength"],
        reasoning_quality=analysis_res["reasoning_quality"],
        clarity_score=analysis_res["clarity_score"],
        relevance_score=analysis_res["relevance_score"],
        logical_consistency=analysis_res["logical_consistency"],
        persuasiveness_score=analysis_res["persuasiveness_score"]
    )
    db.add(new_analysis)
    db.commit()
    db.refresh(new_analysis)
    
    # 3. Persist Fallacy Logs
    fallacies_list = []
    for f in analysis_res["fallacies"]:
        fallacy_obj = models.FallacyLog(
            analysis_id=new_analysis.id,
            user_id=user_id,
            fallacy_type=f["fallacy_type"],
            explanation=f["explanation"],
            correction_suggestion=f["correction_suggestion"]
        )
        db.add(fallacy_obj)
        fallacies_list.append(f)
        
    # 4. Persist Counterarguments
    counter_list = []
    for c in analysis_res["counterarguments"]:
        ca_obj = models.Counterargument(
            analysis_id=new_analysis.id,
            rebuttal_type=c["rebuttal_type"],
            rebuttal_text=c["rebuttal_text"],
            challenge_question=c["challenge_question"],
            strategy_tip=c["strategy_tip"]
        )
        db.add(ca_obj)
        counter_list.append(c)

    db.commit()

    return {
        "analysis_id": new_analysis.id,
        "session_id": payload.session_id,
        "claim_identified": analysis_res["claim_identified"],
        "evidence_strength": analysis_res["evidence_strength"],
        "reasoning_quality": analysis_res["reasoning_quality"],
        "clarity_score": analysis_res["clarity_score"],
        "relevance_score": analysis_res["relevance_score"],
        "logical_consistency": analysis_res["logical_consistency"],
        "persuasiveness_score": analysis_res["persuasiveness_score"],
        "fallacies": fallacies_list,
        "counterarguments": counter_list
    }
