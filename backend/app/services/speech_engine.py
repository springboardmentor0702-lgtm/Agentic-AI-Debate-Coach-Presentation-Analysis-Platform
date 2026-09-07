import re
from typing import Dict, Any, List

class PresentationSpeechEngine:
    """
    Presentation & Speech Analytics Engine.
    Computes Speech Pace (WPM), Filler Words Tally & Breakdown,
    Confidence Score, Clarity Score, and Audience Engagement Score.
    """

    FILLER_DICTIONARY = [
        "um", "uh", "er", "ah", "like", "you know", "actually", "basically",
        "literally", "sort of", "kind of", "so yeah", "i mean", "to be honest",
        "right", "you see", "obviously"
    ]

    HEDGE_WORDS = [
        "maybe", "perhaps", "i think", "i guess", "probably", "might",
        "sort of", "kind of", "somewhat", "not sure", "could be"
    ]

    ENGAGEMENT_MARKERS = [
        "imagine", "consider", "ask yourself", "why", "look at",
        "crucial", "extraordinary", "fundamental", "revolution",
        "transform", "impact", "together", "now", "listen"
    ]

    def analyze(self, transcript: str, duration_seconds: float = 60.0) -> Dict[str, Any]:
        text_clean = transcript.strip()
        if not text_clean:
            return {
                "title": "Empty Presentation",
                "transcript": "",
                "duration_seconds": duration_seconds,
                "speech_pace_wpm": 0.0,
                "pace_status": "No Speech Detected",
                "filler_words_count": 0,
                "filler_words_breakdown": {},
                "confidence_score": 0.0,
                "clarity_score": 0.0,
                "engagement_score": 0.0,
                "overall_presentation_score": 0.0,
                "feedback": "Please record or enter a presentation speech transcript."
            }

        words = re.findall(r"\b\w+\b", text_clean)
        word_count = len(words)
        duration_minutes = max(0.1, duration_seconds / 60.0)
        wpm = round(word_count / duration_minutes, 1)

        # Pace classification
        if wpm < 115:
            pace_status = "Too Slow (<115 WPM)"
            pace_penalty = 15.0
        elif 115 <= wpm < 135:
            pace_status = "Measured & Deliberate (115-135 WPM)"
            pace_penalty = 5.0
        elif 135 <= wpm <= 165:
            pace_status = "Optimal Conversational / Persuasive Pace (135-165 WPM)"
            pace_penalty = 0.0
        elif 165 < wpm <= 190:
            pace_status = "Brisk / Rapid (165-190 WPM)"
            pace_penalty = 6.0
        else:
            pace_status = "Rushed / Excessive Pace (>190 WPM)"
            pace_penalty = 18.0

        # Filler words tally
        lower_text = text_clean.lower()
        filler_breakdown = {}
        total_fillers = 0

        for filler in self.FILLER_DICTIONARY:
            pattern = rf"\b{re.escape(filler)}\b"
            hits = len(re.findall(pattern, lower_text))
            if hits > 0:
                filler_breakdown[filler] = hits
                total_fillers += hits

        # Filler rate per 100 words
        filler_rate = (total_fillers / max(1, word_count)) * 100.0

        # Confidence Score
        hedge_count = sum(len(re.findall(rf"\b{re.escape(h)}\b", lower_text)) for h in self.HEDGE_WORDS)
        base_confidence = 90.0
        base_confidence -= min(35.0, filler_rate * 5.0)
        base_confidence -= min(25.0, (hedge_count / max(1, word_count)) * 120.0)
        confidence_score = round(max(25.0, min(98.0, base_confidence)), 1)

        # Clarity Score
        sentences = [s for s in re.split(r"[.!?]+", text_clean) if s.strip()]
        avg_sentence_len = word_count / max(1, len(sentences))
        base_clarity = 92.0
        if avg_sentence_len > 30:
            base_clarity -= 15.0
        elif avg_sentence_len > 22:
            base_clarity -= 8.0
        base_clarity -= (pace_penalty * 0.5)
        clarity_score = round(max(30.0, min(99.0, base_clarity)), 1)

        # Audience Engagement Score
        questions_count = len(re.findall(r"\?", text_clean))
        engagement_hits = sum(1 for marker in self.ENGAGEMENT_MARKERS if re.search(rf"\b{marker}\b", lower_text))
        base_engagement = 65.0 + min(20.0, questions_count * 6.0) + min(15.0, engagement_hits * 3.0)
        if 130 <= wpm <= 165:
            base_engagement += 5.0
        engagement_score = round(max(30.0, min(98.0, base_engagement)), 1)

        # Overall Presentation Score
        overall = (confidence_score * 0.35) + (clarity_score * 0.35) + (engagement_score * 0.30)
        overall_presentation_score = round(max(10.0, min(99.0, overall)), 1)

        # Structured Coaching Feedback
        feedback_notes = []
        if total_fillers > 3:
            top_fillers = sorted(filler_breakdown.items(), key=lambda x: x[1], reverse=True)[:2]
            top_str = ", ".join([f"'{k}' ({v}x)" for k, v in top_fillers])
            feedback_notes.append(f"Noticeable filler density ({total_fillers} fillers, primarily {top_str}). Practice intentional pauses rather than vocalizing filler bridges.")
        else:
            feedback_notes.append("Excellent vocal discipline with minimal filler contamination.")

        if wpm > 175:
            feedback_notes.append("Pacing is slightly rushed. Insert 1-second deliberate pauses after key thesis points to let arguments resonate.")
        elif wpm < 120:
            feedback_notes.append("Pacing is somewhat sluggish. Increase energy and drive through transitional phrases.")
        else:
            feedback_notes.append("Vocal cadence is in the ideal conversational debate pocket.")

        if hedge_count > 2:
            feedback_notes.append("High hedge word frequency ('maybe', 'i think'). Assert claims with authoritative conviction.")
        if questions_count == 0:
            feedback_notes.append("Incorporate rhetorical questions or audience hooks to boost listener engagement.")

        return {
            "title": "Presentation Delivery Assessment",
            "transcript": text_clean,
            "duration_seconds": duration_seconds,
            "speech_pace_wpm": wpm,
            "pace_status": pace_status,
            "filler_words_count": total_fillers,
            "filler_words_breakdown": filler_breakdown,
            "confidence_score": confidence_score,
            "clarity_score": clarity_score,
            "engagement_score": engagement_score,
            "overall_presentation_score": overall_presentation_score,
            "feedback": " ".join(feedback_notes)
        }

speech_engine = PresentationSpeechEngine()
