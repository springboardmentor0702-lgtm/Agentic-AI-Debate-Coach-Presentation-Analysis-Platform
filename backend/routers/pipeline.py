"""Pipeline Router — Evaluation & Coaching"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db, AnalysisResult
from backend.schemas import EvaluateRequest, CoachingRequest, PipelineRequest, PipelineResponse

router = APIRouter(
    prefix="/pipeline",
    tags=["Pipeline"],
    responses={404: {"description": "Not found"}},
)


# ──────────────────────────────────────────────────────────────────
# Endpoints — paths match frontend lib/api.js exactly
# ──────────────────────────────────────────────────────────────────

@router.post("/evaluate")
def evaluate_debate(request: EvaluateRequest, db: Session = Depends(get_db)):
    """
    Evaluate user's debate performance from a transcript.
    Returns: scores (logic/clarity/evidence/rebuttal_quality), overall_score,
             strong_moments, weak_moments, justifications.
    """
    try:
        from backend.services.pipeline_service import evaluate_debate as _eval
        result = _eval(request.topic, request.transcript)
        # Persist evaluation
        record = AnalysisResult(
            input_text=request.topic,
            analysis_type="evaluation",
            result_data=result,
        )
        db.add(record)
        db.commit()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/coaching")
def generate_coaching(request: CoachingRequest):
    """
    Generate personalized coaching feedback and learning plan from evaluation results.
    Returns: { coaching: {...}, learning_plan: {...} }
    """
    try:
        from backend.services.pipeline_service import generate_coaching as _coach
        return _coach(request.evaluation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/full-analysis", response_model=PipelineResponse)
def run_full_analysis_pipeline(
    request: PipelineRequest,
    db: Session = Depends(get_db),
):
    """Run the complete analysis pipeline on a debate argument."""
    try:
        from backend.services.pipeline_service import generate_counterarguments
        result = generate_counterarguments("General Analysis", request.text)
        record = AnalysisResult(
            input_text=request.text,
            analysis_type="full_pipeline",
            result_data=result,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return PipelineResponse(
            pipeline_id=str(record.id),
            session_id=request.session_id or "default",
            input_text=request.text,
            analysis_results=result,
            status="success",
            message="Full analysis pipeline executed successfully",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pipeline/{pipeline_id}")
def get_pipeline_results(pipeline_id: str, db: Session = Depends(get_db)):
    """Retrieve pipeline analysis results by ID."""
    try:
        analysis = db.query(AnalysisResult).filter(
            AnalysisResult.id == int(pipeline_id)
        ).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Pipeline results not found")
        return {
            "pipeline_id": analysis.id,
            "input_text": analysis.input_text,
            "analysis_type": analysis.analysis_type,
            "result_data": analysis.result_data,
            "created_at": analysis.created_at,
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid pipeline ID format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def pipeline_health():
    return {"status": "healthy", "module": "Analysis Pipeline", "version": "1.0.0"}
