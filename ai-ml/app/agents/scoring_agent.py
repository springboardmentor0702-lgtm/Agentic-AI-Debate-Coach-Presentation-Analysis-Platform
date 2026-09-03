"""Deterministic weighted debate scoring agent."""
from app.agents.base_agent import BaseAgent


class ScoringAgent(BaseAgent):
    name = "ScoringAgent"
    role = "Calculates a bounded weighted performance score."

    def run(self, argument_quality: float, evidence_use: float, logical_consistency: float, rebuttal_effectiveness: float, communication_skills: float) -> dict:
        values = [argument_quality, evidence_use, logical_consistency, rebuttal_effectiveness, communication_skills]
        if any(value < 0 or value > 100 for value in values):
            raise ValueError("Every score component must be between 0 and 100.")
        overall = round(sum(value * weight for value, weight in zip(values, (0.30, 0.20, 0.20, 0.15, 0.15))), 1)
        return {"overall_weighted_score": overall, "components": dict(zip(("argument_quality", "evidence_use", "logical_consistency", "rebuttal_effectiveness", "communication_skills"), values))}


scoring_agent = ScoringAgent()
