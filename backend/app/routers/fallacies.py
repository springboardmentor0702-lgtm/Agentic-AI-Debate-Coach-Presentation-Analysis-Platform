from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, FallacyDetection
from ..schemas import FallacyDetectionRequest, FallacyDetectionResponse
from ..services.fallacy_engine import fallacy_engine
from .auth import get_current_user

router = APIRouter(prefix="/fallacies", tags=["Logical Fallacy Detection Engine"])

@router.post("/detect", response_model=FallacyDetectionResponse)
def detect_fallacies(
    req: FallacyDetectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = fallacy_engine.detect_fallacies(req.text)
    
    # Optionally persist detected fallacies for the session
    if req.session_id:
        for f in result.get("detected_fallacies", []):
            record = FallacyDetection(
                session_id=req.session_id,
                turn_id=req.turn_id,
                fallacy_type=f["fallacy_type"],
                quote=f["quote"],
                explanation=f["explanation"],
                correction_suggestion=f["correction_suggestion"],
                severity=f["severity"]
            )
            db.add(record)
        db.commit()

    return result
