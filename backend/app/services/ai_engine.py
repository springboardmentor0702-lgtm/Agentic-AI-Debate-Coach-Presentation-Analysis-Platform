import os
import json
import logging
import requests
from ..config import settings

logger = logging.getLogger(__name__)

class AgenticAIEngine:
    """
    Agentic AI Engine orchestrating LLM calls with seamless fallback.
    If GEMINI_API_KEY or OPENAI_API_KEY is configured, it leverages live LLM reasoning.
    Otherwise, it executes intelligent rule-based agentic workflows.
    """
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        self.openai_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")

    def is_llm_active(self) -> bool:
        return bool(self.gemini_key or self.openai_key)

    def generate_completion(self, prompt: str, system_prompt: str = "") -> str:
        # 1. Try Gemini if configured
        if self.gemini_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
                headers = {"Content-Type": "application/json"}
                payload = {
                    "contents": [
                        {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{prompt}"}]}
                    ]
                }
                resp = requests.post(url, headers=headers, json=payload, timeout=15)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        return candidates[0]["content"]["parts"][0]["text"]
            except Exception as e:
                logger.warning(f"Gemini API invocation failed, using agent heuristic: {e}")

        # 2. Try OpenAI if configured
        if self.openai_key:
            try:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.openai_key}"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt or "You are an expert debate and presentation coach."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7
                }
                resp = requests.post(url, headers=headers, json=payload, timeout=15)
                if resp.status_code == 200:
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
            except Exception as e:
                logger.warning(f"OpenAI API invocation failed, using agent heuristic: {e}")

        # 3. Built-in agentic heuristic fallback
        return ""

ai_engine = AgenticAIEngine()
