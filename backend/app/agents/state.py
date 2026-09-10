"""
Explicit State definitions for the 4 Distinct Agentic AI Architectures in MindArena AI.
"""

from typing import TypedDict, List, Dict, Any, Optional

# 1. FIXED PIPELINE STATE
class ArgumentAnalysisState(TypedDict):
    topic: str
    argument: str
    claims: List[Dict[str, Any]]
    evidence_quality: float
    evidence_analysis: str
    logical_strength: float
    logical_structure: str
    fallacies: List[Dict[str, Any]]
    counterarguments: List[Dict[str, Any]]
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    overall_score: float

# 2. MULTI-AGENT DEBATE STATE
class DebateState(TypedDict):
    topic: str
    user_stance: str
    round_number: int
    max_rounds: int
    history: List[Dict[str, Any]]
    current_user_speech: str
    opponent_speech: Optional[str]
    judge_feedback: Optional[Dict[str, Any]]
    status: str
    final_verdict: Optional[Dict[str, Any]]

# 3. REACT RESEARCH STATE
class ResearchState(TypedDict):
    topic: str
    query_history: List[str]
    search_results: List[Dict[str, Any]]
    current_thought: str
    next_search_query: Optional[str]
    is_sufficient: bool
    iteration: int
    max_iterations: int
    sources: List[Dict[str, Any]]
    final_brief: Optional[Dict[str, Any]]

# 4. TOOL-CALLING COACHING STATE
class CoachingAgentState(TypedDict):
    question: str
    user_id: str
    available_tools: List[str]
    selected_tools: List[str]
    tool_results: Dict[str, Any]
    reasoning: str
    proposed_goal: Optional[Dict[str, Any]]
    final_recommendation: str
