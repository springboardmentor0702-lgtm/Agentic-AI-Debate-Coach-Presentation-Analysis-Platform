"""
Multi-Agent AI Debate Simulation (Segment 6, spec section 8).

Two distinct agents, each with their own persona and system prompt,
orchestrated as a LangGraph graph:
- Opponent: argues the AI's assigned side, aware of the full round
  history, responds directly to the user's latest argument.
- Judge: a neutral evaluator that scores the round and gives coaching
  feedback to the user.

CrewAI was evaluated for this (see SEGMENT_6_GUIDE.md) and rejected -
it pulls in chromadb, onnxruntime, tokenizers, and cryptography, the
exact dependency profile that broke pip on Windows in Segment 0.
LangGraph gives the same two-distinct-role architecture with a
dependency tree already proven clean in Segment 5.

"Memory" here is deliberately NOT LangGraph's checkpointer feature -
that needs a Postgres driver (psycopg), another compiled dependency.
Instead, the caller (debates.py router) fetches prior rounds from
Supabase via the same REST wrapper every other feature uses, and
passes them in as plain history. Same practical result, zero new
dependencies.
"""
from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from app.core.llm_client import generate, generate_json

OPPONENT_SYSTEM_TEMPLATE = """You are an AI debate opponent. You are \
arguing the "{ai_position}" side of this motion: "{topic}"

Debate format: {format}

You are skilled, sharp, and genuinely persuasive - never a pushover, \
never a strawman for the human to easily beat. Directly engage with \
their specific argument each round: rebut their strongest point, \
don't just restate your own position. Stay in character as a debater, \
not an assistant - no meta-commentary, no "as an AI". Keep each \
response focused, around 3-5 sentences, matching real debate pacing.

Respond with ONLY the argument itself, no labels or preamble."""

JUDGE_SYSTEM_PROMPT = """You are a neutral, experienced debate judge. \
You evaluate a single round of a debate between a human and an AI \
opponent, and you are fair to both sides - you are not on the human's \
side just because they're the one being coached.

Respond with ONLY valid JSON in this exact shape - no markdown fences, \
no commentary:

{
  "round_winner": "user, opponent, or tie",
  "user_score": 0-10,
  "opponent_score": 0-10,
  "feedback": "2-3 sentences of direct, specific coaching feedback for the human debater - what worked, what to improve next round",
  "key_moment": "one sentence naming the single most decisive moment of this round, from either side"
}"""


class DebateRoundState(TypedDict, total=False):
    topic: str
    format: str
    user_position: str
    ai_position: str
    history: List[Dict[str, Any]]
    user_argument: str
    opponent_argument: str
    judge_feedback: dict


def _format_history(history: List[Dict[str, Any]]) -> str:
    if not history:
        return "This is the first round - no prior history."
    lines = []
    for h in history:
        lines.append(f"Round {h['round_number']}:")
        lines.append(f"  Human: {h['user_argument']}")
        lines.append(f"  Opponent: {h['opponent_argument']}")
    return "\n".join(lines)


def _opponent_node(state: DebateRoundState) -> dict:
    system = OPPONENT_SYSTEM_TEMPLATE.format(
        ai_position=state["ai_position"], topic=state["topic"], format=state["format"]
    )
    prompt = (
        f"Debate history so far:\n{_format_history(state.get('history', []))}\n\n"
        f"The human's argument this round:\n{state['user_argument']}\n\n"
        f"Respond as the opponent."
    )
    response = generate(prompt, system=system)
    return {"opponent_argument": response}


def _judge_node(state: DebateRoundState) -> dict:
    prompt = (
        f"Motion: {state['topic']}\n"
        f"Human is arguing: {state['user_position']}\n"
        f"Opponent is arguing: {state['ai_position']}\n\n"
        f"This round:\n"
        f"Human argument: {state['user_argument']}\n"
        f"Opponent argument: {state['opponent_argument']}\n\n"
        f"Evaluate this round."
    )
    feedback = generate_json(prompt, system=JUDGE_SYSTEM_PROMPT)
    feedback.setdefault("round_winner", "tie")
    feedback.setdefault("user_score", 5)
    feedback.setdefault("opponent_score", 5)
    feedback.setdefault("feedback", "")
    feedback.setdefault("key_moment", "")
    return {"judge_feedback": feedback}


_compiled_graph = None


def _get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        graph = StateGraph(DebateRoundState)
        graph.add_node("opponent", _opponent_node)
        graph.add_node("judge", _judge_node)
        graph.add_edge(START, "opponent")
        graph.add_edge("opponent", "judge")
        graph.add_edge("judge", END)
        _compiled_graph = graph.compile()
    return _compiled_graph


def run_debate_round(
    topic: str,
    format: str,
    user_position: str,
    ai_position: str,
    user_argument: str,
    history: Optional[List[Dict[str, Any]]] = None,
) -> dict:
    """
    Runs one round: Opponent responds to the user's argument, then
    Judge evaluates it. `history` is the list of prior rounds (fetched
    by the caller from Supabase) so both agents have full context.
    """
    graph = _get_graph()
    result = graph.invoke(
        {
            "topic": topic,
            "format": format,
            "user_position": user_position,
            "ai_position": ai_position,
            "user_argument": user_argument,
            "history": history or [],
        }
    )
    return {
        "opponent_argument": result["opponent_argument"],
        "judge_feedback": result["judge_feedback"],
    }
