"""
Single entry point every future module (argument analysis, fallacy
detection, coaching, etc.) calls to talk to an LLM.

Deliberately calls the Gemini and Groq REST APIs directly with `requests`
instead of their official SDKs. The SDKs pull in grpc/protobuf/cryptography
- heavy compiled packages that are the #1 source of Windows pip build
failures on newer Python versions. Plain `requests` has no such problem,
on any Python version, ever.

Order: Gemini free tier first -> if it fails (quota/rate-limit/error) ->
Groq free tier -> if that also fails -> raise a clear error the caller
can show the user.
"""
import json
import logging
from typing import Optional

import requests

from app.config import settings

logger = logging.getLogger("llm_client")

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# AI model monitoring (Segment 19, closes a literal named item from the
# original spec's Admin Dashboard module). Simple in-memory counters -
# same lightweight pattern as the auth cache in security.py. Resets on
# restart, which is fine: this is "how has the AI been behaving lately,"
# not a permanent audit log.
_llm_stats = {
    "gemini_success": 0,
    "gemini_failure": 0,
    "groq_success": 0,
    "groq_failure": 0,
}


def get_llm_stats() -> dict:
    return dict(_llm_stats)


def _call_gemini(prompt: str, system: Optional[str], json_mode: bool) -> str:
    body = {"contents": [{"parts": [{"text": prompt}]}]}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    if json_mode:
        body["generationConfig"] = {"response_mime_type": "application/json"}

    url = f"{GEMINI_BASE}/{settings.GEMINI_MODEL}:generateContent"
    resp = requests.post(
        url,
        params={"key": settings.GEMINI_API_KEY},
        json=body,
        timeout=30,
    )
    if not resp.ok:
        # raise_for_status() alone throws away Google's actual error
        # message ("API key not valid", "model not found", etc.) -
        # surfacing the real response body makes every future failure
        # self-diagnosing instead of a bare "404 Client Error."
        raise RuntimeError(f"Gemini {resp.status_code}: {resp.text[:500]}")
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


def _call_groq(prompt: str, system: Optional[str], json_mode: bool) -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    body = {"model": settings.GROQ_MODEL, "messages": messages}
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    resp = requests.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
        json=body,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def generate(prompt: str, system: Optional[str] = None, json_mode: bool = False) -> str:
    """
    Returns raw text from whichever provider succeeds first.
    Set json_mode=True when you need the model to return valid JSON
    (used heavily from Segment 2 onward for structured scoring output).
    """
    errors = []

    if settings.GEMINI_API_KEY:
        try:
            result = _call_gemini(prompt, system, json_mode)
            _llm_stats["gemini_success"] += 1
            return result
        except Exception as e:  # noqa: BLE001 - deliberately broad, this is a fallback boundary
            _llm_stats["gemini_failure"] += 1
            logger.warning("Gemini call failed, falling back to Groq: %s", e)
            errors.append(f"Gemini: {e}")

    if settings.GROQ_API_KEY:
        try:
            result = _call_groq(prompt, system, json_mode)
            _llm_stats["groq_success"] += 1
            return result
        except Exception as e:  # noqa: BLE001
            _llm_stats["groq_failure"] += 1
            logger.warning("Groq call also failed: %s", e)
            errors.append(f"Groq: {e}")

    raise RuntimeError(
        "All LLM providers failed or no API keys configured. Details: "
        + (" | ".join(errors) if errors else "No GEMINI_API_KEY or GROQ_API_KEY set in .env")
    )


def generate_json(prompt: str, system: Optional[str] = None) -> dict:
    """
    Convenience wrapper for the very common case: 'give me structured
    scoring/analysis back as JSON'. Strips markdown code fences if the
    model wraps its JSON in them, then parses it.
    """
    raw = generate(prompt, system=system, json_mode=True)
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    return json.loads(cleaned.strip())


def embed_text(text: str) -> list:
    """
    Returns a 768-dimension embedding vector for the given text, using
    Gemini's free embedding endpoint via plain REST - same no-SDK
    pattern as every other call in this file. There is no Groq
    fallback here: Groq is an inference-speed provider and doesn't
    offer an embeddings API. Callers that use this for RAG (see
    coaching_service.py) treat a failure here as "skip retrieval,
    don't crash the whole request" rather than a hard dependency.

    gemini-embedding-001 defaults to 3072 dimensions; outputDimensionality
    truncates it to 768 (an explicitly supported, recommended size -
    Matryoshka Representation Learning means the truncated vector is
    still a high-quality embedding, not a naive slice). This keeps it
    matching the `vector(768)` column defined in segment_9_schema.sql.
    """
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is required for embeddings (Groq has no embeddings API).")

    url = f"{GEMINI_BASE}/{settings.GEMINI_EMBEDDING_MODEL}:embedContent"
    resp = requests.post(
        url,
        params={"key": settings.GEMINI_API_KEY},
        json={
            "content": {"parts": [{"text": text}]},
            "outputDimensionality": 768,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["embedding"]["values"]


def embedding_to_pg_literal(embedding: list) -> str:
    """
    pgvector expects its literal text format '[0.1,0.2,...]' when sent
    through PostgREST's JSON body - a raw JSON array of floats is not
    automatically cast to the `vector` column type. Every caller that
    sends an embedding to Supabase (seeding the knowledge base,
    running a similarity search) passes it through this first.
    """
    return "[" + ",".join(str(v) for v in embedding) + "]"
