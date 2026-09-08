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
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

MAX_RETRIES = 3


def _is_retryable_groq_error(e: Exception) -> bool:
    """
    True for errors worth retrying against Groq itself (transient rate limit).
    False for things retrying won't fix (bad model name, auth failure, etc) -
    those should fall through to Gemini immediately instead of wasting time retrying.
    """
    status = getattr(e, "status_code", None)
    return status == 429


def _call_groq(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    if groq_client is None:
        raise RuntimeError("No GROQ_API_KEY set - cannot use Groq as primary provider.")

    kwargs = {}
    if json_mode:
        # Groq's OpenAI-compatible endpoint supports this the same way OpenAI does.
        kwargs["response_format"] = {"type": "json_object"}

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = groq_client.chat.completions.create(
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
                wait_seconds = 20 * attempt  # 20s, then 40s
                print(f"[Groq] Rate limit hit (attempt {attempt}/{MAX_RETRIES}). Waiting {wait_seconds}s before retry...")
                time.sleep(wait_seconds)
                continue
            # Not retryable (e.g. auth failure / model gone) - stop retrying, let caller fall back.
            break

    raise last_error


def _call_gemini(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=0.4,
        response_mime_type="application/json" if json_mode else "text/plain",
    )
    response = gemini_client.models.generate_content(
        model=LLM_MODEL,
        contents=user_prompt,
        config=config,
    )
    return response.text


def call_llm(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
    """
    system_prompt: instructions describing the AI's role (e.g. "You are a debate judge...")
    user_prompt: the actual content to analyze/respond to
    json_mode: if True, forces the model to return valid JSON only (no extra text)

    Tries Groq first (with its own retry loop for transient rate limits).
    If Groq still fails after retries - quota exhausted, model unavailable, no key set -
    automatically falls back to Gemini so the app keeps working instead of crashing.
    """
    try:
        return _call_groq(system_prompt, user_prompt, json_mode)
    except Exception as groq_error:
        print(f"[Groq] Failed after retries ({groq_error}). Falling back to Gemini...")
        try:
            return _call_gemini(system_prompt, user_prompt, json_mode)
        except Exception as gemini_error:
            print(f"[Gemini] Fallback also failed: {gemini_error}")
            # Neither provider worked - raise the original Groq error, since that's
            # usually the more informative one (quota details, model name, etc).
            raise groq_error


def call_llm_json(system_prompt: str, user_prompt: str) -> dict:
    """Same as call_llm, but parses the result into a Python dict for you."""
    raw = call_llm(system_prompt, user_prompt, json_mode=True)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"error": "Model did not return valid JSON", "raw_output": raw}
