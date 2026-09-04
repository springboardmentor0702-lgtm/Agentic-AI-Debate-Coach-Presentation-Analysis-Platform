import os


def transcribe_audio(
    audio_path: str
) -> str:

    try:

        import whisper

    except ImportError:

        raise RuntimeError(
            "Whisper is not installed. "
            "Install openai-whisper first."
        )

    model = whisper.load_model(
        os.getenv(
            "WHISPER_MODEL",
            "base"
        )
    )

    result = model.transcribe(
        audio_path
    )

    return result["text"]
