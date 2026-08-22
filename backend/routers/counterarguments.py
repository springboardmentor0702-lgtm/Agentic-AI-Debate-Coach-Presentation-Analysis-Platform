from fastapi import APIRouter
from services.ai_engine import ai_engine_service

router = APIRouter(prefix="/api/v1/counterarguments", tags=["Counterargument Generation Engine"])

@router.post("/generate")
def generate_counterarguments(speech_text: str):
    res = ai_engine_service.analyze_argument(speech_text)
    return {
        "claim": res["claim_identified"],
        "rebuttal_types_count": len(res["counterarguments"]),
        "rebuttals": res["counterarguments"]
    }
