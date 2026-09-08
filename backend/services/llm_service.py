"""Optional LLM adapter.
If GROQ_API_KEY is configured, live opponent replies use Groq's OpenAI-compatible API.
Without a key, the deterministic local engine remains fully usable offline.
"""
import os
import requests

class LLMService:
    def __init__(self):
        self.key = os.getenv("GROQ_API_KEY", "").strip()
        self.model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        self.url = "https://api.groq.com/openai/v1/chat/completions"

    @property
    def enabled(self):
        return bool(self.key)

    def generate(self, system_prompt: str, user_prompt: str) -> str | None:
        if not self.enabled:
            return None
        try:
            r = requests.post(self.url, headers={"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"}, json={"model": self.model, "temperature": 0.5, "messages": [{"role":"system","content":system_prompt},{"role":"user","content":user_prompt}]}, timeout=25)
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
        except Exception:
            return None

llm_service = LLMService()
