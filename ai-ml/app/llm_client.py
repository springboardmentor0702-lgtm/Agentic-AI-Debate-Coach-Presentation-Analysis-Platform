"""
One shared function for talking to the LLM.

Primary provider: Groq (fast, generous free tier)
Fallback provider: Gemini (used automatically if Groq fails - e.g. quota
                    exhausted, rate limited, or model unavailable)

Both providers are tried with the SAME system_prompt/user_prompt/json_mode inputs,
so calling code (the agents) never needs to know which provider actually answered.
"""
import json
import time

from groq import Groq
from groq import APIStatusError as GroqAPIStatusError

from google import genai
from google.genai import types
from google.genai.errors import ClientError as GeminiClientError

from app.config import GEMINI_API_KEY, LLM_MODEL, GROQ_API_KEY, GROQ_MODEL

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

MAX_RETRIES = 3


def _is_retryable_groq_error(e: Exception) -> bool:
    status = getattr(e, "status_code", None)
    return status == 429


def _call_groq(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("No GROQ_API_KEY set.")
    
    client = Groq(api_key=GROQ_API_KEY)
    kwargs = {}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                temperature=0.4,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                **kwargs,
            )
            return response.choices[0].message.content
        except GroqAPIStatusError as e:
            last_error = e
            if _is_retryable_groq_error(e) and attempt < MAX_RETRIES:
                wait_seconds = 5 * attempt
                time.sleep(wait_seconds)
                continue
            break

    raise last_error or RuntimeError("Groq request failed.")


def _call_gemini(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")
    
    client = genai.Client(api_key=GEMINI_API_KEY)
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=0.4,
        response_mime_type="application/json" if json_mode else "text/plain",
    )
    response = client.models.generate_content(
        model=LLM_MODEL,
        contents=user_prompt,
        config=config,
    )
    return response.text


def call_llm(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
    """Tries Groq first, then falls back to Gemini."""
    if GROQ_API_KEY:
        try:
            return _call_groq(system_prompt, user_prompt, json_mode)
        except Exception as groq_error:
            pass

    if GEMINI_API_KEY:
        try:
            return _call_gemini(system_prompt, user_prompt, json_mode)
        except Exception as gemini_error:
            pass

    raise RuntimeError("No external LLM provider available (neither GROQ_API_KEY nor GEMINI_API_KEY is set or working).")


def call_llm_json(system_prompt: str, user_prompt: str) -> dict:
    """Safely calls LLM and parses JSON, returning an error dict if unavailable."""
    try:
        raw = call_llm(system_prompt, user_prompt, json_mode=True)
        return json.loads(raw)
    except Exception as e:
        return {"error": str(e)}
