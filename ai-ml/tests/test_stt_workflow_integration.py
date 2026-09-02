from orchestration.debate_workflow import DebateWorkflow
from orchestration.speech_to_text_adapter import SpeechToTextAdapter


class Module:
    def __init__(self, key, value):
        self.output_key = key
        self.value = value

    def run(self, argument, **context):
        return {"value": self.value, "input": argument}


class FakeSTT:
    def run(self, audio_source, **kwargs):
        assert audio_source == "sample.wav"
        return {"transcript": "This is a valid debate argument", "language": "en"}


def test_run_audio_transcribes_then_runs_four_modules():
    workflow = DebateWorkflow(
        [
            Module("argument_analysis", "analysis"),
            Module("fallacy", "none"),
            Module("rebuttal", "counter"),
            Module("coaching", "score"),
        ],
        speech_to_text=SpeechToTextAdapter(FakeSTT()),
    )

    result = workflow.run_audio("sample.wav")

    assert result["input"] == "This is a valid debate argument"
    assert result["transcription"]["transcript"] == "This is a valid debate argument"
    assert list(result["modules"]) == [
    "argument_analysis",
    "fallacy",
    "rebuttal",
    "coaching",
]
