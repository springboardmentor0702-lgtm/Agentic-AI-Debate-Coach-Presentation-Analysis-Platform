"""
Human-vs-Human Debate Mode (Segment 23).

Deliberately self-contained rather than reusing the AI-mode debate
agent's internals - this needs only "judge two human-submitted
arguments," not "generate an opponent argument," so it calls
llm_client.generate() directly with its own judging prompt instead of
depending on the exact shape of the existing AI-opponent graph.

Also where the 5 named debate formats (spec: One-on-One, Parliamentary,
Oxford, Policy, Public Forum) get real distinct behavior instead of
being a label only - each format has its own suggested round time
limit (shown in the UI as a countdown, enforced nowhere server-side -
same "no infrastructure needed" principle as everywhere else in this
project) and its own judging emphasis, folded into the AI judge's
prompt so scoring actually reflects the conventions of that style.
"""
import json
from typing import Optional

from app.core import llm_client

FORMAT_CONFIG = {
    "one_on_one": {
        "label": "One-on-One",
        "round_seconds": 180,
        "rounds_target": 3,
        "judging_note": "An informal, direct exchange - value clarity and directness.",
    },
    "parliamentary": {
        "label": "Parliamentary",
        "round_seconds": 300,
        "rounds_target": 4,
        "judging_note": (
            "British Parliamentary style - value structured rebuttal, engagement "
            "with the opposing bench's points, and rhetorical composure."
        ),
    },
    "oxford": {
        "label": "Oxford",
        "round_seconds": 240,
        "rounds_target": 3,
        "judging_note": (
            "Oxford style - a formal proposition-vs-opposition debate on a fixed "
            "motion. Value direct clash with the motion and formal argumentative structure."
        ),
    },
    "policy": {
        "label": "Policy",
        "round_seconds": 480,
        "rounds_target": 4,
        "judging_note": (
            "Policy debate - value concrete evidence, causal reasoning chains, "
            "and clearly weighed real-world impacts over rhetorical style alone."
        ),
    },
    "public_forum": {
        "label": "Public Forum",
        "round_seconds": 240,
        "rounds_target": 3,
        "judging_note": (
            "Public Forum - written for a general audience. Value clear, "
            "accessible communication alongside argument strength - jargon-heavy "
            "technical arguments should not automatically outscore a clearer one."
        ),
    },
}

DEFAULT_FORMAT = "one_on_one"


def get_format_config(format_key: str) -> dict:
    return FORMAT_CONFIG.get(format_key, FORMAT_CONFIG[DEFAULT_FORMAT])


def judge_human_round(
    topic: str,
    user_position: str,
    opponent_position: str,
    user_argument: str,
    opponent_argument: str,
    format_key: str,
) -> dict:
    """
    Judges one round between two real human debaters - the
    human-vs-human counterpart to the AI mode's built-in judging,
    but built as a plain, direct LLM call rather than depending on
    the AI-opponent graph's internals, since this only needs the
    judging half of that logic.
    """
    format_note = get_format_config(format_key)["judging_note"]

    prompt = f"""You are judging one round of a debate between two human debaters.

Topic: {topic}
Format note: {format_note}

Debater A argues "{user_position}":
{user_argument}

Debater B argues "{opponent_position}":
{opponent_argument}

Judge this round on argument quality, evidence, logical consistency, and
rebuttal effectiveness - weighted according to the format note above.
Respond with ONLY a JSON object in this exact shape:
{{
  "round_winner": "user" | "opponent" | "tie",
  "user_score": <integer 0-10>,
  "opponent_score": <integer 0-10>,
  "feedback": "<2-3 sentences on how the round went>",
  "key_moment": "<the single most decisive moment or point in the round>"
}}"""

    raw = llm_client.generate(prompt, json_mode=True)
    return json.loads(raw)
