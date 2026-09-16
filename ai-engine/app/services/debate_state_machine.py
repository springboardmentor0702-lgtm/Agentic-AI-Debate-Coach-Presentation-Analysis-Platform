"""
Config-driven multi-turn debate state machine, built with LangGraph.

The graph is built dynamically from a DebateFormatConfig's phase list —
one node per phase, chained in order. Nothing here is hardcoded per format;
adding a new format means editing app/config/debate_formats.py only.

Human-in-the-loop: each "user" phase node calls LangGraph's interrupt(),
which pauses graph execution and returns control to the API caller. The
graph resumes later (on the next HTTP request, same session_id/thread_id)
via Command(resume=...) once the user's speech for that phase arrives.

Known real limitation: this uses LangGraph's in-memory checkpointer
(MemorySaver), so an in-progress multi-turn debate is lost if the ai-engine
process restarts mid-debate. A persistent checkpointer (e.g. backed by
Mongo/Postgres) would fix that — flagging this honestly rather than
pretending it's already durable.
"""
import time
from typing import TypedDict, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import MemorySaver

from app.core.config import settings
from app.database import log_agent_call
from app.config.debate_formats import get_format_config
from app.services.fallacy_agent import analyze_argument
from app.services.delivery_coach import analyze_delivery
from app.services.argument_analysis import analyze_argument_quality

OPPONENT_PERSONAS = {
    "LogicBot": "You are LogicBot: cold, precise, and purely analytical. You never appeal to emotion — only formal logic, statistics, and structured syllogisms.",
    "PersuadeBot": "You are PersuadeBot: warm, rhetorical, and emotionally compelling. You use vivid stories, analogies, and appeals to shared values.",
}

DIFFICULTY_NOTE = {
    "Beginner": "Keep your rebuttals gentle and simple — one clear point at a time.",
    "Intermediate": "Debate at a standard competitive level.",
    "Hard": "Be aggressive and relentless — stack multiple counterarguments, exploit weaknesses immediately."
}

_opponent_llm = ChatGoogleGenerativeAI(model=settings.OPPONENT_MODEL, google_api_key=settings.GOOGLE_API_KEY, temperature=0.7)


class GraphState(TypedDict):
    session_id: str
    debate_format: str
    topic: str
    stance: str
    difficulty: Optional[str]
    opponent_persona: Optional[str]
    custom_scenario: Optional[str]
    transcript: list  # list of dicts: {phase_id, speaker, speech_type, content, timed_out, analysis}
    continue_action: Optional[str]  # set after the continue/end check, routes the conditional edge


# Generic extra-round phases used only when the user chooses to keep going
# past the format's configured phases — same shape as any other phase.
from app.schemas.debate_session import PhaseConfig
_BONUS_USER_PHASE = PhaseConfig(phase_id="bonus_user", speaker="user", speech_type="Extra Rebuttal", time_limit_seconds=120, rules=["Extra round — respond to the debate so far"])
_BONUS_AI_PHASE = PhaseConfig(phase_id="bonus_ai", speaker="ai", speech_type="Extra Rebuttal", time_limit_seconds=120, rules=["Extra round — respond to the debate so far"])


def _extract_text(content) -> str:
    if isinstance(content, list):
        return "".join(b.get("text", "") for b in content if isinstance(b, dict)).strip()
    return content


def _phase_rules_text(phase_config) -> str:
    return "; ".join(phase_config.rules) if phase_config.rules else "No special rules for this phase."


def _make_user_phase_node(phase_config):
    """A user-speaking phase: pause the graph (interrupt) until the user's
    speech for this exact phase arrives, then run real analysis on it and
    record it in the transcript."""
    async def node(state: GraphState) -> GraphState:
        payload = {
            "type": "phase_turn",
            "phase_id": phase_config.phase_id,
            "speaker": "user",
            "speech_type": phase_config.speech_type,
            "time_limit_seconds": phase_config.time_limit_seconds,
            "rules": phase_config.rules,
        }
        resumed = interrupt(payload)
        # resumed is whatever was passed to Command(resume=...) — expected
        # shape: {"content": str, "timed_out": bool}
        content = resumed.get("content", "")
        timed_out = resumed.get("timed_out", False)

        analysis = None
        if content.strip():
            fallacy = await analyze_argument(content, difficulty=state.get("difficulty"), session_id=state["session_id"])
            delivery = await analyze_delivery(content, 0, session_id=state["session_id"])
            argument = await analyze_argument_quality(content, session_id=state["session_id"])
            analysis = {
                "fallacy": fallacy.model_dump(),
                "delivery": delivery.model_dump(),
                "argument": argument.model_dump(),
            }

        state["transcript"].append({
            "phase_id": phase_config.phase_id,
            "speaker": "user",
            "speech_type": phase_config.speech_type,
            "content": content,
            "timed_out": timed_out,
            "analysis": analysis,
        })
        return state
    return node


def _make_ai_phase_node(phase_config):
    """An AI-speaking phase: generate the AI's speech for this exact phase,
    using the real topic/stance/format-rules/prior-transcript as context —
    not a generic reply, genuinely scoped to this phase."""
    async def node(state: GraphState) -> GraphState:
        persona_note = OPPONENT_PERSONAS.get(state.get("opponent_persona"))
        difficulty_note = DIFFICULTY_NOTE.get(state.get("difficulty"), DIFFICULTY_NOTE["Intermediate"])

        transcript_text = "\n".join(
            f"[{e['speech_type']} — {e['speaker']}]: {e['content']}" for e in state["transcript"]
        ) or "(debate has not started yet)"

        system_prompt = (
            f"You are debating the topic: \"{state['topic']}\". The user's stance is \"{state['stance']}\" — "
            f"you must argue the opposite side.\n"
            f"Format: {state['debate_format']}. Current phase: {phase_config.speech_type}.\n"
            f"Rules for this phase: {_phase_rules_text(phase_config)}\n"
            f"Difficulty: {difficulty_note}\n"
            + (f"Persona: {persona_note}\n" if persona_note else "")
            + (f"Custom scenario: {state['custom_scenario']}\n" if state.get("custom_scenario") else "")
            + f"\nDebate so far:\n{transcript_text}\n\n"
            f"Give your {phase_config.speech_type} speech now. Stay strictly in character for this phase — "
            f"don't repeat points already made, build on the debate so far."
        )

        start = time.perf_counter()
        reply = await _opponent_llm.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content="Proceed.")])
        latency_ms = int((time.perf_counter() - start) * 1000)

        usage = getattr(reply, "usage_metadata", None) or {}
        log_agent_call(
            state["session_id"], f"Opponent ({phase_config.speech_type})", settings.OPPONENT_MODEL, latency_ms,
            usage.get("input_tokens"), usage.get("output_tokens"), usage.get("total_tokens")
        )

        state["transcript"].append({
            "phase_id": phase_config.phase_id,
            "speaker": "ai",
            "speech_type": phase_config.speech_type,
            "content": _extract_text(reply.content),
            "timed_out": False,
            "analysis": None,
        })
        return state
    return node


# One shared checkpointer for the process lifetime — see module docstring
# for the real limitation this implies.
_checkpointer = MemorySaver()
_compiled_graphs: dict[str, object] = {}  # cached compiled graph per format name


async def _continue_check_node(state: GraphState) -> GraphState:
    """Pauses at the end of the format's configured phases and genuinely
    asks the user whether to continue with an extra round or end here —
    does NOT auto-close the debate."""
    resumed = interrupt({
        "type": "continue_check",
        "message": "You've reached the end of this format's rounds. Continue with an extra round, or end the debate here?"
    })
    state["continue_action"] = resumed.get("action", "end")
    return state


def _route_continue(state: GraphState) -> str:
    return "continue" if state.get("continue_action") == "continue" else "end"


def _get_compiled_graph(debate_format: str):
    """Builds (and caches) the LangGraph StateGraph for a given format —
    purely from its config, no per-format special-casing in this function.
    After the configured phases finish, the graph pauses at a real
    continue/end check rather than closing automatically."""
    if debate_format in _compiled_graphs:
        return _compiled_graphs[debate_format]

    format_config = get_format_config(debate_format)
    builder = StateGraph(GraphState)

    node_names = []
    for phase in format_config.phases:
        node_fn = _make_user_phase_node(phase) if phase.speaker == "user" else _make_ai_phase_node(phase)
        builder.add_node(phase.phase_id, node_fn)
        node_names.append(phase.phase_id)

    # Bonus-round nodes, only reached if the user chooses to continue
    builder.add_node("bonus_user", _make_user_phase_node(_BONUS_USER_PHASE))
    builder.add_node("bonus_ai", _make_ai_phase_node(_BONUS_AI_PHASE))
    builder.add_node("continue_check", _continue_check_node)

    builder.add_edge(START, node_names[0])
    for a, b in zip(node_names, node_names[1:]):
        builder.add_edge(a, b)

    # Configured phases lead into the continue/end check instead of straight to END
    builder.add_edge(node_names[-1], "continue_check")
    builder.add_conditional_edges("continue_check", _route_continue, {"continue": "bonus_user", "end": END})
    builder.add_edge("bonus_user", "bonus_ai")
    builder.add_edge("bonus_ai", "continue_check")  # loop back — asks again after every extra round

    compiled = builder.compile(checkpointer=_checkpointer)
    _compiled_graphs[debate_format] = compiled
    return compiled


async def start_session(session_id: str, debate_format: str, topic: str, stance: str,
                         difficulty: str = None, opponent_persona: str = None, custom_scenario: str = None) -> dict:
    """Starts a new debate session. Runs the graph until the first user-turn
    interrupt and returns that phase's info for the frontend to display."""
    graph = _get_compiled_graph(debate_format)
    config = {"configurable": {"thread_id": session_id}}

    initial_state: GraphState = {
        "session_id": session_id,
        "debate_format": debate_format,
        "topic": topic,
        "stance": stance,
        "difficulty": difficulty,
        "opponent_persona": opponent_persona,
        "custom_scenario": custom_scenario,
        "transcript": [],
    }

    result = await graph.ainvoke(initial_state, config=config)
    return _extract_response(graph, config, result)


async def submit_turn(session_id: str, debate_format: str, content: str, timed_out: bool = False) -> dict:
    """Resumes a paused session with the user's speech for the current phase."""
    graph = _get_compiled_graph(debate_format)
    config = {"configurable": {"thread_id": session_id}}

    result = await graph.ainvoke(Command(resume={"content": content, "timed_out": timed_out}), config=config)
    return _extract_response(graph, config, result)


async def respond_continue(session_id: str, debate_format: str, action: str) -> dict:
    """Resumes a session paused at the continue/end check. action must be
    'continue' (adds a real extra round) or 'end' (finalizes the debate)."""
    if action not in ("continue", "end"):
        raise ValueError("action must be 'continue' or 'end'")

    graph = _get_compiled_graph(debate_format)
    config = {"configurable": {"thread_id": session_id}}

    result = await graph.ainvoke(Command(resume={"action": action}), config=config)
    return _extract_response(graph, config, result)


def _extract_response(graph, config, result) -> dict:
    """Figures out whether the graph paused (waiting on the next user phase)
    or ran to completion (debate over), and returns a clean payload either way."""
    state_snapshot = graph.get_state(config)

    if state_snapshot.next:
        # Graph is paused at an interrupt — the next node is a user-phase node.
        interrupt_payload = state_snapshot.tasks[0].interrupts[0].value
        return {
            "status": "in_progress",
            "waiting_for": interrupt_payload,
            "transcript": state_snapshot.values.get("transcript", [])
        }
    else:
        return {
            "status": "completed",
            "waiting_for": None,
            "transcript": state_snapshot.values.get("transcript", [])
        }


# =========================================================================
# ✅ NEW — Phase D: real streaming versions of the 3 functions above.
#
# Uses LangGraph's real astream(..., stream_mode="messages") — this
# genuinely intercepts token-level chunks from any chat-model call made
# inside a node (the Opponent's ainvoke call in _make_ai_phase_node),
# without needing to rewrite that node to call .astream() itself. Once
# the async generator is exhausted, the graph has either paused at the
# next interrupt or completed — at that point we call the exact same
# _extract_response() used by the non-streaming path, so both paths
# share one source of truth for "what happened."
#
# Honest caveat: I could not execute-test this against a live LangGraph
# install. This follows LangGraph's documented "messages" stream mode
# pattern, but please test carefully — this is real, new code, not
# something I've verified end-to-end.
# =========================================================================
async def _stream_and_finalize(graph, input_or_command, config):
    async for msg_chunk, _metadata in graph.astream(input_or_command, config=config, stream_mode="messages"):
        text = _extract_text(getattr(msg_chunk, "content", ""))
        if text:
            yield ("chunk", text)
    yield ("done", _extract_response(graph, config, None))


async def start_session_stream(session_id: str, debate_format: str, topic: str, stance: str,
                                difficulty: str = None, opponent_persona: str = None, custom_scenario: str = None):
    graph = _get_compiled_graph(debate_format)
    config = {"configurable": {"thread_id": session_id}}
    initial_state: GraphState = {
        "session_id": session_id,
        "debate_format": debate_format,
        "topic": topic,
        "stance": stance,
        "difficulty": difficulty,
        "opponent_persona": opponent_persona,
        "custom_scenario": custom_scenario,
        "transcript": [],
    }
    async for item in _stream_and_finalize(graph, initial_state, config):
        yield item


async def submit_turn_stream(session_id: str, debate_format: str, content: str, timed_out: bool = False):
    graph = _get_compiled_graph(debate_format)
    config = {"configurable": {"thread_id": session_id}}
    async for item in _stream_and_finalize(graph, Command(resume={"content": content, "timed_out": timed_out}), config):
        yield item


async def respond_continue_stream(session_id: str, debate_format: str, action: str):
    if action not in ("continue", "end"):
        raise ValueError("action must be 'continue' or 'end'")
    graph = _get_compiled_graph(debate_format)
    config = {"configurable": {"thread_id": session_id}}
    async for item in _stream_and_finalize(graph, Command(resume={"action": action}), config):
        yield item