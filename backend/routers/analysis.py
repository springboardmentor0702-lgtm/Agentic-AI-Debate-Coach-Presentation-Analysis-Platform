"""Argument Analysis & Fallacy Detection Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db, AnalysisResult
from backend.schemas import AnalysisRequest, AnalysisResponse

router = APIRouter(
    prefix="/analysis",
    tags=["Analysis"],
    responses={404: {"description": "Not found"}},
)


@router.post("/analyze", response_model=AnalysisResponse)
def analyze_argument(
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze an argument for logical structure and fallacies.
    
    - **text**: The argument text to analyze
    - **analysis_type**: Type of analysis (argument/fallacy/both)
    """
    try:
        # Store the analysis request
        analysis_record = AnalysisResult(
            input_text=request.text,
            analysis_type=request.analysis_type,
            result_data={
                "status": "pending",
                "message": "Analysis endpoint is ready for implementation"
            }
        )
        db.add(analysis_record)
        db.commit()
        db.refresh(analysis_record)
        
        return AnalysisResponse(
            id=analysis_record.id,
            input_text=analysis_record.input_text,
            analysis_type=analysis_record.analysis_type,
            result_data=analysis_record.result_data,
            status="success"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def analysis_health():
    """Check analysis module health."""
    return {
        "status": "healthy",
        "module": "Analysis Engine",
        "version": "1.0.0"
    }
