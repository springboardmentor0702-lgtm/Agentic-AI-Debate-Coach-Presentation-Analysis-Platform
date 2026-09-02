"""
Shared LLM client.
Primary provider: Groq.
Fallback provider: Gemini.
"""
import json
import time

from groq import Groq
from groq import APIStatusError as GroqAPIStatusError
from google import genai
from google.genai import types

from app.config import GEMINI_API_KEY, LLM_MODEL, GROQ_API_KEY, GROQ_MODEL

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

MAX_RETRIES = 3


def _is_retryable_groq_error(e: Exception) -> bool:
    return getattr(e, "status_code", None) == 429


def _call_groq(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    if groq_client is None:
        raise RuntimeError("No GROQ_API_KEY set - cannot use Groq as primary provider.")

    kwargs = {}
    if json_mode:
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
                time.sleep(20 * attempt)
                continue
            break

    raise last_error


def _call_gemini(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    if gemini_client is None:
        raise RuntimeError("No GEMINI_API_KEY set - Gemini fallback is unavailable.")

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
    try:
        return _call_groq(system_prompt, user_prompt, json_mode)
    except Exception as groq_error:
        print(f"[Groq] Failed after retries ({groq_error}). Falling back to Gemini...")
        try:
            return _call_gemini(system_prompt, user_prompt, json_mode)
        except Exception:
            raise groq_error


def call_llm_json(system_prompt: str, user_prompt: str) -> dict:
    raw = call_llm(system_prompt, user_prompt, json_mode=True)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"error": "Model did not return valid JSON", "raw_output": raw}
