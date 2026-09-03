"""Generate structured, evidence-aware counterarguments."""
from app.agents.base_agent import BaseAgent


class CounterargumentAgent(BaseAgent):
    name = "CounterargumentAgent"
    role = "Produces distinct rebuttal angles for a stated proposition."

    def run(self, argument_text: str) -> dict:
        text = " ".join((argument_text or "").split())
        if not text:
            return {"claim": "", "rebuttals": []}
        claim = text.split(".")[0][:120]
        return {
            "claim": claim,
            "rebuttals": [
                {"rebuttal_type": "Logical", "rebuttal_text": f"Which premise makes '{claim}' necessarily true?", "challenge_question": "What would falsify the conclusion?", "strategy_tip": "Expose the strongest hidden assumption."},
                {"rebuttal_type": "Evidence-Based", "rebuttal_text": "The claim needs representative, verifiable evidence rather than an unsupported assertion.", "challenge_question": "Which primary source supports the central fact?", "strategy_tip": "Check source quality, sample size, and relevance."},
                {"rebuttal_type": "Practical", "rebuttal_text": "The proposal may face resource, timeline, or implementation constraints.", "challenge_question": "What is the measurable implementation plan?", "strategy_tip": "Compare costs, incentives, and unintended consequences."},
            ],
        }


counterargument_agent = CounterargumentAgent()
