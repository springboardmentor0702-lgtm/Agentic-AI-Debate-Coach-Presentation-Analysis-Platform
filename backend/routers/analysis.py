"""Argument Analysis & Fallacy Detection Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db, AnalysisResult
from backend.schemas import ArgumentRequest, AnalysisRequest, AnalysisResponse

router = APIRouter(
    prefix="/analysis",
    tags=["Analysis"],
    responses={404: {"description": "Not found"}},
)


# ──────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────

def _save_analysis(db: Session, text: str, analysis_type: str, result_data: dict) -> AnalysisResult:
    record = AnalysisResult(
        input_text=text,
        analysis_type=analysis_type,
        result_data=result_data,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ──────────────────────────────────────────────────────────────────
# Endpoints — paths match frontend lib/api.js exactly
# ──────────────────────────────────────────────────────────────────

@router.post("/argument")
def analyze_argument(
    request: ArgumentRequest,
    db: Session = Depends(get_db),
):
    """
    Analyze an argument for logical structure and strength.
    Returns: claim, evidence, strength_score, clarity_score, relevance_score, logical_consistency_score.
    """
    try:
        from backend.services.analysis_service import analyze_argument as _analyze
        result = _analyze(request.argument_text)
        _save_analysis(db, request.argument_text, "argument", result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fallacy")
def detect_fallacies(
    request: ArgumentRequest,
    db: Session = Depends(get_db),
):
    """
    Detect logical fallacies in a piece of text.
    Returns: fallacies_found list with type, excerpt, explanation, suggestion, confidence.
    """
    try:
        from backend.services.analysis_service import detect_fallacies as _detect
        result = _detect(request.argument_text)
        _save_analysis(db, request.argument_text, "fallacy", result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/full")
def full_analysis(
    request: ArgumentRequest,
    db: Session = Depends(get_db),
):
    """
    Run both argument analysis AND fallacy detection in one call.
    Returns: { argument_analysis: {...}, fallacy_detection: {...} }
    """
    try:
        from backend.services.analysis_service import full_analysis as _full
        result = _full(request.argument_text)
        _save_analysis(db, request.argument_text, "full", result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def analysis_health():
    """Check analysis module health."""
    return {"status": "healthy", "module": "Analysis Engine", "version": "1.0.0"}
