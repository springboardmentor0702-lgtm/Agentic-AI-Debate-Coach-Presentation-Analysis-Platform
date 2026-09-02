from typing import Any, Dict, Sequence


class DebateWorkflow:
    """Sequential integration of the project's existing AI components."""

    def __init__(self, modules: Sequence[Any], speech_to_text=None):
        if len(modules) != 4:
            raise ValueError("DebateWorkflow requires exactly 4 modules.")
        self.modules = list(modules)
        self.speech_to_text = speech_to_text

    @staticmethod
    def _call(module: Any, argument: str, context: Dict[str, Any]) -> Any:
        for method_name in ("run", "analyze", "generate", "coach"):
            method = getattr(module, method_name, None)
            if callable(method):
                return method(argument, **context)

        if callable(module):
            return module(argument, **context)

        raise TypeError(
            f"Module {module!r} must expose run/analyze/generate/coach "
            "or be callable."
        )

    def run(self, argument: str) -> Dict[str, Any]:
        if not argument or not argument.strip():
            raise ValueError("argument must not be empty")

        context: Dict[str, Any] = {}
        results: Dict[str, Any] = {}

        for index, module in enumerate(self.modules, start=1):
            output = self._call(module, argument, context)
            key = getattr(module, "output_key", f"module_{index}")
            results[key] = output
            context[key] = output

        return {
            "input": argument,
            "modules": results,
        }

    def run_audio(self, audio_source, language=None) -> Dict[str, Any]:
        """Transcribe audio, then run the existing four-module workflow."""
        if self.speech_to_text is None:
            raise RuntimeError("Speech-to-text module is not configured.")

        transcription = self.speech_to_text.run(
            audio_source,
            language=language,
        )
        transcript = transcription.get("transcript", "").strip()

        if not transcript:
            raise ValueError("Speech-to-text returned an empty transcript.")

        result = self.run(transcript)
        result["transcription"] = transcription
        return result


def build_real_workflow(
    argument_agent,
    fallacy_agent,
    ai_engine,
    persona="The Contrarian",
):
    """Build a workflow from the project's real components."""
    from app.agents.speech_to_text_agent import speech_to_text_agent
    from .adapters import (
        ArgumentAnalysisAdapter,
        FallacyDetectionAdapter,
        RebuttalAdapter,
        CoachingScoringAdapter,
    )
    from .speech_to_text_adapter import SpeechToTextAdapter

    return DebateWorkflow(
        [
            ArgumentAnalysisAdapter(argument_agent),
            FallacyDetectionAdapter(fallacy_agent),
            RebuttalAdapter(ai_engine, persona),
            CoachingScoringAdapter(ai_engine),
        ],
        speech_to_text=SpeechToTextAdapter(speech_to_text_agent),
    )
