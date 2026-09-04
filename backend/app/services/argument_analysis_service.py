"""
Argument Analysis Engine (spec section 4).

Extracts claims, evaluates evidence, and scores an argument across the
five criteria the spec defines: Clarity, Relevance, Evidence Strength,
Logical Consistency, Persuasiveness.

This is the first LLM-powered module, and it sets the pattern every
later engine follows (fallacy detection, counterargument generation,
coaching): a focused system prompt with a strict JSON contract, a thin
service function other code can call directly, and any arithmetic that
matters for scoring done in Python - never trusted from model output.
"""
from typing import Optional

from app.core.llm_client import generate_json

SCORING_CRITERIA = [
    "clarity",
    "relevance",
    "evidence_strength",
    "logical_consistency",
    "persuasiveness",
]

SYSTEM_PROMPT = """You are an expert debate and rhetoric analyst. You \
analyze arguments the way an experienced debate judge and writing \
coach would: precise, fair, and specific - never vague praise or \
vague criticism.

Score the argument on exactly these five criteria, each as a number \
from 0 to 10 (decimals allowed):
- clarity: how clearly and unambiguously the argument is expressed
- relevance: how directly the argument addresses the stated topic
- evidence_strength: how credible, specific, and sufficient the \
supporting evidence is (score 0 if no evidence is given at all)
- logical_consistency: whether the reasoning holds together without \
contradiction or unsupported leaps
- persuasiveness: overall rhetorical effectiveness at convincing a \
neutral audience

Respond with ONLY valid JSON matching this exact shape - no markdown \
fences, no commentary before or after:

{
  "claims": [
    {
      "claim": "the claim in the arguer's own words, condensed to one sentence",
      "type": "main or supporting",
      "evidence": ["short excerpt or paraphrase of each piece of evidence used"],
      "evidence_strength": "strong, moderate, weak, or none",
      "note": "one sentence on this specific claim's reasoning quality"
    }
  ],
  "scores": {
    "clarity": 0-10,
    "relevance": 0-10,
    "evidence_strength": 0-10,
    "logical_consistency": 0-10,
    "persuasiveness": 0-10
  },
  "strengths": ["specific, concrete strengths of this argument"],
  "weaknesses": ["specific, concrete weaknesses of this argument"],
  "summary_feedback": "2-4 sentences, written directly to the person who wrote this, in a constructive coaching tone"
}

If the text contains no discernible argument (off-topic, or just a \
bare statement with no claim), still return this exact JSON shape: \
an empty "claims" array, low scores across the board, and \
summary_feedback explaining what's missing."""


def _build_user_prompt(text: str, topic: Optional[str]) -> str:
    topic_line = f"Debate topic / motion: {topic}\n\n" if topic else ""
    return f"{topic_line}Argument to analyze:\n\n{text}"


def analyze_argument(text: str, topic: Optional[str] = None) -> dict:
    """
    Returns the parsed analysis (see SYSTEM_PROMPT for shape) plus a
    backend-computed `overall_score` - the plain average of the five
    criteria. Computed here, not trusted from the LLM, because
    Segment 7's weighted scoring engine depends on this number being
    consistent and reproducible every time.
    """
    result = generate_json(_build_user_prompt(text, topic), system=SYSTEM_PROMPT)

    raw_scores = result.get("scores", {}) or {}
    scores = {c: float(raw_scores.get(c, 0) or 0) for c in SCORING_CRITERIA}
    result["scores"] = scores
    result["overall_score"] = round(sum(scores.values()) / len(scores), 2)

    result.setdefault("claims", [])
    result.setdefault("strengths", [])
    result.setdefault("weaknesses", [])
    result.setdefault("summary_feedback", "")

    return result
