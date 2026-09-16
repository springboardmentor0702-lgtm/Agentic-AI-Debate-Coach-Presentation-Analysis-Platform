from faster_whisper import WhisperModel

_local_model = WhisperModel("base", device="cpu", compute_type="int8")


def transcribe_audio(audio_file_path: str) -> str:
    segments, _info = _local_model.transcribe(audio_file_path, beam_size=5)
    return " ".join(segment.text for segment in segments).strip()
