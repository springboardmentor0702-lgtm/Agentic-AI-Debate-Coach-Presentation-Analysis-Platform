"""Adapter that lets the STT agent feed the existing debate workflow."""


class SpeechToTextAdapter:
    output_key = "transcription"

    def __init__(self, stt_agent):
        self.stt_agent = stt_agent

    def run(self, audio_source, **context):
        return self.stt_agent.run(audio_source)
