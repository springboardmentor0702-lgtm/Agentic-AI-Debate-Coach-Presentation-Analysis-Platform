from fastapi import APIRouter, Depends
from routers.auth import get_current_user
from services.ai_engine import ai_engine_service
import models

router = APIRouter(prefix="/api/v1/counterarguments", tags=["Counterargument Generation Engine"])

@router.post("/generate")
def generate_counterarguments(speech_text: str, current_user: models.User = Depends(get_current_user)):
    res = ai_engine_service.analyze_argument(speech_text)
    return {"claim": res["claim_identified"], "rebuttal_types_count": len(res["counterarguments"]), "rebuttals": res["counterarguments"]}
