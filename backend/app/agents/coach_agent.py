"""
AI Architecture #4: Tool-Calling Coaching Agent
Evaluates user question, selects from 4 diagnostic tools dynamically, executes tools,
and generates tailored coaching directive and proposed goal.
"""

from typing import Dict, Any, List
from backend.app.agents.state import CoachingAgentState

AVAILABLE_TOOLS = [
    "get_performance_history",
    "get_recent_debate_results",
    "get_presentation_analysis",
    "get_current_goals"
]

def determine_required_tools(question: str) -> List[str]:
    """Intelligently identifies which diagnostic tools are required"""
    q_lower = question.lower()
    selected = []
    
    if any(term in q_lower for term in ["present", "speech", "filler", "pace", "wpm", "delivery", "vocal"]):
        selected.append("get_presentation_analysis")
        
    if any(term in q_lower for term in ["debate", "rebuttal", "judge", "round", "opponent", "tournament"]):
        selected.append("get_recent_debate_results")
        
    if any(term in q_lower for term in ["goal", "target", "milestone", "plan"]):
        selected.append("get_current_goals")
        
    if any(term in q_lower for term in ["overall", "score", "history", "trend", "improve", "weak", "strength", "logic", "evidence"]) or len(selected) == 0:
        selected.append("get_performance_history")
        
    return selected
