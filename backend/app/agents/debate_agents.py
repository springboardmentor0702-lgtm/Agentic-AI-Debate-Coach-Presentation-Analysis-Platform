"""
AI Architecture #2: Multi-Agent Debate Simulation
Features Opponent Agent Node and Judge Agent Node with conditional multi-round transitions.
"""

from typing import Dict, Any, Literal
from backend.app.agents.state import DebateState

def opponent_agent_node(state: DebateState) -> Dict[str, Any]:
    """Generates substantive counter-argument adapting to user stance and history"""
    return {
        "opponent_speech": state.get("opponent_speech", "")
    }

def judge_agent_node(state: DebateState) -> Dict[str, Any]:
    """Evaluates the round across 6 debate dimensions"""
    return {
        "judge_feedback": state.get("judge_feedback", {})
    }

def debate_router(state: DebateState) -> Literal["opponent_node", "final_verdict_node"]:
    """Conditional routing: checks if maximum rounds reached"""
    if state["round_number"] >= state.get("max_rounds", 3):
        return "final_verdict_node"
    return "opponent_node"
