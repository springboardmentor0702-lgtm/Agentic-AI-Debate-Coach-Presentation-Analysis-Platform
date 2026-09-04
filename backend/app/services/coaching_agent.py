"""
Agentic Coaching Upgrade (Segment 25).

Segment 9's Coaching Plan is a fixed pipeline: always embed the
query, always retrieve from the knowledge base, always generate.
This upgrades it into a genuine tool-calling agent - given a
learner's question, the model itself decides which of 4 bound tools
to use, in what order, however many times it needs, before producing
a final answer. This is a deliberately different agentic pattern from
Segment 24's ReAct search loop: that one always called the same kind
of tool (search) with a varying query; this one chooses BETWEEN
different kinds of tools, including one that can propose an action
(a goal), not just retrieve information.

Same "propose, don't silently act" principle as everywhere else in
this project that touches account data: the agent's goal tool
PROPOSES a goal rather than creating one directly - the learner has
to explicitly accept it (via the existing POST /goals endpoint) for
it to actually be created. An agent quietly writing to your account
without asking would be a genuinely bad surprise, not a feature.

Same self-contained principle as Segment 24's research agent: this
doesn't depend on or modify the original Segment 9 pipeline at all -
it's an entirely separate, additive code path.
"""
import json
from typing import Optional

from app.core import llm_client, supabase_client
from app.services.performance_scoring_service import compute_performance_score

MAX_ITERATIONS = 4

TOOLS = {
    "get_performance_history": {
        "description": "Get the learner's current performance score breakdown and recent score history over time.",
        "args": {},
    },
    "search_coaching_knowledge": {
        "description": "Search the coaching knowledge base for relevant, grounded advice on a specific skill or topic.",
        "args": {"query": "a specific search query, e.g. 'reducing filler words' or 'structuring rebuttals'"},
    },
    "check_active_goals": {
        "description": "See the learner's currently active goals, to avoid suggesting a duplicate and to reference existing progress.",
        "args": {},
    },
    "propose_goal": {
        "description": (
            "Propose (not create) a new goal for the learner to consider. Only use this "
            "if a specific, measurable goal genuinely fits what they need - don't propose "
            "one just to use the tool."
        ),
        "args": {
            "metric": "one of: overall_score, argument_quality, evidence_usage, logical_consistency, rebuttal_effectiveness, communication_skills",
            "target_value": "a number 0-10",
            "rationale": "one sentence on why this specific goal fits",
        },
    },
}


def _get_performance_history_tool(user_id: str) -> dict:
    current = compute_performance_score(user_id)
    snapshots = supabase_client.db_select(
        "performance_snapshots",
        params={
            "user_id": f"eq.{user_id}",
            "select": "overall_score,created_at",
            "order": "created_at.desc",
            "limit": "5",
        },
    )
    return {"current": current, "recent_history": snapshots}


def _check_active_goals_tool(user_id: str) -> list:
    return supabase_client.db_select(
        "goals",
        params={"user_id": f"eq.{user_id}", "status": "eq.active", "select": "metric,target_value,deadline"},
    )


def _propose_goal_tool(metric: str, target_value: float, rationale: str) -> dict:
    return {"metric": metric, "target_value": target_value, "rationale": rationale}


def _search_coaching_knowledge_tool(query: str) -> list:
    """
    CONFIRMED against the real coaching_service.py - reuses its own
    `_retrieve_knowledge()` directly rather than reimplementing it.

    The exact real implementation does: embed_text(query) -> convert
    via embedding_to_pg_literal() -> call the `match_coaching_knowledge`
    RPC (not `search_coaching_knowledge`, which was this file's
    earlier guess) -> graceful empty-list fallback on either step
    failing ("RAG is an enhancement, never a hard failure" - the real
    code's own words). Rather than replicate that exact sequence a
    second time and risk a subtle mismatch (the pg-literal conversion
    step in particular would have been easy to silently get wrong),
    this now just calls the real function directly - it's
    underscore-prefixed (conventionally private) but reusing the
    exact, confirmed-correct logic is worth more than style purity
    here.
    """
    from app.services.coaching_service import _retrieve_knowledge

    return _retrieve_knowledge(query, match_count=3)


def _execute_tool(tool_name: str, args: dict, user_id: str):
    if tool_name == "get_performance_history":
        return _get_performance_history_tool(user_id)
    if tool_name == "check_active_goals":
        return _check_active_goals_tool(user_id)
    if tool_name == "propose_goal":
        return _propose_goal_tool(args.get("metric"), args.get("target_value"), args.get("rationale"))
    if tool_name == "search_coaching_knowledge":
        return _search_coaching_knowledge_tool(args.get("query", ""))
    raise ValueError(f"Unknown tool: {tool_name}")


def _build_prompt(question: str, history: list) -> str:
    tools_description = "\n".join(
        f'- {name}: {meta["description"]} Args: {json.dumps(meta["args"])}'
        for name, meta in TOOLS.items()
    )
    trace_text = "\n".join(
        f"Called {h['tool']}({json.dumps(h['args'])}) -> {json.dumps(h['result'])[:400]}" for h in history
    )

    return f"""You are a debate coaching agent helping a learner who asked:
"{question}"

Available tools:
{tools_description}

Tool calls made so far ({len(history)} of up to {MAX_ITERATIONS}):
{trace_text or "(none yet)"}

Decide: call one more tool to gather what you need, or respond now if
you have enough. Don't call a tool you've already called with the same
arguments. Only propose a goal if one genuinely fits - most questions
don't need one.

Respond with ONLY a JSON object in ONE of these two shapes:
{{"action": "tool", "tool": "<tool name>", "args": {{...}}}}
{{"action": "respond", "response": "<your coaching answer>", "proposed_goal": {{"metric": "...", "target_value": ..., "rationale": "..."}} or null}}"""


def run_coaching_agent(user_id: str, question: str) -> dict:
    history = []

    for _ in range(MAX_ITERATIONS):
        raw = llm_client.generate(_build_prompt(question, history), json_mode=True)
        decision = json.loads(raw)

        if decision.get("action") == "tool":
            tool_name = decision.get("tool")
            args = decision.get("args", {})
            try:
                result = _execute_tool(tool_name, args, user_id)
            except Exception as e:  # noqa: BLE001
                result = {"error": str(e)}
            history.append({"tool": tool_name, "args": args, "result": result})
            continue

        return {
            "response": decision.get("response", ""),
            "proposed_goal": decision.get("proposed_goal"),
            "tools_used": [h["tool"] for h in history],
            "iterations": len(history),
        }

    # Safety cap reached without the model deciding to respond - force
    # a final answer using whatever was gathered, same principle as
    # Segment 24's research agent.
    forced_prompt = _build_prompt(question, history) + (
        "\n\nYou've reached the tool-call limit. Respond now with your best answer "
        "using what you've already gathered - shape: "
        '{"action": "respond", "response": "...", "proposed_goal": null}'
    )
    raw = llm_client.generate(forced_prompt, json_mode=True)
    decision = json.loads(raw)
    return {
        "response": decision.get("response", ""),
        "proposed_goal": decision.get("proposed_goal"),
        "tools_used": [h["tool"] for h in history],
        "iterations": len(history),
    }
