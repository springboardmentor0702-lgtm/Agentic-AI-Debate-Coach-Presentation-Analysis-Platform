import json

from ..core.config import settings

STATS = {"ok": 0, "fail": 0}


def _try_openai(system: str, user: str, max_tokens=700):
    if not settings.OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        r = client.chat.completions.create(
            model=settings.OPENAI_MODEL, temperature=0.7, max_tokens=max_tokens,
            messages=[{"role": "system", "content": system},
                      {"role": "user", "content": user}])
        STATS["ok"] += 1
        return r.choices[0].message.content
    except Exception:
        STATS["fail"] += 1
        return None


def llm_json(system: str, user: str, fallback: dict) -> dict:
    text = _try_openai(system, user)
    if not text:
        return fallback
    try:
        return json.loads(text[text.find("{"): text.rfind("}") + 1])
    except Exception:
        return fallback


def llm_text(system: str, user: str, fallback: str) -> str:
    return _try_openai(system, user) or fallback
