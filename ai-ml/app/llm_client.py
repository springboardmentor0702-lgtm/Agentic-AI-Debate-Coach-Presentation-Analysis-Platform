"""
One shared function for talking to the LLM with English language enforcement.

Primary provider: Groq (fast, generous free tier)
Fallback provider: Gemini (used automatically if Groq fails - e.g. quota
                    exhausted, rate limited, or model unavailable)

Both providers are tried with the SAME system_prompt/user_prompt/json_mode inputs,
so calling code (the agents) never needs to know which provider actually answered.
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, Optional

from groq import Groq
from groq import APIStatusError as GroqAPIStatusError

from google import genai
from google.genai import types
from google.genai.errors import ClientError as GeminiClientError

from app.config import GEMINI_API_KEY, LLM_MODEL, GROQ_API_KEY, GROQ_MODEL
from app.language_guard import (
    ENGLISH_ONLY_INSTRUCTION,
    enforce_english,
    is_probably_english,
    strip_scaffolding,
)

logger = logging.getLogger(__name__)

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

MAX_RETRIES = 3


def _is_retryable_groq_error(e: Exception) -> bool:
    """
    True for errors worth retrying against Groq itself (transient rate limit).
    False for things retrying won't fix (bad model name, auth failure, etc) -
    those should fall through to Gemini immediately instead of wasting time retrying.
    """
    status = getattr(e, "status_code", None)
    return status == 429


def _wrap_english_prompt(system_prompt: str) -> str:
    """Prepend explicit English language requirement to system instructions."""
    clean_sys = (system_prompt or "").strip()
    if ENGLISH_ONLY_INSTRUCTION not in clean_sys:
        return f"{ENGLISH_ONLY_INSTRUCTION}\n\n{clean_sys}"
    return clean_sys


def _call_groq(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    if groq_client is None:
        raise RuntimeError("No GROQ_API_KEY set - cannot use Groq as primary provider.")

    kwargs = {}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    effective_sys = _wrap_english_prompt(system_prompt)
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                temperature=0.4,
                messages=[
                    {"role": "system", "content": effective_sys},
                    {"role": "user", "content": user_prompt},
                ],
                **kwargs,
            )
            raw = response.choices[0].message.content or ""
            return raw
        except GroqAPIStatusError as e:
            last_error = e
            if _is_retryable_groq_error(e) and attempt < MAX_RETRIES:
                wait_seconds = 20 * attempt
                logger.warning("[Groq] Rate limit hit (attempt %d/%d). Waiting %ds before retry...", attempt, MAX_RETRIES, wait_seconds)
                time.sleep(wait_seconds)
                continue
            break

    raise last_error or RuntimeError("Groq call failed.")


def _call_gemini(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    if gemini_client is None:
        raise RuntimeError("No GEMINI_API_KEY set - cannot use Gemini as fallback.")

    effective_sys = _wrap_english_prompt(system_prompt)
    config = types.GenerateContentConfig(
        system_instruction=effective_sys,
        temperature=0.4,
        response_mime_type="application/json" if json_mode else "text/plain",
    )
    response = gemini_client.models.generate_content(
        model=LLM_MODEL,
        contents=user_prompt,
        config=config,
    )
    return response.text or ""


def call_llm(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
    """
    system_prompt: instructions describing the AI's role
    user_prompt: the actual content to analyze/respond to
    json_mode: if True, forces the model to return valid JSON only

    Tries Groq first. If Groq fails, falls back to Gemini.
    Validates output for English language adherence and re-prompts if needed.
    """
    raw = ""
    try:
        raw = _call_groq(system_prompt, user_prompt, json_mode)
    except Exception as groq_error:
        logger.info("[Groq] Failed (%s). Falling back to Gemini...", groq_error)
        try:
            raw = _call_gemini(system_prompt, user_prompt, json_mode)
        except Exception as gemini_error:
            logger.error("[Gemini] Fallback also failed: %s", gemini_error)
            raise groq_error from gemini_error

    # Verify language quality if raw prose (non-JSON mode)
    if not json_mode and raw and not is_probably_english(raw):
        logger.warning("Model response failed English check; re-prompting with strict instruction.")
        reprompt_sys = (
            f"{system_prompt}\n\nCRITICAL: The previous output contained non-English, garbled, or "
            "invalid characters. Re-write your response strictly in standard, grammatically correct English."
        )
        try:
            retry_raw = _call_groq(reprompt_sys, user_prompt, json_mode)
        except Exception:
            try:
                retry_raw = _call_gemini(reprompt_sys, user_prompt, json_mode)
            except Exception:
                retry_raw = ""
        if retry_raw and is_probably_english(retry_raw):
            raw = retry_raw
        else:
            raw = enforce_english(raw, fallback=strip_scaffolding(raw))

    return raw


def call_llm_json(system_prompt: str, user_prompt: str) -> dict:
    """Same as call_llm, but parses the result into a Python dict."""
    raw = call_llm(system_prompt, user_prompt, json_mode=True)
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
        return {"error": "Model returned JSON that was not an object", "raw_output": raw}
    except json.JSONDecodeError:
        # Try cleaning fences and reparsing
        cleaned = strip_scaffolding(raw)
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
        return {"error": "Model did not return valid JSON", "raw_output": raw}


def safe_call_llm_json(system_prompt: str, user_prompt: str) -> dict:
    """Safe wrapper around call_llm_json that never raises on provider/network errors."""
    try:
        return call_llm_json(system_prompt, user_prompt)
    except Exception as exc:
        return {"error": f"LLM unavailable: {exc}", "raw_output": ""}


def safe_call_llm(system_prompt: str, user_prompt: str) -> str:
    """Safe wrapper around call_llm that returns empty string on exception."""
    try:
        return call_llm(system_prompt, user_prompt, json_mode=False)
    except Exception:
        return ""
