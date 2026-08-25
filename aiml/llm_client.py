"""
llm_client.py
-------------
Thin wrapper around two LLM providers so every pipeline stage calls
the model the same way and gets clean JSON back, regardless of which
provider actually served the request.

Primary provider : Google Gemini
Fallback provider: xAI Grok (used automatically if Gemini errors out
                    or is unavailable/rate-limited)

Every other file in this project only talks to `LLMClient.call_json`
and `LLMClient.call_text` — so the rest of the pipeline never needs to
change no matter which provider is actually answering.
"""

import json
import os
import re

from dotenv import load_dotenv
import google.generativeai as genai
from openai import OpenAI  # xAI Grok exposes an OpenAI-compatible API

# Loads variables from a .env file in the current working directory (if
# present) into the process environment. Safe to call even if no .env
# file exists — it just does nothing in that case. Real env vars set
# elsewhere (system, shell, CI secrets) always take priority and are
# never overwritten by this.
load_dotenv()

GEMINI_MODEL = "gemini-3.6-flash"
GROK_MODEL = "grok-4"
GROK_BASE_URL = "https://api.x.ai/v1"


class LLMClient:
    def __init__(
        self,
        gemini_api_key: str | None = None,
        grok_api_key: str | None = None,
    ):
        self.gemini_api_key = gemini_api_key or os.environ.get("GEMINI_API_KEY")
        self.grok_api_key = grok_api_key or os.environ.get("GROK_API_KEY")

        self._gemini_model = None
        if self.gemini_api_key:
            genai.configure(api_key=self.gemini_api_key)
            self._gemini_model = genai.GenerativeModel(GEMINI_MODEL)

        self._grok_client = None
        if self.grok_api_key:
            self._grok_client = OpenAI(api_key=self.grok_api_key, base_url=GROK_BASE_URL)

    # ------------------------------------------------------------------
    # Provider calls
    # ------------------------------------------------------------------
    def _call_gemini(self, system: str, user: str, max_tokens: int) -> str:
        if not self._gemini_model:
            raise RuntimeError("Gemini not configured (missing GEMINI_API_KEY)")
        model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system)
        response = model.generate_content(
            user,
            generation_config=genai.types.GenerationConfig(max_output_tokens=max_tokens),
        )
        return response.text

    def _call_grok(self, system: str, user: str, max_tokens: int) -> str:
        if not self._grok_client:
            raise RuntimeError("Grok not configured (missing GROK_API_KEY)")
        response = self._grok_client.chat.completions.create(
            model=GROK_MODEL,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return response.choices[0].message.content

    def _call(self, system: str, user: str, max_tokens: int = 1500) -> str:
        """
        Tries Gemini first. On ANY failure (missing key, rate limit,
        network error, safety block, etc.) falls back to Grok.
        Raises only if both providers fail.
        """
        try:
            return self._call_gemini(system, user, max_tokens)
        except Exception as gemini_error:
            try:
                return self._call_grok(system, user, max_tokens)
            except Exception as grok_error:
                raise RuntimeError(
                    f"Both providers failed.\nGemini error: {gemini_error}\n"
                    f"Grok error: {grok_error}"
                ) from grok_error

    # ------------------------------------------------------------------
    # Public API used by every pipeline stage — unchanged interface
    # ------------------------------------------------------------------
    def call_json(self, system: str, user: str, max_tokens: int = 1500) -> dict:
        """
        Calls the model with an instruction to return ONLY JSON,
        then safely parses it (stripping markdown fences if the
        model adds them anyway).
        """
        strict_system = (
            system
            + "\n\nRespond with ONLY valid JSON. No preamble, no markdown "
            "code fences, no explanation before or after the JSON object."
        )
        raw = self._call(strict_system, user, max_tokens)
        cleaned = re.sub(r"^```(json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise ValueError(f"Model did not return valid JSON:\n{raw}") from e

    def call_text(self, system: str, user: str, max_tokens: int = 800) -> str:
        return self._call(system, user, max_tokens).strip()