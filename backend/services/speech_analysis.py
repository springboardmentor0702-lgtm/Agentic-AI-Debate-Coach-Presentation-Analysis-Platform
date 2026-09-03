"""Public speech-analysis service boundary."""
from services.speech_engine import speech_engine_service


def analyze_speech(text: str, audio_duration_seconds: float = 60.0) -> dict:
    return speech_engine_service.analyze_speech(text, audio_duration_seconds)
