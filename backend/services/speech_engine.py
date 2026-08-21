import json
import re
import subprocess
from pathlib import Path
from typing import Any, Dict

import numpy as np

try:
    from config import settings
except ImportError:  # pragma: no cover - supports isolated service imports.
    settings = None


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

    def transcribe_audio(self, audio_path: str | Path) -> str:
        """Transcribe audio only when explicitly enabled; return empty text on failure."""
        if settings is None or settings.TRANSCRIPTION_PROVIDER not in {"openai", "openai-compatible", "llm"}:
            return ""
        try:
            from openai import OpenAI

            client_kwargs = {}
            if settings.OPENAI_API_KEY:
                client_kwargs["api_key"] = settings.OPENAI_API_KEY
            if settings.OPENAI_API_BASE:
                client_kwargs["base_url"] = settings.OPENAI_API_BASE
            client = OpenAI(**client_kwargs, timeout=settings.AI_REQUEST_TIMEOUT_SECONDS)
            with Path(audio_path).open("rb") as audio_handle:
                response = client.audio.transcriptions.create(model=settings.TRANSCRIPTION_MODEL, file=audio_handle, response_format="text")
            text = response if isinstance(response, str) else getattr(response, "text", "")
            return " ".join(str(text).split())
        except Exception:
            return ""

    def analyze_audio(self, audio_path: str | Path, transcript: str = "") -> Dict[str, Any]:
        """Extract measurable prosody signals from common audio formats.

        Transcription remains optional: when supplied, transcript metrics are combined
        with measured duration; otherwise the response still reports real audio signals.
        """
        path = Path(audio_path)
        if not path.exists() or path.stat().st_size == 0:
            raise ValueError("Audio file is missing or empty.")
        try:
            probe = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
                check=True,
                capture_output=True,
                text=True,
                timeout=15,
            )
            duration = float(json.loads(probe.stdout)["format"]["duration"])
            pcm = subprocess.run(
                ["ffmpeg", "-v", "error", "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", "16000", "pipe:1"],
                check=True,
                capture_output=True,
                timeout=30,
            ).stdout
        except (subprocess.SubprocessError, KeyError, ValueError, json.JSONDecodeError) as exc:
            raise ValueError("Audio could not be decoded. Use a valid WAV, MP3, M4A, or WebM file.") from exc
        if duration <= 0 or not pcm:
            raise ValueError("Audio duration must be greater than zero.")

        samples = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
        frame_size = 1600  # 100 ms at 16 kHz
        frame_count = max(1, len(samples) // frame_size)
        trimmed = samples[: frame_count * frame_size]
        frames = trimmed.reshape(frame_count, frame_size)
        rms = np.sqrt(np.mean(np.square(frames), axis=1))
        threshold = max(0.008, float(np.percentile(rms, 25)) * 1.5)
        silent = rms < threshold
        silence_ratio = float(np.mean(silent))
        pause_count = 0
        run = 0
        for is_silent in silent:
            if is_silent:
                run += 1
            elif run >= 3:
                pause_count += 1
                run = 0
            else:
                run = 0
        if run >= 3:
            pause_count += 1
        average_volume = float(np.mean(np.abs(samples)))
        audio_metrics = {
            "duration_seconds": round(duration, 2),
            "pause_count": pause_count,
            "silence_ratio_percent": round(silence_ratio * 100, 1),
            "average_volume_percent": round(min(100.0, average_volume * 150.0), 1),
        }
        if transcript.strip():
            audio_metrics.update(self.analyze_speech(transcript, duration))
        else:
            audio_metrics.update({
                "speech_pace_wpm": 0.0,
                "filler_words_count": 0,
                "filler_words_list": "Transcript not supplied",
                "confidence_score": round(max(30.0, min(99.0, 92.0 - silence_ratio * 35.0)), 1),
                "clarity_score": round(max(30.0, min(99.0, 90.0 - silence_ratio * 30.0)), 1),
                "engagement_score": round(max(40.0, min(98.0, 78.0 + min(12.0, average_volume * 80.0) - pause_count * 1.5)), 1),
            })
        return audio_metrics


speech_engine_service = SpeechEngine()
