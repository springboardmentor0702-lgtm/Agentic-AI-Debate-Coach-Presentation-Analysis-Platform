from __future__ import annotations

import re
import logging

import httpx

from app.core.settings import settings

logger = logging.getLogger(__name__)


def is_valid_debate_message(message: str) -> bool:
    normalized = re.sub(r"[^a-zA-Z\s]", " ", message or "").lower().strip()
    words = normalized.split()

    if not words:
        return False

    greeting_words = {"hello", "hi", "hey", "hii", "heyy", "greetings", "goodmorning", "goodafternoon", "goodevening"}
    if len(words) < 3:
        return False
    if any(word in greeting_words for word in words):
        return False
    if all(len(word) <= 3 for word in words):
        return False
    if len(set(words)) <= 1:
        return False
    return True


def analyze_argument_text(text: str, topic: str | None = None) -> dict:
    raw = (text or "").strip()
    if not raw:
        return {
            "claims_detected": [],
            "supporting_evidence_detected": [],
            "reasoning_analysis": "No argument was provided.",
            "argument_strength_score": 0,
            "clarity_score": 0,
            "relevance_score": 0,
            "evidence_strength_score": 0,
            "logical_consistency_score": 0,
            "persuasiveness_score": 0,
            "strengths": [],
            "weaknesses": ["Add a clear claim and supporting evidence."],
            "improvement_suggestions": ["State your main claim, then explain why it matters."],
        }

    normalized = re.sub(r"[^A-Za-z0-9\s]", " ", raw).lower()
    words = normalized.split()
    topic_words = set(re.findall(r"[a-z0-9]+", (topic or "").lower()))
    overlap = len(set(words) & topic_words)

    evidence_markers = [
        "because", "for example", "for instance", "according to", "research", "study", "data",
        "statistics", "evidence", "example", "source", "show", "shows", "proves", "this means",
        "as a result", "therefore", "since", "result", "survey", "report"
    ]
    reasoning_markers = ["because", "therefore", "however", "since", "so", "if", "then", "as a result", "means", "shows"]
    greeting_words = {"hello", "hi", "hey", "greetings", "goodmorning", "goodafternoon", "goodevening"}

    evidence_hits = sum(1 for marker in evidence_markers if marker in normalized)
    reasoning_hits = sum(1 for marker in reasoning_markers if marker in normalized)
    has_numbers = bool(re.search(r"\d", raw))
    is_greeting = bool(set(words) & greeting_words)
    sentence_count = max(1, len(re.split(r"[.!?]+", raw.strip())))

    clarity_score = 40
    if sentence_count >= 2:
        clarity_score += 15
    if len(words) >= 12:
        clarity_score += 15
    if "because" in normalized or "therefore" in normalized:
        clarity_score += 10
    if is_greeting:
        clarity_score -= 30
    clarity_score = max(0, min(95, clarity_score))

    relevance_score = 35 + min(40, overlap * 12) + (10 if len(topic_words) > 0 else 0)
    if is_greeting:
        relevance_score = 0
    relevance_score = max(0, min(100, relevance_score))

    evidence_score = 20 + evidence_hits * 12 + (10 if has_numbers else 0) + (5 if len(words) >= 12 else 0)
    if is_greeting:
        evidence_score = 0
    evidence_score = max(0, min(100, evidence_score))

    logical_consistency_score = 30 + reasoning_hits * 10 + (10 if sentence_count >= 2 else 0)
    if is_greeting:
        logical_consistency_score = 0
    logical_consistency_score = max(0, min(100, logical_consistency_score))

    persuasiveness_score = int((clarity_score * 0.35) + (evidence_score * 0.35) + (logical_consistency_score * 0.3))

    strengths = []
    weaknesses = []

    if evidence_hits > 0:
        strengths.append("Specific supporting evidence")
    else:
        weaknesses.append("Add concrete evidence or examples")

    if reasoning_hits > 0:
        strengths.append("Clear reasoning chain")
    else:
        weaknesses.append("Explain why your claim follows from the evidence")

    if overlap > 0:
        strengths.append("Relevant to the topic")
    else:
        weaknesses.append("Connect the argument more directly to the debate topic")

    if not strengths:
        strengths.append("Attempted a direct claim")
    if not weaknesses:
        weaknesses.append("Make the argument more specific and concise")

    suggestions = []
    if evidence_hits == 0:
        suggestions.append("Add one specific example, statistic, or factual reason.")
    if reasoning_hits == 0:
        suggestions.append("State why your claim is true and what follows from it.")
    if overlap == 0:
        suggestions.append("Connect the claim back to the exact debate topic.")
    if not suggestions:
        suggestions.append("Keep your evidence precise and directly tied to your claim.")

    return {
        "claims_detected": [
            "Main claim",
            "Supporting reason",
        ] if len(words) >= 8 else ["Main claim"],
        "supporting_evidence_detected": [
            "Example", "Statistic", "Source"
        ] if evidence_hits > 0 else [],
        "reasoning_analysis": (
            "The argument is generally understandable and has some logical structure, but it needs stronger evidence and clearer topic connection."
            if clarity_score >= 50 else "The argument needs clearer wording and stronger evidence to be persuasive."
        ),
        "argument_strength_score": int((clarity_score + evidence_score + logical_consistency_score + persuasiveness_score) / 4),
        "clarity_score": clarity_score,
        "relevance_score": relevance_score,
        "evidence_strength_score": evidence_score,
        "logical_consistency_score": logical_consistency_score,
        "persuasiveness_score": persuasiveness_score,
        "strengths": strengths[:3],
        "weaknesses": weaknesses[:3],
        "improvement_suggestions": suggestions[:3],
    }


def analyze_presentation_text(text: str, title: str) -> dict:
    """Score extracted presentation text when a model provider is unavailable."""
    raw = (text or "").strip()
    words = re.findall(r"\b\w+\b", raw)
    sentences = max(1, len(re.findall(r"[.!?]", raw)))
    clarity = min(95, 40 + min(35, len(words) // 25) + (10 if sentences > 3 else 0))
    confidence = min(95, 45 + min(30, len(words) // 30))
    engagement = min(95, 40 + min(35, len(set(word.lower() for word in words)) // 20))
    return {
        "transcript": raw,
        "clarity_score": float(clarity),
        "confidence_score": float(confidence),
        "engagement_score": float(engagement),
        "ai_feedback": f"Analysis for {title}: strengthen evidence, vary delivery, and keep each slide focused.",
    }


def transcribe_audio(audio: bytes, filename: str, content_type: str | None) -> str:
    if not settings.groq_api_key:
        raise RuntimeError("Voice AI requires GROQ_API_KEY")
    response = httpx.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        files={"file": (filename, audio, content_type or "audio/webm")},
        data={"model": "whisper-large-v3-turbo"},
        timeout=60,
    )
    response.raise_for_status()
    return response.json()["text"].strip()


def generate_debate_response(topic: str, position: str, messages: list[dict[str, str]]) -> str:
    conversation = "\n".join(f"{item['sender']}: {item['message']}" for item in messages[-12:])
    chat_messages = [
        {"role": "system", "content": f"You are a rigorous debate opponent. Topic: {topic}. Defend this position: {position}. Give one clear counterargument, ask one probing question, and keep the response under 180 words."},
        {"role": "user", "content": conversation},
    ]

    providers = [
        (
            "Groq",
            settings.groq_api_key,
            settings.groq_model,
            "https://api.groq.com/openai/v1/chat/completions",
        ),
        (
            "OpenAI",
            settings.openai_api_key,
            settings.openai_model,
            "https://api.openai.com/v1/chat/completions",
        ),
    ]

    for provider_name, api_key, model, endpoint in providers:
        if not api_key:
            continue
        body = {
            "model": model,
            "temperature": 0.7,
            "messages": chat_messages,
        }
        try:
            response = httpx.post(
                endpoint,
                headers={"Authorization": f"Bearer {api_key}"},
                json=body,
                timeout=30,
            )
            response.raise_for_status()
            answer = response.json()["choices"][0]["message"]["content"].strip()
            if answer:
                return answer
            raise ValueError("Provider returned an empty response")
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            logger.warning("%s debate response failed: %s", provider_name, exc)

    latest_argument = next(
        (item["message"] for item in reversed(messages) if item.get("sender") == "USER"),
        "your argument",
    )
    user_turns = [item["message"] for item in messages if item.get("sender") == "USER"]
    fallback_prompts = [
        f"I understand your point that \"{latest_argument}\". However, I defend {position} on {topic}. What evidence shows that your approach is practical at scale?",
        f"Your point about {topic} raises an important trade-off. From the {position} side, I would challenge the assumption behind \"{latest_argument}\". How would you answer that objection?",
        f"Let us test your argument on {topic}. You have stated \"{latest_argument}\"; now explain why that benefit outweighs the strongest cost or unintended consequence. I remain {position}.",
    ]
    return fallback_prompts[len(user_turns) % len(fallback_prompts)]
