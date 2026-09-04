"""
Logical Fallacy Detection Engine (spec section 5).

Detects the eight fallacies the spec names, quotes the exact phrase
each one occurs in, explains why, and suggests a concrete rewrite -
the same building blocks a debate coach would give a student, not
just a label with no context.
"""
from typing import Optional

from app.core.llm_client import generate_json

SUPPORTED_FALLACIES = [
    "Ad Hominem",
    "Straw Man",
    "False Dilemma",
    "Slippery Slope",
    "Appeal to Authority",
    "Circular Reasoning",
    "Hasty Generalization",
    "Red Herring",
]

# Deducted from a base credibility score of 10 for every fallacy found.
# Computed in Python rather than trusted from the model - same reasoning
# as the argument analysis engine's overall_score: this number needs to
# be consistent every time the same input is scored, since Segment 7's
# weighted performance score depends on it.
CREDIBILITY_PENALTY_PER_FALLACY = 1.5

SYSTEM_PROMPT = """You are an expert in logic and rhetoric, specializing \
in detecting logical fallacies in written and spoken arguments. You are \
precise and conservative: you only flag a fallacy when the text clearly \
exhibits it, and you never invent fallacy names outside the list below.

Detect any of these eight fallacies, and ONLY these eight:

- Ad Hominem: attacking the arguer personally instead of addressing \
their argument
- Straw Man: misrepresenting or exaggerating someone's argument to \
make it easier to attack
- False Dilemma: presenting only two options or outcomes when more \
actually exist
- Slippery Slope: claiming a small first step will inevitably lead to \
a chain of extreme consequences, without justifying the chain
- Appeal to Authority: treating a claim as true mainly because an \
authority figure or source said so, especially when that authority \
isn't actually relevant expertise
- Circular Reasoning: the argument's conclusion is just a restatement \
of one of its own premises
- Hasty Generalization: drawing a broad conclusion from a small or \
unrepresentative sample of evidence
- Red Herring: introducing an unrelated point to divert attention away \
from the actual issue

For each fallacy you find, quote the exact phrase from the text where \
it occurs - never paraphrase the quote.

Respond with ONLY valid JSON in this exact shape - no markdown fences, \
no commentary before or after:

{
  "fallacies_detected": [
    {
      "fallacy_type": "one of the eight names above, exactly as written",
      "quote": "the exact phrase from the text",
      "explanation": "one to two sentences on why this specific phrase is this specific fallacy",
      "correction_suggestion": "a concrete rewrite or approach that would fix this without the fallacy"
    }
  ],
  "reasoning_analysis": "a short paragraph (2-4 sentences) assessing the overall logical soundness of the argument, independent of the fallacy list above"
}

If no fallacies are present, return an empty "fallacies_detected" array \
and a reasoning_analysis explaining that the reasoning holds up without \
any of the eight fallacies being present."""


def _build_user_prompt(text: str, topic: Optional[str]) -> str:
    topic_line = f"Debate topic / context: {topic}\n\n" if topic else ""
    return f"{topic_line}Text to check for logical fallacies:\n\n{text}"


def detect_fallacies(text: str, topic: Optional[str] = None) -> dict:
    """
    Returns the parsed detection (see SYSTEM_PROMPT for shape) plus a
    backend-computed `credibility_score`. Any fallacy label the model
    invents outside the supported list is dropped rather than shown to
    the user - a made-up fallacy name is worse than under-detecting.
    """
    result = generate_json(_build_user_prompt(text, topic), system=SYSTEM_PROMPT)

    fallacies = result.get("fallacies_detected", []) or []
    fallacies = [f for f in fallacies if f.get("fallacy_type") in SUPPORTED_FALLACIES]
    result["fallacies_detected"] = fallacies

    credibility_score = max(0.0, 10.0 - CREDIBILITY_PENALTY_PER_FALLACY * len(fallacies))
    result["credibility_score"] = round(credibility_score, 2)

    result.setdefault("reasoning_analysis", "")

    return result
