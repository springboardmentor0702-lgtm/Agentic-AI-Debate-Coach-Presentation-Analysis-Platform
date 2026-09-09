from app.agents.speech_to_text_agent import SpeechToTextAgent


class SpeechToTextAdapter:
    def __init__(self, agent: SpeechToTextAgent | None = None):
        self.agent = agent or SpeechToTextAgent()

    def transcribe(self, audio_source: str, language: str | None = None) -> str:
        return self.agent.run(audio_source, language=language)
