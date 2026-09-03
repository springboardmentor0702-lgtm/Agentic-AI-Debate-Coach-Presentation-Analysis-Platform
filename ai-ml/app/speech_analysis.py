"""Transcript speech metrics; audio transcription can be plugged in separately."""
import re
def analyze_speech(text: str, audio_duration_seconds: float = 60.0) -> dict:
    text = " ".join((text or "").split())
    if not text or audio_duration_seconds <= 0:
        raise ValueError("Speech text and a positive duration are required.")
    words = re.findall(r"\b[\w']+\b", text.lower())
    fillers = [word for word in words if word in {"um", "uh", "like", "basically", "actually"}]
    wpm = round(len(words) / max(0.1, audio_duration_seconds / 60), 1)
    filler_density = len(fillers) / max(1, len(words))
    confidence = round(max(30.0, min(99.0, 95 - filler_density * 800)), 1)
    return {"speech_pace_wpm": wpm, "filler_words_count": len(fillers), "filler_words_list": ", ".join(sorted(set(fillers))) or "None", "confidence_score": confidence, "clarity_score": confidence, "engagement_score": round(max(40.0, min(98.0, 70 + min(20, len(words) / 5) - len(fillers))), 1)}
