from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas
from services.ai_engine import ai_engine_service, FALLACY_PATTERNS

router = APIRouter(prefix="/api/v1/fallacy-detection", tags=["Logical Fallacy Detection Engine"])

@router.get("/supported-fallacies")
def get_supported_fallacies():
    return [
        {
            "name": name,
            "explanation": meta["explanation"],
            "correction_suggestion": meta["correction"]
        }
        for name, meta in FALLACY_PATTERNS.items()
    ]

@router.post("/audit")
def audit_fallacies(speech_text: str):
    res = ai_engine_service.analyze_argument(speech_text)
    return {
        "text": speech_text,
        "fallacies_detected_count": len(res["fallacies"]),
        "fallacies": res["fallacies"],
        "logical_consistency_score": res["logical_consistency"]
    }
