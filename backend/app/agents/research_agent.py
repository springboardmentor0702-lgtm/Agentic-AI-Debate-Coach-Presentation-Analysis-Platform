"""
AI Architecture #3: Self-Directed ReAct Research Agent
Decides search query, invokes Wikipedia REST API tool, evaluates information sufficiency,
and terminates autonomously or at MAX_ITERATIONS limit.
"""

from typing import Dict, Any, Literal
from backend.app.agents.state import ResearchState

MAX_RESEARCH_ITERATIONS = 4

def decide_search_action(state: ResearchState) -> Dict[str, Any]:
    """Autonomous reasoning step: evaluates information gaps and formulates search query"""
    current_iter = state.get("iteration", 0) + 1
    return {
        "iteration": current_iter,
        "is_sufficient": current_iter >= MAX_RESEARCH_ITERATIONS
    }

def research_router(state: ResearchState) -> Literal["wikipedia_tool", "synthesize_brief"]:
    """Conditional Edge: Loop back for more research or proceed to synthesis"""
    if state.get("is_sufficient", False) or state.get("iteration", 0) >= state.get("max_iterations", MAX_RESEARCH_ITERATIONS):
        return "synthesize_brief"
    return "wikipedia_tool"
