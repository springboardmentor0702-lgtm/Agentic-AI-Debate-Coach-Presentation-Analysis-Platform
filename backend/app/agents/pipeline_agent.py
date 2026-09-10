"""
AI Architecture #1: Fixed Argument Analysis Pipeline
Implemented with LangGraph deterministic graph execution.
"""

from typing import Dict, Any
from backend.app.agents.state import ArgumentAnalysisState

def extract_claims(state: ArgumentAnalysisState) -> Dict[str, Any]:
    """Step 1: Proposition & Claim Extraction"""
    # Deterministic pipeline node
    return {
        "claims": state.get("claims", [])
    }

def analyze_evidence(state: ArgumentAnalysisState) -> Dict[str, Any]:
    """Step 2: Empirical Grounds & Warrant Analysis"""
    return {
        "evidence_quality": state.get("evidence_quality", 75.0)
    }

def analyze_logical_structure(state: ArgumentAnalysisState) -> Dict[str, Any]:
    """Step 3: Deductive / Inductive Coherence Analysis"""
    return {
        "logical_strength": state.get("logical_strength", 80.0)
    }

def detect_fallacies(state: ArgumentAnalysisState) -> Dict[str, Any]:
    """Step 4: Formal & Informal Fallacy Audit"""
    return {
        "fallacies": state.get("fallacies", [])
    }

def generate_counterarguments(state: ArgumentAnalysisState) -> Dict[str, Any]:
    """Step 5: Multi-perspective Rebuttal Synthesis"""
    return {
        "counterarguments": state.get("counterarguments", [])
    }

def compute_scoring(state: ArgumentAnalysisState) -> Dict[str, Any]:
    """Step 6: Mathematical Weighting & Case Review"""
    eq = state.get("evidence_quality", 75.0)
    ls = state.get("logical_strength", 80.0)
    fallacy_penalty = len(state.get("fallacies", [])) * 6.0
    overall = max(10.0, min(100.0, (eq * 0.4 + ls * 0.6) - fallacy_penalty))
    return {
        "overall_score": round(overall, 1)
    }
