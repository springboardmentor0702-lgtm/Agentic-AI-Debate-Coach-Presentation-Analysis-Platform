"""API endpoints for the full debate coaching pipeline."""
from fastapi import APIRouter, HTTPException
from backend.schemas import (
    CounterargumentRequest, CounterargumentResponse,
    EvaluationRequest, EvaluationResponse,
    CoachingRequest, CoachingResponse,
    FullPipelineRequest, FullPipelineResponse,
    ErrorResponse,
)
from backend.services import pipeline_service

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])


@router.post(
    "/counterargument",
    response_model=CounterargumentResponse,
    summary="Generate counterarguments",
    description="Stage 1: Extract claims, analyze argument structure, and generate counterarguments.",
    responses={500: {"model": ErrorResponse}},
)
def counterargument(request: CounterargumentRequest):
    try:
        result = pipeline_service.generate_counterarguments(request.topic, request.user_argument)
        return CounterargumentResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Counterargument generation failed: {str(e)}")


@router.post(
    "/evaluate",
    response_model=EvaluationResponse,
    summary="Evaluate debate performance",
    description="Stage 3: Score the user's debate performance on logic, clarity, evidence, and rebuttal quality.",
    responses={500: {"model": ErrorResponse}},
)
def evaluate(request: EvaluationRequest):
    try:
        transcript_dicts = [{"role": t.role, "text": t.text} for t in request.transcript]
        result = pipeline_service.evaluate_debate(request.topic, transcript_dicts)
        return EvaluationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.post(
    "/coaching",
    response_model=CoachingResponse,
    summary="Generate coaching feedback",
    description="Stages 4+5: Generate personalized coaching feedback and a learning plan.",
    responses={500: {"model": ErrorResponse}},
)
def coaching(request: CoachingRequest):
    try:
        result = pipeline_service.generate_coaching(request.evaluation)
        return CoachingResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Coaching generation failed: {str(e)}")


@router.post(
    "/full",
    response_model=FullPipelineResponse,
    summary="Run full pipeline",
    description="Run the complete 5-stage debate coaching pipeline end-to-end.",
    responses={500: {"model": ErrorResponse}},
)
def full_pipeline(request: FullPipelineRequest):
    try:
        result = pipeline_service.run_full_pipeline(
            topic=request.topic,
            user_argument=request.user_argument,
            opponent_stance=request.opponent_stance,
            user_turns=request.user_turns,
            difficulty=request.difficulty,
        )
        return FullPipelineResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Full pipeline failed: {str(e)}")
