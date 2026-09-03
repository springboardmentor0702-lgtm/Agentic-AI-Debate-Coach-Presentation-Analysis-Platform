"""
Speech Analysis Agent (Speech-to-Text and Presentation Analysis Engine)
Role: transcribe an audio file with Whisper, measure real delivery metrics from
word-level timings (pace, fillers, pauses, pace variability), and add LLM
coaching feedback on delivery.

Transcription backend: faster-whisper (CTranslate2 build of OpenAI Whisper).
It is an OPTIONAL dependency - if it is not installed, transcription is skipped
and the text-only prosody path still works. Install with:
    pip install faster-whisper
faster-whisper also needs ffmpeg available on the system PATH.

Metric keys deliberately match backend/models.py::PresentationMetric so the
backend can persist this result without renaming anything:
    speech_pace_wpm | filler_words_count | filler_words_list
    confidence_score | clarity_score | engagement_score
"""
import os
import re

from app.agents.base_agent import BaseAgent
from app.llm_client import safe_call_llm_json

# Same filler vocabulary as backend/services/speech_engine.py, so the LLM path and
# the deterministic fallback path never disagree on what counts as a filler.
FILLER_PHRASES = (
    "you know",
    "i mean",
    "sort of",
    "kind of",
    "basically",
    "actually",
    "literally",
    "like",
    "um",
    "uh",
    "er",
    "ah",
    "so",
)

# Ideal competitive-speaking band, in words per minute.
IDEAL_WPM_LOW = 130
IDEAL_WPM_HIGH = 160

# A gap of at least this many seconds between two words counts as a deliberate pause.
PAUSE_THRESHOLD_SECONDS = 0.6

# Whisper model size. tiny/base/small/medium/large-v3 - "base" is the sane default
# for a laptop (~150 MB, CPU-friendly). Override with WHISPER_MODEL_SIZE.
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

SYSTEM_PROMPT = f"""You are a presentation and public-speaking coach reviewing a transcribed speech
together with its measured delivery metrics.

You are given real measurements. Do not contradict them - interpret them.
For reference, {IDEAL_WPM_LOW}-{IDEAL_WPM_HIGH} words per minute is the ideal delivery band;
below that reads as hesitant, above it reads as rushed.

Judge only DELIVERY, not whether you agree with the speaker's position.

Always respond with ONLY a JSON object in this exact shape, no extra text:

{{
  "delivery_summary": "2-3 sentences on how this speech actually landed as a performance",
  "pace_feedback": "one sentence on the speaking pace, referencing the measured wpm",
  "filler_feedback": "one sentence on filler word usage, referencing the measured count",
  "structure_feedback": "one sentence on whether the speech had a clear opening, body, and close",
  "tone": "one or two words describing the overall tone, e.g. Confident, Hesitant, Measured, Rushed",
  "strengths": ["1-3 specific delivery strengths"],
  "improvement_suggestions": ["2-3 concrete delivery drills or fixes, not vague advice"],
  "confidence_impression": <integer 0-100, how confident the delivery reads>,
  "engagement_impression": <integer 0-100, how engaging the delivery reads>
}}
"""

# Lazily-loaded singleton so importing this module never downloads a model.
_whisper_model = None
_whisper_load_error = None


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return round(max(low, min(high, value)), 1)


def whisper_available() -> bool:
    """True if faster-whisper is importable. Does not load the model."""
    try:
        import faster_whisper  # noqa: F401

        return True
    except ImportError:
        return False


def _get_whisper_model():
    """
    Load and cache the Whisper model. Returns (model, error_message).
    The first call downloads the model weights, so it is slow; later calls are free.
    """
    global _whisper_model, _whisper_load_error

    if _whisper_model is not None:
        return _whisper_model, None
    if _whisper_load_error is not None:
        return None, _whisper_load_error

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        _whisper_load_error = (
            "faster-whisper is not installed. Run: pip install faster-whisper "
            "(and make sure ffmpeg is on your PATH)."
        )
        return None, _whisper_load_error

    try:
        _whisper_model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )
        return _whisper_model, None
    except Exception as exc:  # model download failure, bad size name, missing ffmpeg
        _whisper_load_error = f"Could not load Whisper model '{WHISPER_MODEL_SIZE}': {exc}"
        return None, _whisper_load_error


class SpeechAnalysisAgent(BaseAgent):
    name = "SpeechAnalysisAgent"
    role = "Transcribes speech audio with Whisper and analyses pace, fillers, pauses, and delivery."

    # ------------------------------------------------------------------
    # Transcription
    # ------------------------------------------------------------------
    def transcribe(self, audio_path: str, language: str = None) -> dict:
        """
        Transcribe an audio file to text with word-level timestamps.

        Returns:
            {
              "transcript": str,
              "language": str,
              "duration_seconds": float,
              "words": [{"word": str, "start": float, "end": float}, ...],
              "segments": [{"start": float, "end": float, "text": str}, ...],
              "status": "transcribed" | "transcription_unavailable",
              "message": str
            }
        Never raises.
        """
        empty = {
            "transcript": "",
            "language": "",
            "duration_seconds": 0.0,
            "words": [],
            "segments": [],
            "status": "transcription_unavailable",
            "message": "",
        }

        if not audio_path or not str(audio_path).strip():
            empty["message"] = "No audio file path was provided."
            return empty

        if not os.path.isfile(audio_path):
            empty["message"] = f"Audio file not found: {audio_path}"
            return empty

        model, load_error = _get_whisper_model()
        if model is None:
            empty["message"] = load_error
            return empty

        try:
            segments_iter, info = model.transcribe(
                audio_path,
                language=language,
                word_timestamps=True,
                vad_filter=True,
            )

            words = []
            segments = []
            transcript_parts = []

            for segment in segments_iter:
                text = (segment.text or "").strip()
                if text:
                    transcript_parts.append(text)
                    segments.append(
                        {
                            "start": round(float(segment.start or 0.0), 2),
                            "end": round(float(segment.end or 0.0), 2),
                            "text": text,
                        }
                    )
                for word in getattr(segment, "words", None) or []:
                    token = (getattr(word, "word", "") or "").strip()
                    if token:
                        words.append(
                            {
                                "word": token,
                                "start": round(float(getattr(word, "start", 0.0) or 0.0), 2),
                                "end": round(float(getattr(word, "end", 0.0) or 0.0), 2),
                            }
                        )

            transcript = " ".join(transcript_parts).strip()
            duration = float(getattr(info, "duration", 0.0) or 0.0)
            if duration <= 0.0 and words:
                duration = words[-1]["end"]

            if not transcript:
                empty["duration_seconds"] = round(duration, 2)
                empty["message"] = "Audio contained no detectable speech."
                return empty

            return {
                "transcript": transcript,
                "language": str(getattr(info, "language", "") or ""),
                "duration_seconds": round(duration, 2),
                "words": words,
                "segments": segments,
                "status": "transcribed",
                "message": (
                    f"Transcribed {len(words)} words over {round(duration, 1)}s "
                    f"using Whisper '{WHISPER_MODEL_SIZE}'."
                ),
            }
        except Exception as exc:
            empty["message"] = f"Transcription failed: {exc}"
            return empty

    # ------------------------------------------------------------------
    # Deterministic prosody / delivery metrics
    # ------------------------------------------------------------------
    @staticmethod
    def _count_fillers(text: str) -> tuple:
        """
        Count filler phrases without double-counting overlaps.
        Longer phrases are consumed first, so "you know" is not also counted as two words.
        Returns (total_count, {phrase: count}).
        """
        haystack = text.lower()
        counts = {}
        for phrase in sorted(FILLER_PHRASES, key=len, reverse=True):
            pattern = rf"(?<!\w){re.escape(phrase)}(?!\w)"
            found = re.findall(pattern, haystack)
            if found:
                counts[phrase] = len(found)
                haystack = re.sub(pattern, " ", haystack)
        return sum(counts.values()), counts

    @staticmethod
    def _pause_stats(words: list) -> dict:
        """Derive pause and pace-variability stats from Whisper word timings."""
        stats = {
            "pause_count": 0,
            "longest_pause_seconds": 0.0,
            "average_pause_seconds": 0.0,
            "pace_variability": 0.0,
            "speaking_time_seconds": 0.0,
        }
        if not isinstance(words, list) or len(words) < 2:
            return stats

        gaps = []
        for previous, current in zip(words, words[1:]):
            gap = float(current.get("start", 0.0)) - float(previous.get("end", 0.0))
            if gap >= PAUSE_THRESHOLD_SECONDS:
                gaps.append(gap)

        total_span = float(words[-1].get("end", 0.0)) - float(words[0].get("start", 0.0))
        pause_total = sum(gaps)

        stats["pause_count"] = len(gaps)
        stats["longest_pause_seconds"] = round(max(gaps), 2) if gaps else 0.0
        stats["average_pause_seconds"] = round(pause_total / len(gaps), 2) if gaps else 0.0
        stats["speaking_time_seconds"] = round(max(0.0, total_span - pause_total), 2)

        # Pace variability: standard deviation of per-10-word wpm. Monotone delivery
        # scores near 0; natural, varied delivery lands in the 10-30 range.
        chunk_rates = []
        chunk_size = 10
        for start in range(0, len(words) - chunk_size + 1, chunk_size):
            chunk = words[start : start + chunk_size]
            span = float(chunk[-1].get("end", 0.0)) - float(chunk[0].get("start", 0.0))
            if span > 0:
                chunk_rates.append(chunk_size / (span / 60.0))
        if len(chunk_rates) >= 2:
            mean_rate = sum(chunk_rates) / len(chunk_rates)
            variance = sum((rate - mean_rate) ** 2 for rate in chunk_rates) / len(chunk_rates)
            stats["pace_variability"] = round(variance**0.5, 1)

        return stats

    def compute_metrics(self, transcript: str, duration_seconds: float, words: list = None) -> dict:
        """
        Pure-Python delivery metrics. No API call, no model - always available.
        Returns the six PresentationMetric keys plus prosody extras.
        """
        transcript = " ".join((transcript or "").split())
        if not transcript:
            return {
                "speech_pace_wpm": 0.0,
                "filler_words_count": 0,
                "filler_words_list": "None",
                "confidence_score": 0.0,
                "clarity_score": 0.0,
                "engagement_score": 0.0,
                "word_count": 0,
                "duration_seconds": 0.0,
                "pause_count": 0,
                "longest_pause_seconds": 0.0,
                "average_pause_seconds": 0.0,
                "pace_variability": 0.0,
                "speaking_time_seconds": 0.0,
                "average_sentence_length": 0.0,
                "sentence_count": 0,
            }

        tokens = re.findall(r"\b[\w']+\b", transcript.lower())
        word_count = len(tokens)
        duration = float(duration_seconds) if duration_seconds and duration_seconds > 0 else 0.0

        # With no real duration, assume the ideal pace rather than inventing a number.
        if duration <= 0.0:
            duration = (word_count / ((IDEAL_WPM_LOW + IDEAL_WPM_HIGH) / 2.0)) * 60.0

        minutes = max(0.1, duration / 60.0)
        wpm = round(word_count / minutes, 1)

        filler_total, filler_counts = self._count_fillers(transcript)
        filler_list = ", ".join(f"{phrase}:{count}" for phrase, count in filler_counts.items()) or "None"

        # Pace score peaks inside the ideal band and falls off linearly outside it.
        if IDEAL_WPM_LOW <= wpm <= IDEAL_WPM_HIGH:
            pace_score = 95.0
        elif wpm < IDEAL_WPM_LOW:
            pace_score = _clamp(95.0 - (IDEAL_WPM_LOW - wpm) * 0.8, 40.0, 95.0)
        else:
            pace_score = _clamp(95.0 - (wpm - IDEAL_WPM_HIGH) * 0.8, 40.0, 95.0)

        filler_density = (filler_total / max(1, word_count)) * 100.0
        confidence_score = _clamp(95.0 - filler_density * 8.0, 30.0, 99.0)

        sentence_count = max(1, len(re.findall(r"[.!?]+", transcript)))
        average_sentence_length = word_count / sentence_count
        clarity_score = _clamp(
            pace_score * 0.45 + confidence_score * 0.45 + min(10.0, average_sentence_length / 4.0),
            30.0,
            99.0,
        )

        prosody = self._pause_stats(words or [])

        engagement_score = _clamp(
            70.0
            + min(18.0, sentence_count * 2.0)
            + min(10.0, word_count / 40.0)
            - filler_total * 1.5
            # Real timings available: reward varied pace and purposeful pauses.
            + min(8.0, prosody["pace_variability"] * 0.3)
            + min(6.0, prosody["pause_count"] * 0.5),
            40.0,
            98.0,
        )

        return {
            "speech_pace_wpm": wpm,
            "filler_words_count": filler_total,
            "filler_words_list": filler_list,
            "confidence_score": confidence_score,
            "clarity_score": clarity_score,
            "engagement_score": engagement_score,
            "word_count": word_count,
            "duration_seconds": round(duration, 2),
            "pause_count": prosody["pause_count"],
            "longest_pause_seconds": prosody["longest_pause_seconds"],
            "average_pause_seconds": prosody["average_pause_seconds"],
            "pace_variability": prosody["pace_variability"],
            "speaking_time_seconds": prosody["speaking_time_seconds"],
            "average_sentence_length": round(average_sentence_length, 1),
            "sentence_count": sentence_count,
        }

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------
    def run(
        self,
        audio_path: str = None,
        transcript: str = "",
        duration_seconds: float = 0.0,
        language: str = None,
        include_feedback: bool = True,
    ) -> dict:
        """
        Either pass audio_path (transcribed with Whisper, real timings) or pass
        transcript + duration_seconds directly (text-only path, no Whisper needed).

        Returns:
            {
              "transcript": str,
              "language": str,
              "metrics": {...},          # the six PresentationMetric keys + prosody extras
              "feedback": {...},         # LLM delivery coaching, empty dict if unavailable
              "transcription_status": str,
              "status": "analyzed" | "not_analyzed",
              "message": str
            }
        Never raises.
        """
        empty = {
            "transcript": "",
            "language": "",
            "metrics": self.compute_metrics("", 0.0),
            "feedback": {},
            "transcription_status": "skipped",
            "status": "not_analyzed",
            "message": "",
        }

        words = []
        transcription_status = "skipped"
        detected_language = ""

        if audio_path:
            stt = self.transcribe(audio_path, language=language)
            transcription_status = stt["status"]
            if stt["status"] != "transcribed":
                # Fall back to any transcript the caller supplied before giving up.
                if not (transcript or "").strip():
                    empty["transcription_status"] = transcription_status
                    empty["message"] = stt["message"]
                    return empty
            else:
                transcript = stt["transcript"]
                duration_seconds = stt["duration_seconds"]
                words = stt["words"]
                detected_language = stt["language"]

        transcript = " ".join((transcript or "").split())
        if not transcript:
            empty["transcription_status"] = transcription_status
            empty["message"] = "No transcript available to analyse. Provide audio_path or transcript."
            return empty

        metrics = self.compute_metrics(transcript, duration_seconds, words)

        feedback = {}
        if include_feedback:
            feedback = self._delivery_feedback(transcript, metrics)
            # Let the model's impression nudge the deterministic scores, but keep it bounded
            # so a hallucinated number can never dominate a real measurement.
            for impression_key, metric_key in [
                ("confidence_impression", "confidence_score"),
                ("engagement_impression", "engagement_score"),
            ]:
                impression = feedback.get(impression_key)
                if isinstance(impression, (int, float)):
                    metrics[metric_key] = _clamp(metrics[metric_key] * 0.7 + float(impression) * 0.3, 30.0, 99.0)

        return {
            "transcript": transcript,
            "language": detected_language,
            "metrics": metrics,
            "feedback": feedback,
            "transcription_status": transcription_status,
            "status": "analyzed",
            "message": (
                f"{metrics['word_count']} words at {metrics['speech_pace_wpm']} wpm, "
                f"{metrics['filler_words_count']} filler word(s), {metrics['pause_count']} pause(s)."
            ),
        }

    def _delivery_feedback(self, transcript: str, metrics: dict) -> dict:
        """LLM coaching on delivery. Returns {} if the model is unavailable."""
        measurement_block = (
            f"Measured metrics:\n"
            f"- words spoken: {metrics['word_count']}\n"
            f"- duration: {metrics['duration_seconds']}s\n"
            f"- pace: {metrics['speech_pace_wpm']} wpm\n"
            f"- filler words: {metrics['filler_words_count']} ({metrics['filler_words_list']})\n"
            f"- pauses over {PAUSE_THRESHOLD_SECONDS}s: {metrics['pause_count']} "
            f"(longest {metrics['longest_pause_seconds']}s)\n"
            f"- pace variability: {metrics['pace_variability']}\n"
            f"- average sentence length: {metrics['average_sentence_length']} words\n"
        )
        user_prompt = f"{measurement_block}\nTranscript:\n\"{transcript}\""

        raw_result = safe_call_llm_json(SYSTEM_PROMPT, user_prompt)
        if "error" in raw_result:
            return {}

        def clamp_int(value, default=None):
            try:
                return max(0, min(100, int(float(value))))
            except (TypeError, ValueError):
                return default

        return {
            "delivery_summary": str(raw_result.get("delivery_summary", "")).strip(),
            "pace_feedback": str(raw_result.get("pace_feedback", "")).strip(),
            "filler_feedback": str(raw_result.get("filler_feedback", "")).strip(),
            "structure_feedback": str(raw_result.get("structure_feedback", "")).strip(),
            "tone": str(raw_result.get("tone", "")).strip(),
            "strengths": [str(s).strip() for s in (raw_result.get("strengths") or []) if str(s).strip()][:3],
            "improvement_suggestions": [
                str(s).strip() for s in (raw_result.get("improvement_suggestions") or []) if str(s).strip()
            ][:3],
            "confidence_impression": clamp_int(raw_result.get("confidence_impression")),
            "engagement_impression": clamp_int(raw_result.get("engagement_impression")),
        }


# Module-level singleton, same pattern as the other agents:
#   from app.agents.speech_analysis import speech_analysis_agent
speech_analysis_agent = SpeechAnalysisAgent()


if __name__ == "__main__":
    import json
    import sys

    print(f"Agent: {speech_analysis_agent}")
    print(f"faster-whisper installed: {whisper_available()}")
    print(f"Whisper model size: {WHISPER_MODEL_SIZE} (device={WHISPER_DEVICE}, compute={WHISPER_COMPUTE_TYPE})\n")

    # 1. Deterministic metrics - no Whisper, no API key needed.
    print("=" * 60)
    print("compute_metrics (pure Python, no model needed)")
    print("=" * 60)
    SAMPLE = (
        "So, um, I basically think that, you know, remote work is actually better for most people. "
        "Like, companies save money on office space. And employees save time on commuting. "
        "I mean, the data really does support this."
    )
    metrics = speech_analysis_agent.compute_metrics(SAMPLE, duration_seconds=22.0)
    print(json.dumps(metrics, indent=2))

    print("\n--- filler counting (no double-count on overlaps) ---")
    for text in ["you know", "I mean, like, um", "So, so, so", "No fillers present here."]:
        total, breakdown = speech_analysis_agent._count_fillers(text)
        print(f"  {text!r:32} -> {total} {breakdown}")

    print("\n--- pace scoring across the band ---")
    for wpm_target in [80, 120, 145, 175, 240]:
        words_needed = int(wpm_target)  # 1 minute of speech at that rate
        fake = " ".join(["word"] * words_needed) + "."
        m = speech_analysis_agent.compute_metrics(fake, duration_seconds=60.0)
        print(f"  {wpm_target:>3} wpm -> clarity {m['clarity_score']:>4}, engagement {m['engagement_score']:>4}")

    print("\n--- pause stats from synthetic word timings ---")
    fake_words = [
        {"word": "we", "start": 0.0, "end": 0.2},
        {"word": "should", "start": 0.2, "end": 0.5},
        {"word": "act", "start": 0.5, "end": 0.9},
        {"word": "now", "start": 2.4, "end": 2.8},  # 1.5s pause before this
        {"word": "decisively", "start": 2.8, "end": 3.5},
    ]
    print(json.dumps(speech_analysis_agent._pause_stats(fake_words), indent=2))

    # 2. Text-only full run - needs an API key for the feedback block.
    print("\n" + "=" * 60)
    print("run() text-only path (uses LLM for delivery feedback)")
    print("=" * 60)
    result = speech_analysis_agent.run(transcript=SAMPLE, duration_seconds=22.0)
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # 3. Real audio path - only if a file is passed on the command line.
    if len(sys.argv) > 1:
        audio_file = sys.argv[1]
        print("\n" + "=" * 60)
        print(f"run() with audio: {audio_file}")
        print("=" * 60)
        print(json.dumps(speech_analysis_agent.run(audio_path=audio_file), indent=2, ensure_ascii=False))
    else:
        print("\n(Tip: pass an audio file to test Whisper - "
              "python -m app.agents.speech_analysis path/to/speech.mp3)")

    print("\n--- Edge cases ---")
    print(f"  no input        -> {speech_analysis_agent.run()['message']}")
    print(f"  missing file    -> {speech_analysis_agent.run(audio_path='does_not_exist.mp3')['message']}")
    print(f"  empty transcript-> {speech_analysis_agent.run(transcript='   ')['message']}")
