"""Structured counterargument generation used by API routes."""

def generate_counterarguments(text: str) -> list[dict]:
    text = " ".join((text or "").split())
    if not text:
        raise ValueError("Argument text cannot be empty.")
    claim = text.split(".")[0][:120]
    return [
        {"rebuttal_type": "Logical", "rebuttal_text": f"'{claim}' may rely on an unstated assumption.", "challenge_question": "Which premise is necessary, and what would falsify it?", "strategy_tip": "Identify the strongest hidden assumption."},
        {"rebuttal_type": "Evidence-Based", "rebuttal_text": "The claim needs representative, verifiable evidence.", "challenge_question": "What primary source supports the factual claim?", "strategy_tip": "Check source quality, sample size, and relevance."},
        {"rebuttal_type": "Practical", "rebuttal_text": "The proposal may fail without a feasible implementation plan.", "challenge_question": "What resources, timeline, and success criteria are required?", "strategy_tip": "Compare alternatives, costs, and unintended consequences."},
    ]
