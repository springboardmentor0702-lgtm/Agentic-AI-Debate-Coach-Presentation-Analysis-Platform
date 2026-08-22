from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from services.ai_engine import ai_engine_service
import models
import schemas


router = APIRouter(prefix="/api/v1/argument-analysis", tags=["Argument Analysis Engine"])


@router.post("/evaluate", response_model=schemas.ArgumentAnalysisResponse)
def evaluate_argument(
    payload: schemas.ArgumentSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debate_session = (
        db.query(models.DebateSession)
        .filter(models.DebateSession.id == payload.session_id, models.DebateSession.user_id == current_user.id)
        .first()
    )
    if not debate_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found for this user.")

    try:
        analysis_res = ai_engine_service.analyze_argument(payload.speech_text)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    new_analysis = models.ArgumentAnalysis(
        session_id=payload.session_id,
        user_id=current_user.id,
        raw_speech_text=payload.speech_text,
        claim_identified=analysis_res["claim_identified"],
        evidence_strength=analysis_res["evidence_strength"],
        reasoning_quality=analysis_res["reasoning_quality"],
        clarity_score=analysis_res["clarity_score"],
        relevance_score=analysis_res["relevance_score"],
        logical_consistency=analysis_res["logical_consistency"],
        persuasiveness_score=analysis_res["persuasiveness_score"],
    )
    db.add(new_analysis)
    db.flush()

    fallacies_list = analysis_res["fallacies"]
    for fallacy in fallacies_list:
        db.add(
            models.FallacyLog(
                analysis_id=new_analysis.id,
                user_id=current_user.id,
                fallacy_type=fallacy["fallacy_type"],
                explanation=fallacy["explanation"],
                correction_suggestion=fallacy["correction_suggestion"],
            )
        )

    counter_list = analysis_res["counterarguments"]
    for counterargument in counter_list:
        db.add(
            models.Counterargument(
                analysis_id=new_analysis.id,
                rebuttal_type=counterargument["rebuttal_type"],
                rebuttal_text=counterargument["rebuttal_text"],
                challenge_question=counterargument["challenge_question"],
                strategy_tip=counterargument["strategy_tip"],
            )
        )

    db.commit()
    db.refresh(new_analysis)
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
        "counterarguments": counter_list,
    }
