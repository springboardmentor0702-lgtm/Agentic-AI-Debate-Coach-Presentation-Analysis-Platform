from datetime import datetime, timezone

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import DebateMessage, DebateSession
from app.schemas.debate import DebateCreate, DebateMessageCreate, DebateMessageHistoryItem, DebateMessageResponse, DebateOut, DebateUpdate
from app.services.groq import analyze_argument_text, generate_debate_response, is_valid_debate_message, transcribe_audio

router = APIRouter(prefix="/debates", tags=["debates"])


@router.post("", response_model=DebateOut)
def create_debate(payload: DebateCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> DebateOut:
    debate = DebateSession(
        user_id=current_user.id,
        title=payload.title,
        topic=payload.topic,
        format=payload.format,
        user_position=payload.user_position,
        ai_position=payload.ai_position,
        status="CREATED",
    )
    db.add(debate)
    db.commit()
    db.refresh(debate)
    return DebateOut.model_validate(debate)


@router.get("", response_model=list[DebateOut])
def list_debates(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[DebateOut]:
    debates = db.query(DebateSession).filter(DebateSession.user_id == current_user.id).order_by(DebateSession.created_at.desc()).all()
    return [DebateOut.model_validate(item) for item in debates]


@router.get("/{debate_id}", response_model=DebateOut)
def get_debate(debate_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> DebateOut:
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id, DebateSession.user_id == current_user.id).first()
    if not debate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate not found")
    return DebateOut.model_validate(debate)


@router.get("/{debate_id}/messages", response_model=list[DebateMessageHistoryItem])
def get_debate_messages(
    debate_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[DebateMessageHistoryItem]:
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id, DebateSession.user_id == current_user.id).first()
    if not debate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate not found")
    messages = db.query(DebateMessage).filter(DebateMessage.debate_session_id == debate.id).order_by(DebateMessage.created_at, DebateMessage.id).all()
    return [DebateMessageHistoryItem.model_validate(message) for message in messages]


@router.put("/{debate_id}", response_model=DebateOut)
def update_debate(debate_id: int, payload: DebateUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> DebateOut:
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id, DebateSession.user_id == current_user.id).first()
    if not debate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(debate, field, value)
    db.commit()
    db.refresh(debate)
    return DebateOut.model_validate(debate)


@router.delete("/{debate_id}")
def delete_debate(debate_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> dict:
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id, DebateSession.user_id == current_user.id).first()
    if not debate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate not found")
    db.delete(debate)
    db.commit()
    return {"message": "Debate deleted successfully"}


@router.post("/{debate_id}/message", response_model=DebateMessageResponse)
def send_message(
    debate_id: int,
    payload: DebateMessageCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> DebateMessageResponse:
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id, DebateSession.user_id == current_user.id).first()
    if not debate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate not found")

    user_message = DebateMessage(debate_session_id=debate.id, sender="USER", message=payload.message)
    db.add(user_message)
    history = db.query(DebateMessage).filter(DebateMessage.debate_session_id == debate.id).order_by(DebateMessage.created_at).all()

    if not payload.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    if not is_valid_debate_message(payload.message):
        ai_response = (
            f"Please stay on the debate subject: {debate.topic}. "
            "Don't talk out of the debate subject so we can talk about the debate you have given."
        )
        argument_analysis = {
            "claims_detected": [],
            "argument_strength": 0,
            "clarity_score": 0,
            "relevance_score": 0,
            "evidence_strength": 0,
            "logical_consistency": 0,
            "persuasiveness": 0,
        }
        fallacies = []
        counterarguments = []
        coaching_tip = ""
    else:
        ai_response = generate_debate_response(
            topic=debate.topic,
            position=debate.ai_position,
            messages=[{"sender": item.sender, "message": item.message} for item in history] + [{"sender": "USER", "message": payload.message}],
        )
        argument_analysis = analyze_argument_text(payload.message, debate.topic)
        fallacies = []
        counterarguments = [{
            "type": "LOGICAL_REBUTTAL",
            "main_counterargument": "Your argument needs stronger evidence and a clearer link to the topic.",
            "supporting_points": ["Use specific examples", "Address the strongest counterargument", "Explain the practical impact"],
        }]
        coaching_tip = argument_analysis["improvement_suggestions"][0] if argument_analysis["improvement_suggestions"] else "Keep your evidence precise and directly tied to your claim."

    debate.status = "ACTIVE"
    db.add(DebateMessage(debate_session_id=debate.id, sender="AI", message=ai_response))
    db.commit()

    return DebateMessageResponse(
        ai_response=ai_response,
        argument_analysis=argument_analysis,
        fallacies=fallacies,
        counterarguments=counterarguments,
        coaching_tip=coaching_tip,
    )


@router.post("/{debate_id}/complete", response_model=DebateMessageResponse)
def complete_debate(
    debate_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> DebateMessageResponse:
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id, DebateSession.user_id == current_user.id).first()
    if not debate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate not found")

    history = db.query(DebateMessage).filter(DebateMessage.debate_session_id == debate.id).order_by(DebateMessage.created_at).all()
    debate.status = "COMPLETED"
    debate.completed_at = datetime.now(timezone.utc)

    user_messages = [message.message for message in history if message.sender == "USER"]
    final_text = " ".join(user_messages) if user_messages else debate.topic
    final_analysis = analyze_argument_text(final_text, debate.topic)
    final_summary = (
        f"Debate complete. Based on your discussion on {debate.topic}, "
        f"your strongest point was {final_analysis['strengths'][0].lower() if final_analysis['strengths'] else 'your clear claim'} "
        f"and your best improvement is to {final_analysis['improvement_suggestions'][0].lower() if final_analysis['improvement_suggestions'] else 'make your evidence more direct and specific'}."
    )
    db.add(DebateMessage(debate_session_id=debate.id, sender="AI", message=final_summary))
    db.commit()

    return DebateMessageResponse(
        ai_response=final_summary,
        argument_analysis=final_analysis,
        fallacies=[],
        counterarguments=[{
            "type": "FINAL_FEEDBACK",
            "main_counterargument": "Your overall performance is strongest when you connect evidence directly to the topic and answer objections clearly.",
            "supporting_points": ["Use concrete evidence", "Stay on-topic", "Answer the strongest objection"],
        }],
        coaching_tip="Keep your debate evidence specific, stay focused on the topic, and clearly answer the strongest counterargument.",
    )


@router.post("/{debate_id}/voice-message", response_model=DebateMessageResponse)
def send_voice_message(
    debate_id: int,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> DebateMessageResponse:
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id, DebateSession.user_id == current_user.id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")
    try:
        transcript = transcribe_audio(audio.file.read(), audio.filename or "voice.webm", audio.content_type)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Speech-to-text service is unavailable") from exc
    result = send_message(debate_id, DebateMessageCreate(message=transcript), db, current_user)
    result.transcript = transcript
    return result
