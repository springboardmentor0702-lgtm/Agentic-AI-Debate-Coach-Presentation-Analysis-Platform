from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Counterargument
from ..schemas import CounterargumentRequest, CounterargumentResponse
from ..services.counterargument_engine import counterargument_engine
from .auth import get_current_user

router = APIRouter(prefix="/counterarguments", tags=["Counterargument Generation Engine"])

@router.post("/generate", response_model=CounterargumentResponse)
def generate_rebuttals(
    req: CounterargumentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = counterargument_engine.generate_counterarguments(req.text, req.context or "")

    if req.session_id:
        for reb in result.get("rebuttals", []):
            record = Counterargument(
                session_id=req.session_id,
                turn_id=req.turn_id,
                argument_type=reb["argument_type"],
                rebuttal_text=reb["rebuttal_text"],
                strategy_tip=reb.get("strategy_tip", ""),
                challenge_question=reb.get("challenge_question", "")
            )
            db.add(record)
        db.commit()

    return result
