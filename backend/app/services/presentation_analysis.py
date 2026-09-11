import re

from .ai_client import llm_json

FILLERS = ["um", "uh", "like", "you know", "actually", "basically", "sort of", "kind of", "i mean", "so yeah"]


def analyze_presentation(transcript: str, duration_seconds=None) -> dict:
    words = len(re.findall(r"\w+", transcript))
    sents = [s for s in re.split(r"[.!?]+", transcript) if s.strip()]
    duration = duration_seconds or words / 2.2
    wpm = round(words / max(1, duration) * 60)
    low = transcript.lower()
    fillers = sum(low.count(f) for f in FILLERS)
    filler_density = fillers / max(1, words) * 100
    confidence = max(0, min(100, 90 - filler_density * 8 + (5 if wpm <= 160 else -10)))
    avg_sent = words / max(1, len(sents))
    clarity = max(0, min(100, 95 - abs(avg_sent - 17) * 3 - filler_density * 4))
    questions = transcript.count("?")
    engagement = max(0, min(100, 60 + questions * 8 + (15 if 120 <= wpm <= 160 else 0) - filler_density * 5))
    fallback = {"metrics": {"speech_pace_wpm": wpm, "word_count": words,
                "filler_word_usage": fillers, "filler_density_pct": round(filler_density, 1),
                "confidence_score": round(confidence), "clarity_score": round(clarity),
                "audience_engagement_score": round(engagement)},
        "feedback": [
            f"Speech pace: {wpm} wpm - ideal range is 130-160.",
            f"Filler words detected: {fillers} ({round(filler_density, 1)}% of words).",
            "Vary sentence length and add rhetorical questions to boost engagement."]}
    return llm_json(
        'You are a presentation analytics engine. Return ONLY JSON: {"metrics":{"speech_pace_wpm":num,'
        '"word_count":num,"filler_word_usage":num,"confidence_score":0-100,"clarity_score":0-100,'
        '"audience_engagement_score":0-100},"feedback":[str]}',
        f"Duration seconds: {duration}\nTranscript:\n{transcript}", fallback)
