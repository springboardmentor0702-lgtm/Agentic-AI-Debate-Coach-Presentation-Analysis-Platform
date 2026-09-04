import re
import math
from typing import Dict, List


FILLER_WORDS = {
    "um",
    "uh",
    "erm",
    "hmm",
    "like",
    "basically",
    "actually",
    "literally",
    "you know",
    "i mean",
    "sort of",
    "kind of"
}


def clean_text(text: str) -> str:

    return re.sub(
        r"\s+",
        " ",
        text.strip()
    )


def get_words(text: str) -> List[str]:

    return re.findall(
        r"\b[\w'-]+\b",
        text.lower()
    )


def get_sentences(text: str) -> List[str]:

    return [
        item.strip()
        for item in re.split(
            r"(?<=[.!?])\s+",
            text.strip()
        )
        if item.strip()
    ]


# ============================================================
# FILLER WORD ANALYSIS
# ============================================================

def analyze_fillers(text: str) -> Dict:

    lower = text.lower()

    counts = {}

    total = 0

    for filler in FILLER_WORDS:

        if " " in filler:

            count = lower.count(
                filler
            )

        else:

            count = len(
                re.findall(
                    rf"\b{re.escape(filler)}\b",
                    lower
                )
            )

        if count > 0:

            counts[filler] = count

            total += count

    words = len(
        get_words(text)
    )

    rate = (
        total / words * 100
        if words
        else 0
    )

    score = max(
        0,
        min(
            100,
            round(
                100 - rate * 8,
                2
            )
        )
    )

    return {

        "total_filler_words":
            total,

        "filler_breakdown":
            counts,

        "filler_rate_percent":
            round(rate, 2),

        "filler_control_score":
            score
    }


# ============================================================
# SPEAKING PACE
# ============================================================

def analyze_speaking_pace(
    text: str,
    duration_seconds: float
) -> Dict:

    words = get_words(text)

    word_count = len(words)

    if duration_seconds <= 0:

        return {

            "word_count":
                word_count,

            "duration_seconds":
                0,

            "words_per_minute":
                0,

            "pace_score":
                0,

            "pace":
                "unknown"
        }

    minutes = duration_seconds / 60

    wpm = word_count / minutes

    # Approximate presentation target:
    # 110-160 WPM

    if 110 <= wpm <= 160:

        score = 100

        pace = "optimal"

    elif 90 <= wpm < 110:

        score = 82

        pace = "slightly_slow"

    elif 160 < wpm <= 180:

        score = 82

        pace = "slightly_fast"

    elif 70 <= wpm < 90:

        score = 65

        pace = "slow"

    elif 180 < wpm <= 200:

        score = 65

        pace = "fast"

    elif wpm < 70:

        score = 45

        pace = "very_slow"

    else:

        score = 45

        pace = "very_fast"

    return {

        "word_count":
            word_count,

        "duration_seconds":
            duration_seconds,

        "words_per_minute":
            round(wpm, 2),

        "pace_score":
            score,

        "pace":
            pace
    }


# ============================================================
# CLARITY
# ============================================================

def analyze_clarity(
    text: str
) -> Dict:

    words = get_words(text)

    sentences = get_sentences(text)

    if not words:

        return {
            "clarity_score": 0,
            "average_sentence_length": 0
        }

    average_length = (
        len(words)
        /
        max(len(sentences), 1)
    )

    score = 90

    if average_length > 30:

        score -= 25

    elif average_length > 25:

        score -= 15

    elif average_length > 20:

        score -= 8

    if len(sentences) < 2:

        score -= 10

    score = max(
        20,
        min(
            100,
            score
        )
    )

    return {

        "clarity_score":
            score,

        "average_sentence_length":
            round(
                average_length,
                2
            )
    }


# ============================================================
# CONFIDENCE
# ============================================================

def analyze_confidence(
    text: str
) -> Dict:

    words = get_words(text)

    if not words:

        return {
            "confidence_score": 0
        }

    weak_phrases = [
        "maybe",
        "perhaps",
        "i think",
        "i guess",
        "probably",
        "might be",
        "i am not sure",
        "i don't know"
    ]

    strong_phrases = [
        "the evidence shows",
        "clearly",
        "therefore",
        "we can conclude",
        "the data shows",
        "research demonstrates"
    ]

    lower = text.lower()

    weak_count = sum(
        lower.count(item)
        for item in weak_phrases
    )

    strong_count = sum(
        lower.count(item)
        for item in strong_phrases
    )

    score = 70

    score += strong_count * 5

    score -= weak_count * 6

    score = max(
        20,
        min(
            100,
            score
        )
    )

    return {

        "confidence_score":
            score,

        "weak_language_count":
            weak_count,

        "strong_language_count":
            strong_count
    }


# ============================================================
# ENGAGEMENT
# ============================================================

def analyze_engagement(
    text: str
) -> Dict:

    lower = text.lower()

    engagement_markers = [

        "you",

        "your",

        "we",

        "our",

        "imagine",

        "consider",

        "question",

        "why",

        "how",

        "let us",

        "let's",

        "for example"
    ]

    found = []

    for marker in engagement_markers:

        if marker in lower:

            found.append(marker)

    question_count = text.count("?")

    examples = lower.count(
        "for example"
    )

    score = 55

    score += min(
        len(found) * 4,
        20
    )

    score += min(
        question_count * 5,
        10
    )

    score += min(
        examples * 5,
        10
    )

    return {

        "engagement_score":
            min(score, 100),

        "engagement_markers":
            found,

        "questions":
            question_count,

        "examples":
            examples
    }


# ============================================================
# OVERALL ANALYSIS
# ============================================================

def analyze_presentation(
    transcript: str,
    duration_seconds: float = 60
) -> Dict:

    transcript = clean_text(
        transcript
    )

    if not transcript:

        raise ValueError(
            "Transcript cannot be empty."
        )

    pace = analyze_speaking_pace(
        transcript,
        duration_seconds
    )

    fillers = analyze_fillers(
        transcript
    )

    clarity = analyze_clarity(
        transcript
    )

    confidence = analyze_confidence(
        transcript
    )

    engagement = analyze_engagement(
        transcript
    )

    overall = round(

        pace["pace_score"] * 0.20

        +

        fillers[
            "filler_control_score"
        ] * 0.15

        +

        confidence[
            "confidence_score"
        ] * 0.25

        +

        clarity[
            "clarity_score"
        ] * 0.20

        +

        engagement[
            "engagement_score"
        ] * 0.20,

        2
    )

    feedback = []

    if pace["pace_score"] < 70:

        feedback.append(
            "Adjust speaking pace to make "
            "the presentation easier to follow."
        )

    if fillers[
        "filler_control_score"
    ] < 70:

        feedback.append(
            "Reduce filler words and use "
            "short pauses instead."
        )

    if confidence[
        "confidence_score"
    ] < 70:

        feedback.append(
            "Use more direct language and "
            "avoid excessive uncertainty."
        )

    if clarity[
        "clarity_score"
    ] < 70:

        feedback.append(
            "Use shorter sentences and "
            "clearer transitions."
        )

    if engagement[
        "engagement_score"
    ] < 70:

        feedback.append(
            "Engage the audience using "
            "questions, examples and direct address."
        )

    if not feedback:

        feedback.append(
            "The presentation demonstrates "
            "good overall communication quality."
        )

    return {

        "analysis_type":
            "presentation",

        "transcript":
            transcript,

        "duration_seconds":
            duration_seconds,

        "speech_pace":
            pace,

        "filler_words":
            fillers,

        "confidence":
            confidence,

        "clarity":
            clarity,

        "engagement":
            engagement,

        "overall_score":
            overall,

        "feedback":
            feedback
    }
