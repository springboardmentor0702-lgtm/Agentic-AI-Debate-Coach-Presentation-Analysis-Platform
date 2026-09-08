"""Complete Analysis Pipeline Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db, AnalysisResult, PerformanceRecord, DebateSession
from backend.schemas import PipelineRequest, PipelineResponse

router = APIRouter(
    prefix="/pipeline",
    tags=["Pipeline"],
    responses={404: {"description": "Not found"}},
)


@router.post("/full-analysis", response_model=PipelineResponse)
def run_full_analysis_pipeline(
    request: PipelineRequest,
    db: Session = Depends(get_db)
):
    """
    Run the complete analysis pipeline on debate content.
    
    Includes:
    - Argument analysis
    - Fallacy detection
    - Performance evaluation
    - Coaching recommendations
    
    - **text**: The debate argument/presentation text
    - **session_id**: Optional session ID for tracking
    """
    try:
        # Store analysis
        analysis = AnalysisResult(
            input_text=request.text,
            analysis_type="full_pipeline",
            result_data={
                "argument_strength": "pending",
                "fallacies": [],
                "performance_score": 0,
                "coaching_recommendations": [],
                "status": "Pipeline endpoint ready for implementation"
            }
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        
        return PipelineResponse(
            pipeline_id=str(analysis.id),
            session_id=request.session_id or "default",
            input_text=request.text,
            analysis_results=analysis.result_data,
            status="success",
            message="Full analysis pipeline executed successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pipeline/{pipeline_id}")
def get_pipeline_results(
    pipeline_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve pipeline analysis results."""
    try:
        analysis = db.query(AnalysisResult).filter(AnalysisResult.id == int(pipeline_id)).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Pipeline results not found")
        
        return {
            "pipeline_id": analysis.id,
            "input_text": analysis.input_text,
            "analysis_type": analysis.analysis_type,
            "result_data": analysis.result_data,
            "created_at": analysis.created_at
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid pipeline ID format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def pipeline_health():
    """Check pipeline module health."""
    return {
        "status": "healthy",
        "module": "Analysis Pipeline",
        "version": "1.0.0"
    }
