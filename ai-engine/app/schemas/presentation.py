from pydantic import BaseModel, Field
from typing import Optional


class PresentationMetricsSchema(BaseModel):
    # Optional: typed-mode turns have no real speaking duration, so WPM/pace
    # are None rather than fabricated. Filler word count still applies —
    # it's counted from the text itself, not from timing.
    words_per_minute: Optional[int] = Field(default=None, description="Speaking pace, words per minute. None if typed (no real duration).")
    pace_status: str = Field(description="'Too Fast', 'Too Slow', 'Optimal', or 'N/A (typed)'.")
    filler_word_count: int = Field(description="Count of filler words like 'um', 'uh', 'like'.")