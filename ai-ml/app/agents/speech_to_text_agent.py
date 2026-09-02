"""Speech-to-text agent backed by faster-whisper.

This module converts an audio file/path accepted by faster-whisper into a
transcript and basic transcription metadata. The model is loaded lazily so
importing the project does not download or initialize a model.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from app.agents.base_agent import BaseAgent


class SpeechToTextAgent(BaseAgent):
    name = "SpeechToTextAgent"
    role = "Converts recorded speech into a text transcript using Whisper."
    output_key = "transcription"

    def __init__(
        self,
        model_size: str | None = None,
        device: str | None = None,
        compute_type: str | None = None,
    ) -> None:
        self.model_size = model_size or os.getenv("STT_MODEL_SIZE", "small")
        self.device = device or os.getenv("STT_DEVICE", "cpu")
        self.compute_type = compute_type or os.getenv(
            "STT_COMPUTE_TYPE", "int8"
        )
        self._model: Any = None

    def _get_model(self):
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
            except ImportError as exc:
                raise RuntimeError(
                    "faster-whisper is required for SpeechToTextAgent. "
                    "Install it with: pip install faster-whisper"
                ) from exc

            self._model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
            )
        return self._model

    def run(
        self,
        audio_source: str | os.PathLike[str],
        language: str | None = None,
    ) -> dict:
        """Transcribe an audio file and return a structured result.

        Args:
            audio_source: Path to an audio/video file supported by Whisper.
            language: Optional language code such as ``en``. If omitted,
                Whisper detects the language.
        """
        if not audio_source:
            raise ValueError("audio_source must not be empty")

        path = Path(audio_source)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(f"Audio file not found: {path}")

        model = self._get_model()
        segments, info = model.transcribe(
            str(path),
            language=language,
            vad_filter=True,
        )

        segment_list = list(segments)
        transcript = " ".join(
            segment.text.strip() for segment in segment_list if segment.text.strip()
        ).strip()

        return {
            "transcript": transcript,
            "language": getattr(info, "language", language),
            "language_probability": getattr(info, "language_probability", None),
            "duration_seconds": getattr(info, "duration", None),
            "segments": [
                {
                    "start": float(segment.start),
                    "end": float(segment.end),
                    "text": segment.text.strip(),
                }
                for segment in segment_list
            ],
        }


speech_to_text_agent = SpeechToTextAgent()
