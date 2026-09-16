import math
import re
from typing import Optional
from app.schemas.presentation import PresentationMetricsSchema

FILLER_WORDS = ["um", "uh", "uhh", "like", "you know", "actually", "basically", "literally"]


def compute_presentation_metrics(transcript: str, duration_sec: Optional[float] = None) -> PresentationMetricsSchema:
    """
    duration_sec=None means this is a TYPED turn — no real speaking time
    exists, so WPM/pace are honestly reported as not applicable rather
    than invented. Filler word count is still computed either way, since
    that's counted from the words themselves, not from timing.
    """
    lowered = transcript.lower()
    filler_count = sum(len(re.findall(rf"\b{re.escape(w)}\b", lowered)) for w in FILLER_WORDS)

    if duration_sec is None or duration_sec <= 0:
        return PresentationMetricsSchema(
            words_per_minute=None,
            pace_status="N/A (typed)",
            filler_word_count=filler_count
        )

    word_count = len(transcript.split())
    wpm = math.ceil(word_count / (duration_sec / 60.0))

    if wpm > 160:
        pace_status = "Too Fast"
    elif wpm < 110:
        pace_status = "Too Slow"
    else:
        pace_status = "Optimal"

    return PresentationMetricsSchema(words_per_minute=wpm, pace_status=pace_status, filler_word_count=filler_count)