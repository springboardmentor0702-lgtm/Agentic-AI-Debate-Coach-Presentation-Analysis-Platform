"""
Presentation Analysis Engine (spec section 7).

Takes a speech transcript (captured client-side via the browser's Web
Speech API - no paid speech-to-text service needed) plus how long the
recording lasted, and produces:

- Speech pace (WPM) and a plain-language assessment - computed in
  Python from transcript + duration, pure arithmetic, not the LLM.
- Filler word count - a conservative, exact-phrase word-boundary count
  of unambiguous filler words. Words like "so" or "actually" are
  deliberately excluded since they're legitimate most of the time;
  this count is a reliable floor, not an exhaustive filler detector.
- Confidence, clarity, and engagement scores - these genuinely need
  judgment (hedging language, structure, rhetorical technique), so
  they come from the LLM, working from the transcript text alone -
  no audio, tone, or body language is available from a text transcript.
"""
import re
from typing import Optional

from app.core.llm_client import generate_json

FILLER_WORD_VARIANTS = {
    "um": ["um", "umm", "ummm"],
    "uh": ["uh", "uhh", "uhm", "uhhh"],
    "like": ["like"],
    "you know": ["you know"],
    "i mean": ["i mean"],
    "kind of": ["kind of"],
    "sort of": ["sort of"],
}


def _build_pattern(variants: list) -> str:
    escaped = [re.escape(v) for v in variants]
    return r"\b(?:" + "|".join(escaped) + r")\b"


FILLER_PATTERNS = {label: _build_pattern(v) for label, v in FILLER_WORD_VARIANTS.items()}

SYSTEM_PROMPT = """You are an expert presentation and public-speaking \
coach. You assess a speech transcript for confidence, clarity, and \
audience engagement based on word choice, sentence structure, and \
delivery cues visible in the text - hedging language, repetition, \
structure and flow, vivid vs. flat language, rhetorical technique.

Note: you are working from a transcript only, not audio - tone of \
voice and body language aren't available to you. Base your assessment \
strictly on what's inferable from the words themselves.

Score these three criteria, each 0-10:
- confidence: how assured and decisive the language is (vs. hedging, \
qualifying, trailing off)
- clarity: how clear and well-structured the ideas are
- engagement: how likely this would hold a live audience's attention \
(varied sentence length, concrete examples, rhetorical devices, energy)

Respond with ONLY valid JSON in this exact shape - no markdown fences, \
no commentary:

{
  "scores": {"confidence": 0-10, "clarity": 0-10, "engagement": 0-10},
  "strengths": ["specific strengths in the delivery"],
  "improvements": ["specific, actionable suggestions"],
  "summary_feedback": "2-4 sentences of direct coaching feedback"
}"""


def count_filler_words(transcript: str) -> dict:
    text = transcript.lower()
    breakdown = {}
    total = 0
    for label, pattern in FILLER_PATTERNS.items():
        count = len(re.findall(pattern, text))
        if count:
            breakdown[label] = count
            total += count
    return {"total": total, "breakdown": breakdown}


def calculate_pace(transcript: str, duration_seconds: float) -> dict:
    word_count = len(transcript.split())
    wpm = round(word_count / (duration_seconds / 60), 1) if duration_seconds > 0 else 0.0

    if wpm <= 0:
        assessment = "no_data"
    elif wpm < 110:
        assessment = "slow"
    elif wpm <= 160:
        assessment = "good"
    elif wpm <= 180:
        assessment = "fast"
    else:
        assessment = "very_fast"

    return {"word_count": word_count, "wpm": wpm, "assessment": assessment}


def analyze_presentation(
    transcript: str, duration_seconds: float, topic: Optional[str] = None
) -> dict:
    pace = calculate_pace(transcript, duration_seconds)
    fillers = count_filler_words(transcript)

    topic_line = f"Topic/context: {topic}\n\n" if topic else ""
    prompt = f"{topic_line}Speech transcript:\n\n{transcript}"
    llm_result = generate_json(prompt, system=SYSTEM_PROMPT)

    raw_scores = llm_result.get("scores", {}) or {}
    scores = {
        "confidence": float(raw_scores.get("confidence", 0) or 0),
        "clarity": float(raw_scores.get("clarity", 0) or 0),
        "engagement": float(raw_scores.get("engagement", 0) or 0),
    }
    overall_score = round(sum(scores.values()) / len(scores), 2)

    return {
        "pace": pace,
        "filler_words": fillers,
        "scores": scores,
        "overall_score": overall_score,
        "strengths": llm_result.get("strengths", []),
        "improvements": llm_result.get("improvements", []),
        "summary_feedback": llm_result.get("summary_feedback", ""),
    }
