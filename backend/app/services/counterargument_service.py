"""
Counterargument Generation Engine (spec section 6).

Given an argument, generates the material a sharp opponent would
actually use against it: typed rebuttals across the five categories
the spec defines, pointed challenge questions, alternative framings of
the issue, and concrete debate strategy tips.
"""
from typing import Optional

from app.core.llm_client import generate_json

SUPPORTED_COUNTERARGUMENT_TYPES = [
    "Logical Rebuttal",
    "Evidence-Based Rebuttal",
    "Ethical Counterargument",
    "Practical Counterargument",
    "Policy Counterargument",
]

SYSTEM_PROMPT = """You are an expert debate strategist playing devil's \
advocate. Given an argument, you generate the strongest counterarguments \
and strategic material a sharp, well-prepared opponent would actually \
raise against it - never weak straw-man rebuttals.

Generate counterarguments using exactly these five types, using each \
type only where a genuinely strong counterargument of that kind exists \
(skipping a type is fine; including at least one counterargument \
overall is required):

- Logical Rebuttal: challenges the argument's internal reasoning or \
logical structure
- Evidence-Based Rebuttal: challenges or contradicts the evidence or \
facts used
- Ethical Counterargument: raises a moral or values-based objection
- Practical Counterargument: challenges the argument on grounds of \
feasibility, cost, or real-world implementation
- Policy Counterargument: challenges the argument on grounds of \
precedent, unintended consequences, or policy trade-offs

Respond with ONLY valid JSON in this exact shape - no markdown fences, \
no commentary before or after:

{
  "counterarguments": [
    {
      "type": "one of the five type names above, exactly as written",
      "counterargument": "the counterargument itself, written the way a debater would actually say it",
      "rationale": "one sentence on why this specific counterargument is effective against the original"
    }
  ],
  "challenge_questions": ["a pointed question that would put the original arguer on the spot"],
  "alternative_perspectives": ["a genuinely different way to frame or view the same issue"],
  "strategy_suggestions": ["a concrete strategic tip for someone arguing against this position"]
}"""


def _build_user_prompt(text: str, topic: Optional[str]) -> str:
    topic_line = f"Debate topic / motion: {topic}\n\n" if topic else ""
    return f"{topic_line}Argument to generate counterarguments against:\n\n{text}"


def generate_counterarguments(text: str, topic: Optional[str] = None) -> dict:
    """
    Returns the parsed result (see SYSTEM_PROMPT for shape). Any
    counterargument the model labels outside the five supported types
    is dropped, same defensive pattern as the fallacy detection engine -
    an invented category is worse than one fewer counterargument.
    """
    result = generate_json(_build_user_prompt(text, topic), system=SYSTEM_PROMPT)

    counterarguments = result.get("counterarguments", []) or []
    counterarguments = [
        c for c in counterarguments if c.get("type") in SUPPORTED_COUNTERARGUMENT_TYPES
    ]
    result["counterarguments"] = counterarguments

    result.setdefault("challenge_questions", [])
    result.setdefault("alternative_perspectives", [])
    result.setdefault("strategy_suggestions", [])

    return result
