from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from faster_whisper import WhisperModel


class SpeechToTextAgent:
    """Lazy-loaded local Whisper STT agent for audio/video files."""

    def __init__(self) -> None:
        self.model_size = os.getenv("STT_MODEL_SIZE", "small")
        self.device = os.getenv("STT_DEVICE", "cpu")
        self.compute_type = os.getenv("STT_COMPUTE_TYPE", "int8")
        self._model: Optional[WhisperModel] = None

    def _get_model(self) -> WhisperModel:
        if self._model is None:
            self._model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
            )
        return self._model

    def run(self, audio_source: str | Path, language: str | None = None) -> str:
        path = Path(audio_source)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {path}")
        segments, _info = self._get_model().transcribe(
            str(path), language=language, vad_filter=True, beam_size=5
        )
        return " ".join(segment.text.strip() for segment in segments if segment.text.strip()).strip()
