"""Gemini AI service for presentation analysis."""

import json
import re

from google import genai

from app.core.settings import settings


# Create Gemini client
client = genai.Client(api_key=settings.gemini_api_key)


def analyze_presentation_text(text: str, title: str) -> dict:
    """
    Analyze extracted presentation text using Google Gemini.

    Returns data compatible with AnalyzePresentationRequest.
    """

    if not text or not text.strip():
        raise ValueError("No text could be extracted from the presentation.")

    # Limit text sent to Gemini
    text = text[:50000]

    prompt = f"""
You are an expert presentation coach and communication evaluator.

Analyze the following presentation content.

Presentation title:
{title}

Presentation content:
{text}

Evaluate the presentation based on:
1. Content clarity
2. Structure and organization
3. Confidence
4. Audience engagement
5. Overall presentation quality
6. Suggestions for improvement

Return ONLY valid JSON.
Do not return Markdown.
Do not wrap the JSON inside ```json or ```.

Use exactly this structure:

{{
    "transcript": "A concise summary of the presentation content",
    "pace": 0.0,
    "clarity_score": 0.0,
    "confidence_score": 0.0,
    "engagement_score": 0.0,
    "ai_feedback": "Detailed and practical feedback for improving this presentation"
}}

Rules:

- clarity_score must be between 0 and 100.
- confidence_score must be between 0 and 100.
- engagement_score must be between 0 and 100.
- pace should be an estimated speaking pace in words per minute.
- Estimate pace assuming the presentation is delivered naturally.
- Do not invent audio-specific measurements.
- transcript should summarize the extracted presentation content.
- ai_feedback should contain useful strengths, weaknesses, and recommendations.
"""

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
        )
    except Exception as exc:
        raise RuntimeError(
            f"Gemini API request failed: {str(exc)}"
        ) from exc

    if not response or not response.text:
        raise RuntimeError("Gemini returned an empty response.")

    result = response.text.strip()

    # Remove Markdown code fences if Gemini returns them anyway.
    result = re.sub(r"^```json\s*", "", result, flags=re.IGNORECASE)
    result = re.sub(r"^```\s*", "", result)
    result = re.sub(r"\s*```$", "", result)

    try:
        data = json.loads(result)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Gemini returned invalid JSON: {result[:1000]}"
        ) from exc

    # Validate and normalize scores.
    data["clarity_score"] = _normalize_score(
        data.get("clarity_score")
    )

    data["confidence_score"] = _normalize_score(
        data.get("confidence_score")
    )

    data["engagement_score"] = _normalize_score(
        data.get("engagement_score")
    )

    # Normalize pace.
    data["pace"] = _normalize_float(
        data.get("pace")
    )

    # Make sure required string fields exist.
    data["transcript"] = str(
        data.get("transcript") or ""
    )

    data["ai_feedback"] = str(
        data.get("ai_feedback") or ""
    )

    return {
        "transcript": data["transcript"],
        "pace": data["pace"],
        "clarity_score": data["clarity_score"],
        "confidence_score": data["confidence_score"],
        "engagement_score": data["engagement_score"],
        "ai_feedback": data["ai_feedback"],
    }


def _normalize_score(value) -> float | None:
    """Convert an AI score to a number between 0 and 100."""

    if value is None:
        return None

    try:
        value = float(value)
    except (TypeError, ValueError):
        return None

    return max(0.0, min(100.0, value))


def _normalize_float(value) -> float | None:
    """Convert a value to float safely."""

    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None