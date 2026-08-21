import re
from typing import Any, Dict


FILLER_PHRASES = (
    "you know",
    "i mean",
    "basically",
    "actually",
    "literally",
    "like",
    "um",
    "uh",
    "so",
)


class SpeechEngine:
    def analyze_speech(self, text: str, audio_duration_seconds: float = 60.0) -> Dict[str, Any]:
        text = " ".join(text.split())
        if not text:
            raise ValueError("Speech text cannot be empty.")
        if audio_duration_seconds <= 0:
            raise ValueError("Audio duration must be greater than zero.")

        words = re.findall(r"\b[\w']+\b", text.lower())
        total_words = len(words)
        duration_minutes = max(0.1, audio_duration_seconds / 60.0)
        wpm = round(total_words / duration_minutes, 1)

        filler_counts: Dict[str, int] = {}
        remaining_text = text.lower()
        for phrase in FILLER_PHRASES:
            matches = re.findall(rf"(?<!\w){re.escape(phrase)}(?!\w)", remaining_text)
            if matches:
                filler_counts[phrase] = len(matches)
                remaining_text = re.sub(rf"(?<!\w){re.escape(phrase)}(?!\w)", " ", remaining_text)
        total_fillers = sum(filler_counts.values())
        filler_str = ", ".join(f"{phrase}:{count}" for phrase, count in filler_counts.items()) or "None"

        if 130 <= wpm <= 160:
            pace_score = 95.0
        elif 110 <= wpm < 130 or 160 < wpm <= 180:
            pace_score = 80.0
        else:
            pace_score = 65.0

        filler_density = (total_fillers / max(1, total_words)) * 100
        confidence_score = max(30.0, min(99.0, 95.0 - filler_density * 8.0))
        sentence_count = max(1, len(re.findall(r"[.!?]+", text)))
        average_sentence_length = total_words / sentence_count
        clarity_score = max(30.0, min(99.0, pace_score * 0.45 + confidence_score * 0.45 + min(10.0, average_sentence_length / 4)))
        engagement_score = max(40.0, min(98.0, 70.0 + min(18.0, sentence_count * 2.0) + min(10.0, total_words / 40.0) - total_fillers * 1.5))

        return {
            "speech_pace_wpm": wpm,
            "filler_words_count": total_fillers,
            "filler_words_list": filler_str,
            "confidence_score": round(confidence_score, 1),
            "clarity_score": round(clarity_score, 1),
            "engagement_score": round(engagement_score, 1),
        }


speech_engine_service = SpeechEngine()
