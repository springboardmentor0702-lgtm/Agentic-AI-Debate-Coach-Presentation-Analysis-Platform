from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import get_current_user
from services.notification_service import create_notification
import models, schemas

router = APIRouter(prefix="/api/v1/sessions", tags=["Debate Session Management"])

SUPPORTED_FORMATS = {
    "One-on-One Debate",
    "Parliamentary Debate",
    "Oxford Debate",
    "Policy Debate",
    "Public Forum Debate",
    "AI Debate Simulation",
    "AI Simulation",
}

SESSION_STATUS_ORDER = ["Draft", "Scheduled", "Live", "Completed", "Cancelled"]
SESSION_STATUS_TRANSITIONS = {
    "Active": {"Draft", "Scheduled", "Live", "Completed", "Cancelled"},
    "Draft": {"Scheduled", "Cancelled"},
    "Scheduled": {"Live", "Completed", "Cancelled", "Draft"},
    "Live": {"Completed", "Cancelled"},
    "Completed": set(),
    "Cancelled": set(),
}


class DebateConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, session_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(session_id, []).append(websocket)

    def disconnect(self, session_id: int, websocket: WebSocket):
        connections = self.active_connections.get(session_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections and session_id in self.active_connections:
            self.active_connections.pop(session_id, None)

    async def broadcast(self, session_id: int, payload: dict):
        for connection in list(self.active_connections.get(session_id, [])):
            try:
                await connection.send_json(payload)
            except Exception:
                self.disconnect(session_id, connection)


manager = DebateConnectionManager()


def _is_owner_or_admin(current_user: models.User, session: models.DebateSession) -> bool:
    return current_user.role == "Administrator" or session.user_id == current_user.id


def _normalize_status(status: str) -> str:
    if status == "Active":
        return "Scheduled"
    return status


def _validate_status_transition(current_status: str, next_status: str):
    normalized_next = _normalize_status(next_status)
    allowed = SESSION_STATUS_TRANSITIONS.get(current_status, set())
    if normalized_next not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status transition from '{current_status}' to '{next_status}'.")


def _serialize_session(session: models.DebateSession) -> dict:
    return {
        "id": session.id,
        "user_id": session.user_id,
        "title": session.title,
        "topic": session.topic,
        "description": session.description,
        "format": session.format,
        "assigned_position": session.assigned_position,
        "status": session.status,
        "scheduled_at": session.scheduled_at,
        "timezone": session.timezone,
        "duration_minutes": session.duration_minutes,
        "visibility": session.visibility,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
    }


def _serialize_participant(participant: models.DebateParticipant) -> dict:
    return {
        "id": participant.id,
        "session_id": participant.session_id,
        "user_id": participant.user_id,
        "invited_email": participant.invited_email,
        "display_name": participant.display_name,
        "position": participant.position,
        "team": participant.team,
        "participant_role": participant.participant_role,
        "is_active": participant.is_active,
        "joined_at": participant.joined_at,
        "left_at": participant.left_at,
        "created_at": participant.created_at,
        "updated_at": participant.updated_at,
    }


def _serialize_invitation(invitation: models.DebateInvitation) -> dict:
    return {
        "id": invitation.id,
        "session_id": invitation.session_id,
        "inviter_user_id": invitation.inviter_user_id,
        "invited_user_id": invitation.invited_user_id,
        "invited_email": invitation.invited_email,
        "status": invitation.status,
        "position": invitation.position,
        "team": invitation.team,
        "message": invitation.message,
        "expires_at": invitation.expires_at,
        "responded_at": invitation.responded_at,
        "created_at": invitation.created_at,
        "updated_at": invitation.updated_at,
    }


def _serialize_recording(recording: models.DebateRecording) -> dict:
    return {
        "id": recording.id,
        "session_id": recording.session_id,
        "recording_type": recording.recording_type,
        "recording_path": recording.recording_path,
        "uploaded_file_name": recording.uploaded_file_name,
        "transcript": recording.transcript,
        "duration_seconds": recording.duration_seconds,
        "created_at": recording.created_at,
    }

@router.post("/create", response_model=schemas.DebateSessionResponse)
def create_debate_session(session_data: schemas.DebateSessionCreate, user_id: int = 1, db: Session = Depends(get_db)):
    if session_data.format and session_data.format not in SUPPORTED_FORMATS:
        raise HTTPException(status_code=400, detail="Unsupported debate format.")

    session = models.DebateSession(
        user_id=user_id,
        title=session_data.title,
        topic=session_data.topic,
        description=session_data.description or "",
        format=session_data.format or "AI Simulation",
        assigned_position=session_data.assigned_position or "Affirmative",
        status="Scheduled" if session_data.scheduled_at else "Active",
        scheduled_at=session_data.scheduled_at or datetime.utcnow(),
        timezone=session_data.timezone or "UTC",
        duration_minutes=session_data.duration_minutes or 60,
        visibility=session_data.visibility or "Private",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    creator_user = db.query(models.User).filter(models.User.id == user_id).first()

    creator_participant = models.DebateParticipant(
        session_id=session.id,
        user_id=user_id,
        display_name=creator_user.full_name if creator_user else None,
        participant_role="Owner",
        position=session.assigned_position,
        team="Creator",
        is_active=True,
        joined_at=datetime.utcnow(),
    )
    db.add(creator_participant)
    db.commit()

    create_notification(
        db=db,
        user_id=user_id,
        category="Debate Session",
        title="Debate created",
        message=f"Your debate session '{session.title}' has been created.",
        related_entity_type="debate_session",
        related_entity_id=session.id,
    )
    return session

@router.get("/user/{user_id}", response_model=List[schemas.DebateSessionResponse])
def get_user_sessions(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.DebateSession).filter(models.DebateSession.user_id == user_id).all()

@router.get("/{session_id}", response_model=schemas.DebateSessionResponse)
def get_session_by_id(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    return session


@router.get("/{session_id}/details", response_model=schemas.DebateSessionDetailResponse)
def get_session_details(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    return _serialize_session(session)


@router.put("/{session_id}", response_model=schemas.DebateSessionDetailResponse)
def update_debate_session(session_id: int, session_data: schemas.DebateSessionUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    if not _is_owner_or_admin(current_user, session):
        raise HTTPException(status_code=403, detail="Only the creator can update this debate session.")

    if session_data.format and session_data.format not in SUPPORTED_FORMATS:
        raise HTTPException(status_code=400, detail="Unsupported debate format.")

    for field_name, field_value in session_data.model_dump(exclude_unset=True).items():
        setattr(session, field_name, field_value)

    if session_data.scheduled_at is not None and session.status not in {"Live", "Completed", "Cancelled"}:
        session.status = "Scheduled"

    db.add(session)
    db.commit()
    db.refresh(session)

    create_notification(
        db=db,
        user_id=session.user_id,
        category="Debate Session",
        title="Debate rescheduled",
        message=f"Your debate session '{session.title}' has been updated.",
        related_entity_type="debate_session",
        related_entity_id=session.id,
    )
    return _serialize_session(session)


@router.delete("/{session_id}")
def delete_debate_session(session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    if not _is_owner_or_admin(current_user, session):
        raise HTTPException(status_code=403, detail="Only the creator can delete this debate session.")

    db.delete(session)
    db.commit()
    return {"status": "success", "message": "Debate session deleted."}


@router.patch("/{session_id}/status", response_model=schemas.DebateSessionDetailResponse)
def update_session_status(session_id: int, payload: schemas.DebateStatusUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    if not _is_owner_or_admin(current_user, session):
        raise HTTPException(status_code=403, detail="Only the creator can change debate status.")

    next_status = _normalize_status(payload.status)
    _validate_status_transition(session.status, next_status)
    session.status = next_status
    session.updated_at = datetime.utcnow()
    db.add(session)
    db.commit()
    db.refresh(session)

    create_notification(
        db=db,
        user_id=session.user_id,
        category="Debate Session",
        title=f"Debate {next_status.lower()}",
        message=f"Your debate session '{session.title}' is now {next_status.lower()}.",
        related_entity_type="debate_session",
        related_entity_id=session.id,
    )
    try:
        import asyncio
        asyncio.run(manager.broadcast(session_id, {"event": "status_updated", "session_id": session_id, "status": next_status}))
    except Exception:
        pass
    return _serialize_session(session)


@router.post("/{session_id}/invite", response_model=schemas.DebateInvitationResponse)
def invite_participant(session_id: int, payload: schemas.DebateInvitationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    if not _is_owner_or_admin(current_user, session):
        raise HTTPException(status_code=403, detail="Only the creator can invite participants.")

    invited_user = None
    if payload.user_id:
        invited_user = db.query(models.User).filter(models.User.id == payload.user_id).first()
        if not invited_user:
            raise HTTPException(status_code=404, detail="Invited user not found.")
    elif payload.email:
        invited_user = db.query(models.User).filter(models.User.email == payload.email).first()

    invitation = models.DebateInvitation(
        session_id=session.id,
        inviter_user_id=current_user.id,
        invited_user_id=invited_user.id if invited_user else None,
        invited_email=payload.email or (invited_user.email if invited_user else None),
        status="Pending",
        position=payload.position,
        team=payload.team,
        message=payload.message,
        expires_at=payload.expires_at,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    if invited_user:
        create_notification(
            db=db,
            user_id=invited_user.id,
            category="Debate Invitation",
            title="You were invited to a debate",
            message=f"You have been invited to join '{session.title}'.",
            related_entity_type="debate_invitation",
            related_entity_id=invitation.id,
        )
    create_notification(
        db=db,
        user_id=current_user.id,
        category="Debate Invitation",
        title="Invitation sent",
        message=f"An invitation was sent for '{session.title}'.",
        related_entity_type="debate_invitation",
        related_entity_id=invitation.id,
    )
    return invitation


@router.get("/{session_id}/participants", response_model=List[schemas.DebateParticipantResponse])
def get_session_participants(session_id: int, db: Session = Depends(get_db)):
    participants = db.query(models.DebateParticipant).filter(models.DebateParticipant.session_id == session_id).all()
    return participants


@router.delete("/{session_id}/participants/{participant_id}")
def remove_session_participant(session_id: int, participant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    participant = (
        db.query(models.DebateParticipant)
        .filter(models.DebateParticipant.id == participant_id, models.DebateParticipant.session_id == session_id)
        .first()
    )
    if not session or not participant:
        raise HTTPException(status_code=404, detail="Participant not found.")
    if not _is_owner_or_admin(current_user, session):
        raise HTTPException(status_code=403, detail="Only the creator can remove participants.")

    participant.is_active = False
    participant.left_at = datetime.utcnow()
    db.add(participant)
    db.commit()
    return {"status": "success", "message": "Participant removed."}


@router.post("/{session_id}/join")
def join_session(session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    if session.status == "Cancelled":
        raise HTTPException(status_code=400, detail="Cancelled sessions cannot be joined.")

    if session.visibility != "Public" and session.user_id != current_user.id and current_user.role != "Administrator":
        invitation = (
            db.query(models.DebateInvitation)
            .filter(
                models.DebateInvitation.session_id == session_id,
                models.DebateInvitation.status == "Accepted",
            )
            .filter(
                (models.DebateInvitation.invited_user_id == current_user.id) |
                (models.DebateInvitation.invited_email == current_user.email)
            )
            .first()
        )
        if not invitation:
            raise HTTPException(status_code=403, detail="You need an invitation to join this debate session.")

    participant = (
        db.query(models.DebateParticipant)
        .filter(models.DebateParticipant.session_id == session_id, models.DebateParticipant.user_id == current_user.id)
        .first()
    )
    if not participant:
        participant = models.DebateParticipant(
            session_id=session_id,
            user_id=current_user.id,
            display_name=current_user.full_name,
            participant_role="Participant",
            is_active=True,
            joined_at=datetime.utcnow(),
        )
    else:
        participant.is_active = True
        participant.left_at = None
        participant.joined_at = participant.joined_at or datetime.utcnow()
    db.add(participant)
    db.commit()
    db.refresh(participant)

    create_notification(
        db=db,
        user_id=session.user_id,
        category="Debate Session",
        title="Participant joined",
        message=f"{current_user.full_name} joined '{session.title}'.",
        related_entity_type="debate_session",
        related_entity_id=session.id,
    )
    try:
        import asyncio
        asyncio.run(manager.broadcast(session_id, {"event": "participant_joined", "session_id": session_id, "user_id": current_user.id}))
    except Exception:
        pass
    return {"status": "success", "message": "Joined debate session."}


@router.post("/{session_id}/leave")
def leave_session(session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    participant = (
        db.query(models.DebateParticipant)
        .filter(models.DebateParticipant.session_id == session_id, models.DebateParticipant.user_id == current_user.id)
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant record not found.")

    participant.is_active = False
    participant.left_at = datetime.utcnow()
    db.add(participant)
    db.commit()

    try:
        import asyncio
        asyncio.run(manager.broadcast(session_id, {"event": "participant_left", "session_id": session_id, "user_id": current_user.id}))
    except Exception:
        pass
    return {"status": "success", "message": "Left debate session."}


@router.post("/{session_id}/recording", response_model=schemas.DebateRecordingResponse)
def create_recording(
    session_id: int,
    recording_type: str = Form("audio"),
    recording_path: Optional[str] = Form(None),
    transcript: Optional[str] = Form(None),
    duration_seconds: Optional[float] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    if not _is_owner_or_admin(current_user, session):
        raise HTTPException(status_code=403, detail="Only the creator can add recordings.")

    stored_path = recording_path
    uploaded_file_name = None
    if file is not None:
        uploads_dir = Path(__file__).resolve().parent.parent / "uploads" / "debate_recordings" / f"session_{session_id}"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        stored_file_path = uploads_dir / file.filename
        with stored_file_path.open("wb") as buffer:
            buffer.write(file.file.read())
        stored_path = str(stored_file_path)
        uploaded_file_name = file.filename

    recording = models.DebateRecording(
        session_id=session_id,
        recording_type=recording_type,
        recording_path=stored_path,
        uploaded_file_name=uploaded_file_name,
        transcript=transcript,
        duration_seconds=duration_seconds,
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)
    return recording


@router.get("/{session_id}/recordings", response_model=List[schemas.DebateRecordingResponse])
def get_session_recordings(session_id: int, db: Session = Depends(get_db)):
    return db.query(models.DebateRecording).filter(models.DebateRecording.session_id == session_id).all()


@router.get("/invitations", response_model=List[schemas.DebateInvitationResponse])
def get_my_invitations(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    invitations = (
        db.query(models.DebateInvitation)
        .filter(
            (models.DebateInvitation.invited_user_id == current_user.id) |
            (models.DebateInvitation.invited_email == current_user.email)
        )
        .order_by(models.DebateInvitation.created_at.desc())
        .all()
    )
    return invitations


@router.patch("/invitations/{invitation_id}/accept", response_model=schemas.DebateInvitationActionResponse)
def accept_invitation(invitation_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    invitation = db.query(models.DebateInvitation).filter(models.DebateInvitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")
    if invitation.status != "Pending":
        raise HTTPException(status_code=400, detail="Invitation is not pending.")
    if invitation.expires_at and invitation.expires_at < datetime.utcnow():
        invitation.status = "Expired"
        db.add(invitation)
        db.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired.")
    if invitation.invited_user_id and invitation.invited_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This invitation does not belong to the current user.")
    if invitation.invited_email and invitation.invited_email != current_user.email and not invitation.invited_user_id:
        raise HTTPException(status_code=403, detail="This invitation does not belong to the current user.")

    invitation.status = "Accepted"
    invitation.responded_at = datetime.utcnow()
    db.add(invitation)

    participant = (
        db.query(models.DebateParticipant)
        .filter(models.DebateParticipant.session_id == invitation.session_id, models.DebateParticipant.user_id == current_user.id)
        .first()
    )
    if not participant:
        participant = models.DebateParticipant(
            session_id=invitation.session_id,
            user_id=current_user.id,
            invited_email=current_user.email,
            display_name=current_user.full_name,
            position=invitation.position,
            team=invitation.team,
            participant_role="Participant",
            is_active=True,
            joined_at=datetime.utcnow(),
        )
    else:
        participant.is_active = True
        participant.position = invitation.position or participant.position
        participant.team = invitation.team or participant.team
        participant.left_at = None
    db.add(participant)
    db.commit()
    db.refresh(invitation)

    create_notification(
        db=db,
        user_id=invitation.inviter_user_id,
        category="Debate Invitation",
        title="Invitation accepted",
        message=f"{current_user.full_name} accepted your invitation.",
        related_entity_type="debate_invitation",
        related_entity_id=invitation.id,
    )
    create_notification(
        db=db,
        user_id=current_user.id,
        category="Debate Invitation",
        title="Invitation accepted",
        message=f"You accepted the invitation for session #{invitation.session_id}.",
        related_entity_type="debate_invitation",
        related_entity_id=invitation.id,
    )
    return {"status": "accepted", "invitation": invitation}


@router.patch("/invitations/{invitation_id}/decline", response_model=schemas.DebateInvitationActionResponse)
def decline_invitation(invitation_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    invitation = db.query(models.DebateInvitation).filter(models.DebateInvitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")
    if invitation.status != "Pending":
        raise HTTPException(status_code=400, detail="Invitation is not pending.")
    if invitation.invited_user_id and invitation.invited_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This invitation does not belong to the current user.")
    if invitation.invited_email and invitation.invited_email != current_user.email and not invitation.invited_user_id:
        raise HTTPException(status_code=403, detail="This invitation does not belong to the current user.")

    invitation.status = "Declined"
    invitation.responded_at = datetime.utcnow()
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    create_notification(
        db=db,
        user_id=invitation.inviter_user_id,
        category="Debate Invitation",
        title="Invitation declined",
        message=f"{current_user.full_name} declined your invitation.",
        related_entity_type="debate_invitation",
        related_entity_id=invitation.id,
    )
    return {"status": "declined", "invitation": invitation}


@router.websocket("/ws/{session_id}")
async def session_websocket(websocket: WebSocket, session_id: int):
    await manager.connect(session_id, websocket)
    try:
        await manager.broadcast(session_id, {"event": "socket_connected", "session_id": session_id})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
        await manager.broadcast(session_id, {"event": "participant_disconnected", "session_id": session_id})
