from fastapi import APIRouter, Depends, HTTPException, status
from routers.auth import get_current_user
import models, schemas
from services.ai_engine import ai_engine_service

router = APIRouter(prefix="/api/v1/counterarguments", tags=["Counterargument Generation Engine"])

@router.post("/generate")
def generate_counterarguments(payload: schemas.CounterargumentSubmit, current_user: models.User = Depends(get_current_user)):
    try:
        res = ai_engine_service.analyze_argument(payload.speech_text)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return {
        "claim": res["claim_identified"],
        "rebuttal_types_count": len(res["counterarguments"]),
        "rebuttals": res["counterarguments"]
    }
