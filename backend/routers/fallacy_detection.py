from fastapi import APIRouter, Depends
from routers.auth import get_current_user
from services.ai_engine import ai_engine_service, FALLACY_PATTERNS
import models

router = APIRouter(prefix="/api/v1/fallacy-detection", tags=["Logical Fallacy Detection Engine"])

@router.get("/supported-fallacies")
def get_supported_fallacies(current_user: models.User = Depends(get_current_user)):
    return [{"name": name, "explanation": meta["explanation"], "correction_suggestion": meta["correction"]} for name, meta in FALLACY_PATTERNS.items()]

@router.post("/audit")
def audit_fallacies(speech_text: str, current_user: models.User = Depends(get_current_user)):
    res = ai_engine_service.analyze_argument(speech_text)
    return {"text": speech_text, "fallacies_detected_count": len(res["fallacies"]), "fallacies": res["fallacies"], "logical_consistency_score": res["logical_consistency"]}
