"""API endpoints for argument analysis and fallacy detection."""
from fastapi import APIRouter, HTTPException
from backend.schemas import (
    ArgumentAnalysisRequest, ArgumentAnalysisResponse,
    FallacyDetectionResponse, FullAnalysisResponse, ErrorResponse,
)
from backend.services import analysis_service

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post(
    "/argument",
    response_model=ArgumentAnalysisResponse,
    summary="Analyze argument strength",
    description="Evaluates an argument's claim, evidence, clarity, relevance, and logical consistency.",
    responses={500: {"model": ErrorResponse}},
)
def analyze_argument(request: ArgumentAnalysisRequest):
    try:
        result = analysis_service.analyze_argument(request.argument_text)
        return ArgumentAnalysisResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post(
    "/fallacy",
    response_model=FallacyDetectionResponse,
    summary="Detect logical fallacies",
    description="Scans an argument for 8 types of logical fallacies.",
    responses={500: {"model": ErrorResponse}},
)
def detect_fallacies(request: ArgumentAnalysisRequest):
    try:
        result = analysis_service.detect_fallacies(request.argument_text)
        return FallacyDetectionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallacy detection failed: {str(e)}")


@router.post(
    "/full",
    response_model=FullAnalysisResponse,
    summary="Full argument analysis",
    description="Run both argument analysis and fallacy detection in one call.",
    responses={500: {"model": ErrorResponse}},
)
def full_analysis(request: ArgumentAnalysisRequest):
    try:
        result = analysis_service.full_analysis(request.argument_text)
        return FullAnalysisResponse(
            argument_analysis=ArgumentAnalysisResponse(**result["argument_analysis"]),
            fallacy_detection=FallacyDetectionResponse(**result["fallacy_detection"]),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Full analysis failed: {str(e)}")
