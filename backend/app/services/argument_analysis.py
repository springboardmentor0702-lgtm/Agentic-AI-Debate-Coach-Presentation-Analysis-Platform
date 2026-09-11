import re

from .ai_client import llm_json

EVIDENCE_PATTERNS = [r"\bstud(y|ies)\b", r"\bresearch\b", r"\bdata\b", r"\bstatistic",
    r"according to", r"\bevidence\b", r"\bsurvey\b", r"\bpercent", r"\breport(ed)?\b", r"\bstudy shows\b"]
CAUSAL_WORDS = [r"\btherefore\b", r"\bthus\b", r"\bhence\b", r"\bbecause\b", r"\bconsequently\b"]
RHETORIC = [r"\bclearly\b", r"\bunquestionably\b", r"\bvital\b", r"\bcritical\b", r"\bmust\b", r"\bimagine\b"]


def _extract_claims(text):
    claims = []
    for i, s in enumerate([s.strip() for s in re.split(r"[.!?]+", text) if len(s.strip()) > 8]):
        t = "evidence" if any(re.search(p, s.lower()) for p in EVIDENCE_PATTERNS) else \
            "reasoning" if any(re.search(p, s.lower()) for p in CAUSAL_WORDS) else "claim"
        claims.append({"index": i + 1, "claim": s[:200], "type": t})
    return claims


def analyze_argument(text: str, topic: str = "") -> dict:
    words = len(re.findall(r"\w+", text))
    sents = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    avg_len = words / max(1, len(sents))
    evidence = min(100, 35 + sum(len(re.findall(p, text.lower())) for p in EVIDENCE_PATTERNS) * 13)
    clarity = min(100, 55 + (20 if 8 <= avg_len <= 28 else 0) + (10 if len(sents) >= 2 else 0) + (10 if words >= 40 else 0))
    consistency = min(100, 50 + sum(len(re.findall(p, text.lower())) for p in CAUSAL_WORDS) * 10)
    persuasion = min(100, 45 + sum(len(re.findall(p, text.lower())) for p in RHETORIC) * 8 + (15 if evidence > 60 else 0))
    fallback = {"claims": _extract_claims(text),
        "scores": {"clarity": clarity, "relevance": 75, "evidence_strength": evidence,
                   "logical_consistency": consistency, "persuasiveness": persuasion},
        "notes": ["Heuristic engine active - add OPENAI_API_KEY in backend/.env for deep AI analysis."]}
    return llm_json(
        'You are an argument analysis engine. Return ONLY JSON: {"claims":[{"claim":str,"type":"claim|evidence|reasoning"}],'
        '"scores":{"clarity":0-100,"relevance":0-100,"evidence_strength":0-100,'
        '"logical_consistency":0-100,"persuasiveness":0-100},"notes":[str improvement notes]}',
        f"Debate topic: {topic}\nArgument to analyze:\n{text}", fallback)
