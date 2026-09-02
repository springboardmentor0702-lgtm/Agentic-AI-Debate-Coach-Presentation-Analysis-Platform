from pathlib import Path

import pytest

from app.agents.speech_to_text_agent import SpeechToTextAgent


def test_stt_rejects_missing_audio():
    agent = SpeechToTextAgent()
    with pytest.raises(FileNotFoundError):
        agent.run(Path("does-not-exist.wav"))


def test_stt_transcribes_with_mocked_whisper(monkeypatch, tmp_path):
    audio = tmp_path / "sample.wav"
    audio.write_bytes(b"fake audio")

    class Segment:
        def __init__(self, start, end, text):
            self.start = start
            self.end = end
            self.text = text

    class Info:
        language = "en"
        language_probability = 0.98
        duration = 2.5

    class FakeModel:
        def transcribe(self, path, language=None, vad_filter=True):
            assert path == str(audio)
            assert vad_filter is True
            return iter([Segment(0, 1, " Hello "), Segment(1, 2, " world ")]), Info()

    agent = SpeechToTextAgent()
    monkeypatch.setattr(agent, "_get_model", lambda: FakeModel())

    result = agent.run(audio)

    assert result["transcript"] == "Hello world"
    assert result["language"] == "en"
    assert result["duration_seconds"] == 2.5
    assert len(result["segments"]) == 2
