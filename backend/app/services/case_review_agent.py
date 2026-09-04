"""
Agentic Orchestration Layer (Segment 5).

A LangGraph agent that treats the three existing engines - argument
analysis, fallacy detection, counterargument generation - as tools it
can call, decides which ones are worth running on a given submission,
and synthesizes their outputs into one prioritized coaching summary.

This is the "Agentic Orchestration" box from the architecture diagram,
sitting on top of the "Microservices Layer" (arguments.py, fallacies.py,
counterarguments.py) without changing any of it - those services are
called exactly the way the frontend calls them, just from a graph node
instead of an HTTP request.

Segment 6's debate simulation is where LangGraph's Postgres checkpointer
(real persisted "memory") gets used - a one-shot case review like this
doesn't need multi-turn memory, so it's kept out here deliberately.
"""
from typing import List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from app.core.llm_client import generate, generate_json
from app.services.argument_analysis_service import analyze_argument
from app.services.counterargument_service import generate_counterarguments
from app.services.fallacy_detection_service import detect_fallacies

VALID_TOOLS = {"argument_analysis", "fallacy_detection", "counterarguments"}

PLAN_SYSTEM_PROMPT = """You are an orchestration planner for a debate \
coaching system. Given a piece of text, decide which analysis tools are \
worth running on it.

Available tools:
- argument_analysis: scores clarity, relevance, evidence strength, \
logical consistency, persuasiveness
- fallacy_detection: detects logical fallacies and rates credibility
- counterarguments: generates rebuttals and challenge questions an \
opponent would raise

For a normal debate argument or speech, run all three - a full case \
review needs all of them. Only skip a tool if the text is clearly too \
short or trivial for that specific analysis to be meaningful (e.g. \
skip counterarguments if the text isn't actually making a claim).

Respond with ONLY valid JSON:
{
  "tools_to_run": ["argument_analysis", "fallacy_detection", "counterarguments"],
  "reasoning": "one sentence on why these tools"
}"""

SYNTHESIS_SYSTEM_PROMPT = """You are a debate coach synthesizing several \
separate analyses of the same argument into one clear, prioritized \
action plan for the person who wrote it. Be specific and concise - \
3 to 5 sentences. Lead with the single most important thing to fix, \
then what's already working well."""


class CaseReviewState(TypedDict, total=False):
    input_text: str
    topic: Optional[str]
    tools_to_run: List[str]
    argument_analysis: Optional[dict]
    fallacy_detection: Optional[dict]
    counterarguments: Optional[dict]
    synthesis: str


def _plan_node(state: CaseReviewState) -> dict:
    result = generate_json(
        f"Text to review:\n\n{state['input_text']}", system=PLAN_SYSTEM_PROMPT
    )
    tools = result.get("tools_to_run") or []
    tools = [t for t in tools if t in VALID_TOOLS]
    if not tools:
        tools = list(VALID_TOOLS)
    return {"tools_to_run": tools}


def _argument_analysis_node(state: CaseReviewState) -> dict:
    if "argument_analysis" not in state.get("tools_to_run", []):
        return {}
    return {"argument_analysis": analyze_argument(state["input_text"], state.get("topic"))}


def _fallacy_detection_node(state: CaseReviewState) -> dict:
    if "fallacy_detection" not in state.get("tools_to_run", []):
        return {}
    return {"fallacy_detection": detect_fallacies(state["input_text"], state.get("topic"))}


def _counterarguments_node(state: CaseReviewState) -> dict:
    if "counterarguments" not in state.get("tools_to_run", []):
        return {}
    return {
        "counterarguments": generate_counterarguments(state["input_text"], state.get("topic"))
    }


def _synthesize_node(state: CaseReviewState) -> dict:
    parts = []

    aa = state.get("argument_analysis")
    if aa:
        parts.append(
            f"Argument analysis: overall score {aa['overall_score']}/10. {aa['summary_feedback']}"
        )

    fd = state.get("fallacy_detection")
    if fd:
        count = len(fd["fallacies_detected"])
        parts.append(
            f"Fallacy check: {count} fallac{'y' if count == 1 else 'ies'} found, "
            f"credibility {fd['credibility_score']}/10."
        )

    ca = state.get("counterarguments")
    if ca:
        count = len(ca["counterarguments"])
        parts.append(f"{count} counterargument(s) generated for this position.")

    if not parts:
        return {"synthesis": "No tools were run against this text - it may be too short or off-topic to analyze."}

    combined = "\n".join(parts)
    synthesis = generate(
        f"Separate analysis results:\n\n{combined}\n\nWrite the prioritized coaching summary.",
        system=SYNTHESIS_SYSTEM_PROMPT,
    )
    return {"synthesis": synthesis}


_compiled_graph = None


def _get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        graph = StateGraph(CaseReviewState)
        graph.add_node("plan", _plan_node)
        graph.add_node("argument_analysis", _argument_analysis_node)
        graph.add_node("fallacy_detection", _fallacy_detection_node)
        graph.add_node("counterarguments", _counterarguments_node)
        graph.add_node("synthesize", _synthesize_node)

        graph.add_edge(START, "plan")
        graph.add_edge("plan", "argument_analysis")
        graph.add_edge("plan", "fallacy_detection")
        graph.add_edge("plan", "counterarguments")
        graph.add_edge("argument_analysis", "synthesize")
        graph.add_edge("fallacy_detection", "synthesize")
        graph.add_edge("counterarguments", "synthesize")
        graph.add_edge("synthesize", END)

        _compiled_graph = graph.compile()
    return _compiled_graph


def run_case_review(text: str, topic: Optional[str] = None) -> dict:
    """
    Runs the full plan -> tools -> synthesize graph and returns the
    final state: which tools ran, each tool's full result, and the
    synthesized coaching summary.
    """
    graph = _get_graph()
    return graph.invoke({"input_text": text, "topic": topic, "tools_to_run": []})
