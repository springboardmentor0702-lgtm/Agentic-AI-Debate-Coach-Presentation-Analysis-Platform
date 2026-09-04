"""
AI Debate Simulation + Human-vs-Human Debate Mode endpoints (spec
section 3 & 8).
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from app.core import supabase_client
from app.core.security import get_current_user
from app.services import notification_service
from app.services.debate_simulation_agent import run_debate_round
from app.services.human_debate_service import FORMAT_CONFIG, get_format_config, judge_human_round

router = APIRouter(prefix="/debates", tags=["debates"])

VALID_FORMATS = set(FORMAT_CONFIG.keys())


class CreateSessionRequest(BaseModel):
    topic: str
    format: str = "one_on_one"
    user_position: str
    scheduled_for: Optional[datetime] = None
    opponent_username: Optional[str] = None
    rounds_target: Optional[int] = None

    @field_validator("format")
    @classmethod
    def format_must_be_valid(cls, v: str) -> str:
        if v not in VALID_FORMATS:
            raise ValueError(f"format must be one of {sorted(VALID_FORMATS)}")
        return v

    @field_validator("rounds_target")
    @classmethod
    def rounds_target_in_range(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 10):
            raise ValueError("rounds_target must be between 1 and 10")
        return v


class SubmitRoundRequest(BaseModel):
    user_argument: str


class UpdateScheduleRequest(BaseModel):
    scheduled_for: Optional[datetime] = None


class RespondInviteRequest(BaseModel):
    accept: bool


@router.get("/formats")
def list_formats():
    """
    Segment 23 - exposes each format's label and suggested round time
    so the frontend doesn't need to hardcode them separately from the
    backend's actual config.
    """
    return [{"key": key, **cfg} for key, cfg in FORMAT_CONFIG.items()]


@router.post("/sessions")
def create_session(body: CreateSessionRequest, user: dict = Depends(get_current_user)):
    ai_position = "Against" if body.user_position.lower() == "for" else "For"

    data = {
        "user_id": user["profile"]["id"],
        "topic": body.topic,
        "format": body.format,
        "user_position": body.user_position,
        "ai_position": ai_position,
        "scheduled_for": body.scheduled_for.isoformat() if body.scheduled_for else None,
        "rounds_target": body.rounds_target,
    }

    if body.opponent_username:
        # Human-vs-Human mode (Segment 23) - reuses the same exact-match
        # username lookup as Segment 22's search endpoint.
        opponent_matches = supabase_client.db_select(
            "profiles",
            params={"username": f"eq.{body.opponent_username}", "select": "id,full_name"},
        )
        if not opponent_matches:
            raise HTTPException(status_code=404, detail="No user found with that username.")
        opponent = opponent_matches[0]
        if opponent["id"] == user["profile"]["id"]:
            raise HTTPException(status_code=400, detail="You can't invite yourself to debate.")

        data["mode"] = "human_vs_human"
        data["opponent_id"] = opponent["id"]
        data["invite_status"] = "pending"

        session = supabase_client.db_insert("debate_sessions", data)

        notification_service.create_notification(
            opponent["id"],
            "debate_result",
            f'{user["profile"]["full_name"]} invited you to debate',
            f'Topic: "{body.topic}" - {get_format_config(body.format)["label"]} format.',
            f"/debates/{session['id']}",
        )
        return session

    # AI Simulation mode - existing behavior, unchanged.
    data["mode"] = "ai_simulation"
    session = supabase_client.db_insert("debate_sessions", data)
    notification_service.check_first_time_milestone(user["profile"]["id"], "debate_sessions")
    return session


@router.get("/sessions")
def list_sessions(user: dict = Depends(get_current_user)):
    """
    Every session where the caller is either the creator or the
    invited opponent - a human-vs-human debate should show up in both
    participants' lists, not just the creator's.
    """
    own = supabase_client.db_select(
        "debate_sessions",
        params={"user_id": f"eq.{user['profile']['id']}", "select": "*", "order": "created_at.desc"},
    )
    as_opponent = supabase_client.db_select(
        "debate_sessions",
        params={"opponent_id": f"eq.{user['profile']['id']}", "select": "*", "order": "created_at.desc"},
    )
    combined = {s["id"]: s for s in own + as_opponent}
    return sorted(combined.values(), key=lambda s: s["created_at"], reverse=True)


@router.get("/invites")
def list_invites(user: dict = Depends(get_current_user)):
    """Pending human-vs-human invites where the caller is the invited opponent."""
    return supabase_client.db_select(
        "debate_sessions",
        params={
            "opponent_id": f"eq.{user['profile']['id']}",
            "invite_status": "eq.pending",
            "select": "*",
            "order": "created_at.desc",
        },
    )


def _get_own_session(session_id: str, user_id: str) -> dict:
    sessions = supabase_client.db_select(
        "debate_sessions",
        params={"id": f"eq.{session_id}", "select": "*"},
    )
    if not sessions:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    session = sessions[0]
    if user_id not in (session["user_id"], session.get("opponent_id")):
        raise HTTPException(status_code=404, detail="Debate session not found.")
    return session


def _tally_rounds(rounds: list) -> dict:
    """
    Live-computed round tally - never stored, same principle as every
    other derived number in this project (performance scores, etc.).
    A round only counts once it's actually been judged - an open,
    unanswered round has no judge_feedback yet and shouldn't count for
    either side.
    """
    user_wins = 0
    opponent_wins = 0
    for r in rounds:
        feedback = r.get("judge_feedback")
        if not feedback or not feedback.get("round_winner"):
            continue
        if feedback["round_winner"] == "user":
            user_wins += 1
        elif feedback["round_winner"] == "opponent":
            opponent_wins += 1
    return {"user_wins": user_wins, "opponent_wins": opponent_wins}


@router.get("/sessions/{session_id}")
def get_session(session_id: str, user: dict = Depends(get_current_user)):
    session = _get_own_session(session_id, user["profile"]["id"])
    rounds = supabase_client.db_select(
        "debate_rounds",
        params={"session_id": f"eq.{session_id}", "select": "*", "order": "round_number.asc"},
    )
    return {**session, "rounds": rounds, **_tally_rounds(rounds)}


@router.post("/sessions/{session_id}/end")
def end_session(session_id: str, user: dict = Depends(get_current_user)):
    """
    Either participant can end a debate at any point - there's no
    hard-enforced round limit (same "suggest, don't enforce" principle
    as the round timer), just a suggested target per format shown in
    the UI. Ending sets the existing `status` column to "completed" -
    no new schema needed - and, for human-vs-human debates, notifies
    both participants with the final tally, personalized correctly for
    each side.
    """
    session = _get_own_session(session_id, user["profile"]["id"])
    rounds = supabase_client.db_select(
        "debate_rounds",
        params={"session_id": f"eq.{session_id}", "select": "judge_feedback"},
    )
    tally = _tally_rounds(rounds)
    updated = supabase_client.db_update(
        "debate_sessions", {"id": session_id}, {"status": "completed"}
    )

    if session["mode"] == "human_vs_human" and session.get("opponent_id"):
        if tally["user_wins"] == tally["opponent_wins"]:
            overall_winner = "tie"
        elif tally["user_wins"] > tally["opponent_wins"]:
            overall_winner = "user"
        else:
            overall_winner = "opponent"

        for participant_id in (session["user_id"], session["opponent_id"]):
            is_creator = participant_id == session["user_id"]
            if overall_winner == "tie":
                result_text = "ended in a tie"
            elif (overall_winner == "user") == is_creator:
                result_text = "You won overall"
            else:
                result_text = "You lost overall"
            notification_service.create_notification(
                participant_id,
                "debate_result",
                "Debate ended",
                f'"{session["topic"]}" {result_text} ({tally["user_wins"]}-{tally["opponent_wins"]}).',
                f"/debates/{session_id}",
            )

    return {**updated, **tally}


@router.post("/sessions/{session_id}/respond")
def respond_to_invite(
    session_id: str, body: RespondInviteRequest, user: dict = Depends(get_current_user)
):
    """
    The invited opponent accepts or declines a human-vs-human debate
    invite. Only the invited opponent can respond - not the creator,
    not anyone else.
    """
    sessions = supabase_client.db_select(
        "debate_sessions",
        params={
            "id": f"eq.{session_id}",
            "opponent_id": f"eq.{user['profile']['id']}",
            "invite_status": "eq.pending",
            "select": "*",
        },
    )
    if not sessions:
        raise HTTPException(status_code=404, detail="No pending invite found.")
    session = sessions[0]

    new_status = "accepted" if body.accept else "declined"
    updated = supabase_client.db_update(
        "debate_sessions", {"id": session_id}, {"invite_status": new_status}
    )

    verb = "accepted" if body.accept else "declined"
    notification_service.create_notification(
        session["user_id"],
        "debate_result",
        f'{user["profile"]["full_name"]} {verb} your debate invite',
        f'"{session["topic"]}"',
        f"/debates/{session_id}",
    )
    return updated


@router.post("/sessions/{session_id}/rounds")
def submit_round(
    session_id: str, body: SubmitRoundRequest, user: dict = Depends(get_current_user)
):
    caller_id = user["profile"]["id"]
    session = _get_own_session(session_id, caller_id)

    if session["mode"] == "human_vs_human":
        return _submit_human_round(session, caller_id, body.user_argument)

    # AI Simulation mode - existing behavior, unchanged. Only the
    # session's own creator can play against the AI.
    if session["user_id"] != caller_id:
        raise HTTPException(status_code=403, detail="This isn't your debate session.")

    next_round_number = session["round_count"] + 1

    # `history` is every prior round for this session, in order - at
    # this point round `next_round_number` doesn't exist yet, so this
    # naturally returns only the rounds that came before it.
    history = supabase_client.db_select(
        "debate_rounds",
        params={"session_id": f"eq.{session_id}", "select": "*", "order": "round_number.asc"},
    )
    result = run_debate_round(
        topic=session["topic"],
        format=session["format"],
        user_position=session["user_position"],
        ai_position=session["ai_position"],
        user_argument=body.user_argument,
        history=history,
    )

    round_row = supabase_client.db_insert(
        "debate_rounds",
        {
            "session_id": session_id,
            "user_id": session["user_id"],
            "round_number": next_round_number,
            "user_argument": body.user_argument,
            "opponent_argument": result["opponent_argument"],
            "judge_feedback": result["judge_feedback"],
        },
    )
    supabase_client.db_update(
        "debate_sessions", {"id": session_id}, {"round_count": next_round_number}
    )

    feedback = result["judge_feedback"]
    winner_text = {
        "user": "You won",
        "opponent": "The opponent won",
    }.get(feedback.get("round_winner"), "It was a tie in")
    notification_service.create_notification(
        user["profile"]["id"],
        "debate_result",
        f"Round {next_round_number} result",
        f'{winner_text} round {next_round_number} of "{session["topic"]}" '
        f'({feedback.get("user_score")}-{feedback.get("opponent_score")}).',
        f"/debates/{session_id}",
    )
    return round_row


def _submit_human_round(session: dict, caller_id: str, argument_text: str) -> dict:
    """
    Turn-based, async, no websockets - like correspondence chess. The
    session's creator (`user_id`) always opens each round; the invited
    opponent always responds. Once both arguments for a round are in,
    the AI judges it immediately (via judge_human_round, completely
    independent of the AI-opponent path above) and both participants
    are notified of the result.
    """
    if session.get("invite_status") != "accepted":
        raise HTTPException(
            status_code=400, detail="This debate invite hasn't been accepted yet."
        )

    session_id = session["id"]
    next_round_number = session["round_count"] + 1
    existing = supabase_client.db_select(
        "debate_rounds",
        params={
            "session_id": f"eq.{session_id}",
            "round_number": f"eq.{next_round_number}",
            "select": "*",
        },
    )

    if not existing:
        # Opening this round - must be the creator.
        if caller_id != session["user_id"]:
            raise HTTPException(
                status_code=400,
                detail="Waiting for the debate's creator to open this round first.",
            )
        round_row = supabase_client.db_insert(
            "debate_rounds",
            {
                "session_id": session_id,
                "user_id": session["user_id"],
                "round_number": next_round_number,
                "user_argument": argument_text,
            },
        )
        notification_service.create_notification(
            session["opponent_id"],
            "debate_result",
            "Your turn to respond",
            f'Round {next_round_number} of "{session["topic"]}" is waiting on your argument.',
            f"/debates/{session_id}",
        )
        return round_row

    round_row = existing[0]
    if round_row.get("opponent_argument"):
        raise HTTPException(status_code=400, detail="This round is already complete.")
    if caller_id != session["opponent_id"]:
        raise HTTPException(
            status_code=400, detail="Waiting for your opponent to respond to this round."
        )

    judge_feedback = judge_human_round(
        topic=session["topic"],
        user_position=session["user_position"],
        opponent_position=session["ai_position"],
        user_argument=round_row["user_argument"],
        opponent_argument=argument_text,
        format_key=session["format"],
    )

    updated_round = supabase_client.db_update(
        "debate_rounds",
        {"id": round_row["id"]},
        {"opponent_argument": argument_text, "judge_feedback": judge_feedback},
    )
    supabase_client.db_update(
        "debate_sessions", {"id": session_id}, {"round_count": next_round_number}
    )

    score_text = f'({judge_feedback.get("user_score")}-{judge_feedback.get("opponent_score")})'
    winner = judge_feedback.get("round_winner")

    for participant_id in (session["user_id"], session["opponent_id"]):
        is_creator = participant_id == session["user_id"]
        if winner == "tie":
            result_text = "It was a tie in"
        elif (winner == "user") == is_creator:
            result_text = "You won"
        else:
            result_text = "You lost"
        notification_service.create_notification(
            participant_id,
            "debate_result",
            f"Round {next_round_number} result",
            f'{result_text} round {next_round_number} of "{session["topic"]}" {score_text}.',
            f"/debates/{session_id}",
        )

    return updated_round


@router.patch("/sessions/{session_id}/schedule")
def update_schedule(
    session_id: str,
    body: UpdateScheduleRequest,
    user: dict = Depends(get_current_user),
):
    session = _get_own_session(session_id, user["profile"]["id"])
    return supabase_client.db_update(
        "debate_sessions",
        {"id": session["id"]},
        {"scheduled_for": body.scheduled_for.isoformat() if body.scheduled_for else None},
    )


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    """
    Deletes the session and, via the ON DELETE CASCADE foreign key
    already defined on debate_rounds, every round that belonged to it
    too. Only the session's own creator can delete it - not the
    invited opponent, for a human-vs-human debate.
    """
    sessions = supabase_client.db_select(
        "debate_sessions",
        params={
            "id": f"eq.{session_id}",
            "user_id": f"eq.{user['profile']['id']}",
            "select": "*",
        },
    )
    if not sessions:
        raise HTTPException(status_code=404, detail="Debate session not found.")
    supabase_client.db_delete("debate_sessions", {"id": session_id})
    return {"deleted": True}
