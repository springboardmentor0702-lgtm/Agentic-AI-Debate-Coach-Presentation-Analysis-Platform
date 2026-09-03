"""
agent_bridge.py - the ONLY module in backend/ that is allowed to import ai-ml/.

Why this file exists
--------------------
Before this, backend/ and ai-ml/ were two disconnected trees: the routers ran the
deterministic regex/arithmetic engines in services/ai_engine.py and never touched
the LLM agents, while ai-ml/ had six working agents nothing imported. Wiring the
agents directly into nine routers would have meant nine copies of the sys.path
hack, nine try/excepts, and nine subtly different response shapes.

So: one seam. Routers call functions in here and get back ONE shape per
capability, whichever engine produced it. Every returned dict carries:

    "engine": "llm_agent"      -> answered by the ai-ml LLM agents
    "engine": "deterministic"  -> answered by services/ai_engine.py

...so a router never branches on engine, and the frontend can show the user which
brain answered.

Degradation, in order
---------------------
1. USE_LLM_AGENTS=false in .env         -> deterministic
2. No GROQ_API_KEY and no GEMINI_API_KEY -> deterministic
3. ai-ml/ missing, or importing it fails -> deterministic (reason recorded)
4. Agents loaded, but a single call fails -> the agent itself returns a
   shape-stable fallback (agents never raise), so still a valid response.

Nothing that works today can break: services/ai_engine.py and
services/speech_engine.py are untouched and remain the fallback path.

Key resolution
--------------
config.py merges backend/.env into os.environ at import time. If a key is still
missing after that, we read ai-ml/.env as a fallback - because that is where the
keys already live in this project, and ai-ml/app/config.py captures them into
module constants at import time, so they MUST be in os.environ *before* the
agents are imported. status() reports which source each key came from; it never
reports a key's value.
"""
from __future__ import annotations

import logging
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from config import settings
from services.ai_engine import ai_engine_service
from services.speech_engine import speech_engine_service

logger = logging.getLogger(__name__)

ENGINE_LLM = "llm_agent"
ENGINE_DETERMINISTIC = "deterministic"

PERSONAS: Tuple[str, ...] = ("The Contrarian", "The Academic", "The Strategist")
DEFAULT_PERSONA = PERSONAS[0]
DIFFICULTIES: Tuple[str, ...] = ("easy", "medium", "hard")
DEFAULT_DIFFICULTY = "medium"

REBUTTAL_TYPES: Tuple[str, ...] = ("Logical", "Evidence-Based", "Ethical", "Practical", "Policy")

SUPPORTED_FALLACIES: Tuple[str, ...] = (
    "Ad Hominem",
    "Straw Man",
    "False Dilemma",
    "Slippery Slope",
    "Appeal to Authority",
    "Circular Reasoning",
    "Hasty Generalization",
    "Red Herring",
)

# The spec's weighted scoring model. ai-ml/app/agents/scoring_agent.py holds the
# canonical copy; this is the fallback used when the agents are not loaded.
# _verify_weights() compares the two at load time and screams if they ever drift,
# so this duplicate can't quietly become wrong.
SCORE_WEIGHTS: Dict[str, float] = {
    "argument_quality": 0.30,
    "evidence_usage": 0.20,
    "logical_consistency": 0.20,
    "rebuttal_effectiveness": 0.15,
    "communication_skills": 0.15,
}
SUB_SCORE_KEYS: Tuple[str, ...] = tuple(SCORE_WEIGHTS.keys())

GRADE_BANDS = ((90, "A", "Excellent"), (80, "B", "Strong"), (70, "C", "Competent"),
               (60, "D", "Developing"), (0, "F", "Needs Work"))

# Env vars the agents read. Model names and Whisper settings are included so a
# value set only in ai-ml/.env still reaches the agents.
_AGENT_ENV_KEYS: Tuple[str, ...] = (
    "GROQ_API_KEY",
    "GROQ_MODEL",
    "GEMINI_API_KEY",
    "LLM_MODEL",
    "WHISPER_MODEL_SIZE",
    "WHISPER_DEVICE",
    "WHISPER_COMPUTE_TYPE",
)

# Confidence attached to a deterministic (regex) fallacy hit. A pattern match is
# a decent signal that the *phrasing* is present, but it cannot judge whether the
# reasoning is actually fallacious - hence a fixed middling value rather than a
# fabricated per-item score. The LLM path returns the model's real confidence.
_REGEX_FALLACY_CONFIDENCE = 70

# Strength attached to a deterministic rebuttal. The templates are fixed text, so
# there is no per-item judgement to report; 60 matches the agents' default.
_TEMPLATE_REBUTTAL_STRENGTH = 60

# Module state, populated once by _load_agents().
_agents: Optional[Dict[str, Any]] = None
_scoring_class: Optional[Any] = None
_load_attempted: bool = False
_load_error: Optional[str] = None
_key_source: Dict[str, str] = {}


# ---------------------------------------------------------------------------
# Small normalizers. Every value that reaches a router goes through one of these,
# so a model returning "85%" or None can never produce a validation error.
# ---------------------------------------------------------------------------
def _num(value: Any, default: float = 0.0, low: float = 0.0, high: float = 100.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return round(float(default), 1)
    if result != result:  # NaN
        return round(float(default), 1)
    return round(max(low, min(high, result)), 1)


def _int(value: Any, default: int = 0, low: int = 0, high: int = 100) -> int:
    try:
        result = int(round(float(value)))
    except (TypeError, ValueError):
        return default
    return max(low, min(high, result))


def _text(value: Any, limit: int = 4000) -> str:
    if value is None:
        return ""
    return str(value).strip()[:limit]


def _str_list(value: Any, limit: int = 8) -> List[str]:
    if not isinstance(value, (list, tuple)):
        return []
    return [_text(item, 600) for item in value if _text(item)][:limit]


def _resolve_persona(persona: Any) -> str:
    """
    Accept loose spellings ("academic", "THE STRATEGIST", " contrarian ") and
    return the canonical name. Done here rather than in each engine so both
    engines behave identically - ai_engine silently coerces anything unknown to
    The Contrarian, which hides typos.
    """
    wanted = _text(persona).lower().replace("the ", "").strip()
    if not wanted:
        return DEFAULT_PERSONA
    for name in PERSONAS:
        if wanted == name.lower().replace("the ", ""):
            return name
    return DEFAULT_PERSONA


def _resolve_difficulty(difficulty: Any) -> str:
    wanted = _text(difficulty).lower()
    return wanted if wanted in DIFFICULTIES else DEFAULT_DIFFICULTY


def _normalize_fallacies(items: Any, confidence_default: int = 60) -> List[Dict[str, Any]]:
    """
    Collapse both fallacy shapes onto one. The LLM agent emits "type"; the
    deterministic engine emits "fallacy_type" and has no excerpt/confidence.
    Unknown fallacy names are dropped - neither engine is allowed to invent
    types outside the spec's eight.
    """
    normalized: List[Dict[str, Any]] = []
    if not isinstance(items, (list, tuple)):
        return normalized

    seen = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        name = _text(item.get("fallacy_type") or item.get("type"), 120)
        match = next((f for f in SUPPORTED_FALLACIES if f.lower() == name.lower()), None)
        if match is None or match in seen:
            continue
        seen.add(match)
        normalized.append(
            {
                "fallacy_type": match,
                "excerpt": _text(item.get("excerpt"), 400),
                "explanation": _text(item.get("explanation"), 1000),
                "correction_suggestion": _text(item.get("correction_suggestion") or item.get("correction"), 1000),
                "confidence": _int(item.get("confidence", confidence_default), default=confidence_default),
            }
        )
    return normalized


def _normalize_rebuttals(items: Any, strength_default: int = 60) -> List[Dict[str, Any]]:
    """One rebuttal shape, in canonical spec order, one entry per type."""
    normalized: List[Dict[str, Any]] = []
    if not isinstance(items, (list, tuple)):
        return normalized

    seen = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        name = _text(item.get("rebuttal_type"), 60)
        match = next((t for t in REBUTTAL_TYPES if t.lower() == name.lower()), None)
        if match is None or match in seen:
            continue
        text = _text(item.get("rebuttal_text"), 2000)
        if not text:
            continue
        seen.add(match)
        normalized.append(
            {
                "rebuttal_type": match,
                "rebuttal_text": text,
                "challenge_question": _text(item.get("challenge_question"), 600),
                "strategy_tip": _text(item.get("strategy_tip"), 600),
                "strength": _int(item.get("strength", strength_default), default=strength_default),
            }
        )
    normalized.sort(key=lambda r: REBUTTAL_TYPES.index(r["rebuttal_type"]))
    return normalized


# ---------------------------------------------------------------------------
# Loading the ai-ml agents
# ---------------------------------------------------------------------------
def _parse_env_file(path: Path) -> Dict[str, str]:
    """Minimal KEY=VALUE reader - same rules as config.py's loader, no dependency."""
    values: Dict[str, str] = {}
    try:
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip().strip('"\'')
    except OSError as exc:
        logger.warning("Could not read %s: %s", path, exc)
    return values


def _resolve_agent_env() -> Dict[str, str]:
    """
    Push the agents' settings into os.environ before ai-ml is imported.

    Priority: real environment / backend/.env (both already in os.environ thanks
    to config.py) wins; ai-ml/.env only fills what is still missing. Values are
    recorded by SOURCE only - never logged, never returned by status().
    """
    resolved: Dict[str, str] = {}
    for key in _AGENT_ENV_KEYS:
        value = _text(os.environ.get(key), 500)
        if value:
            resolved[key] = value
            _key_source[key] = "backend environment"

    ai_ml_env = Path(settings.AI_ML_PATH) / ".env"
    if ai_ml_env.is_file():
        for key, value in _parse_env_file(ai_ml_env).items():
            if key in _AGENT_ENV_KEYS and key not in resolved and value:
                resolved[key] = value
                _key_source[key] = "ai-ml/.env"

    for key, value in resolved.items():
        os.environ[key] = value

    for key in _AGENT_ENV_KEYS:
        _key_source.setdefault(key, "not set")
    return resolved


def _verify_weights(scoring_class: Any) -> None:
    """
    Cross-check this module's fallback weight table against the canonical one in
    scoring_agent. If they ever drift, the deterministic and LLM paths would grade
    differently for the same work - which is exactly the kind of bug nobody
    notices, so it is logged as an error.
    """
    canonical = getattr(sys.modules.get(scoring_class.__module__), "SCORE_WEIGHTS", None)
    if not isinstance(canonical, dict):
        logger.warning("Could not read SCORE_WEIGHTS from scoring_agent to verify weights.")
        return
    if {k: round(float(v), 4) for k, v in canonical.items()} != {
        k: round(float(v), 4) for k, v in SCORE_WEIGHTS.items()
    }:
        logger.error(
            "SCORE_WEIGHTS MISMATCH. agent_bridge=%s scoring_agent=%s - "
            "the two engines will grade differently. Fix agent_bridge.SCORE_WEIGHTS.",
            SCORE_WEIGHTS,
            canonical,
        )


def _load_agents() -> Optional[Dict[str, Any]]:
    """
    Import ai-ml/app/agents once and cache the result (success or failure).
    Returns the AGENT_REGISTRY dict, or None with the reason in _load_error.
    Never raises - a broken ai-ml/ must not stop the API from booting.
    """
    global _agents, _scoring_class, _load_attempted, _load_error

    if _load_attempted:
        return _agents
    _load_attempted = True

    if not settings.USE_LLM_AGENTS:
        _load_error = "disabled: USE_LLM_AGENTS is false"
        logger.info("LLM agents disabled by configuration; using the deterministic engine.")
        return None

    ai_ml_path = Path(settings.AI_ML_PATH)
    if not (ai_ml_path / "app" / "agents").is_dir():
        _load_error = f"ai-ml package not found at {ai_ml_path}"
        logger.warning("%s - using the deterministic engine.", _load_error)
        return None

    # Must happen before the import: ai-ml/app/config.py reads os.environ into
    # module constants at import time, so late-setting a key has no effect.
    _resolve_agent_env()

    if not (os.environ.get("GROQ_API_KEY") or os.environ.get("GEMINI_API_KEY")):
        _load_error = "no LLM API key found in backend/.env or ai-ml/.env (GROQ_API_KEY / GEMINI_API_KEY)"
        logger.warning("%s - using the deterministic engine.", _load_error)
        return None

    if str(ai_ml_path) not in sys.path:
        sys.path.insert(0, str(ai_ml_path))

    try:
        from app.agents import AGENT_REGISTRY  # noqa: PLC0415 - deliberately lazy
        from app.agents.scoring_agent import ScoringAgent  # noqa: PLC0415
    except Exception as exc:  # noqa: BLE001 - any import failure degrades, never crashes
        _load_error = f"{type(exc).__name__}: {exc}"
        logger.error("Could not import the ai-ml agents (%s) - using the deterministic engine.", _load_error)
        return None

    # backend/ is a flat package with no app/ of its own, so "app" should resolve
    # into ai-ml. If some other app package shadowed it we would be running the
    # wrong code entirely, so check rather than assume.
    loaded_from = getattr(sys.modules.get("app"), "__file__", "") or ""
    if loaded_from and ai_ml_path.resolve() not in Path(loaded_from).resolve().parents:
        _load_error = f"import collision: 'app' resolved to {loaded_from}, not {ai_ml_path}"
        logger.error("%s - using the deterministic engine.", _load_error)
        return None

    _agents = dict(AGENT_REGISTRY)
    _scoring_class = ScoringAgent
    _verify_weights(ScoringAgent)
    logger.info("LLM agents loaded from %s: %s", ai_ml_path, ", ".join(sorted(_agents)))
    return _agents


def _agent(name: str) -> Optional[Any]:
    """Fetch one agent singleton, or None if the agent layer is unavailable."""
    registry = _load_agents()
    if not registry:
        return None
    return registry.get(name)


def agents_available() -> bool:
    return bool(_load_agents())


def whisper_ready() -> bool:
    """True only if the agent layer loaded AND faster-whisper is importable."""
    if not agents_available():
        return False
    try:
        module = sys.modules.get("app.agents.speech_analysis")
        checker = getattr(module, "whisper_available", None)
        return bool(checker()) if callable(checker) else False
    except Exception:  # noqa: BLE001
        return False


def warmup() -> Dict[str, Any]:
    """
    Force the import at startup instead of on the first request, so the boot
    banner and /health tell the truth immediately and the first user does not
    absorb the import cost. Makes no network or LLM call.
    """
    _load_agents()
    return status()


def status() -> Dict[str, Any]:
    """Machine-readable engine status for the startup banner and /health."""
    registry = _load_agents()
    ai_ml_path = Path(settings.AI_ML_PATH)
    return {
        "active_engine": ENGINE_LLM if registry else ENGINE_DETERMINISTIC,
        "llm_agents_loaded": bool(registry),
        "agents": sorted(registry) if registry else [],
        "unavailable_reason": None if registry else (_load_error or "not loaded yet"),
        "use_llm_agents_flag": settings.USE_LLM_AGENTS,
        # Source only. Never the value.
        "key_sources": {
            "GROQ_API_KEY": _key_source.get("GROQ_API_KEY", "not checked"),
            "GEMINI_API_KEY": _key_source.get("GEMINI_API_KEY", "not checked"),
        },
        "groq_key_present": bool(os.environ.get("GROQ_API_KEY")),
        "gemini_key_present": bool(os.environ.get("GEMINI_API_KEY")),
        "whisper_available": whisper_ready(),
        "ai_ml_path": str(ai_ml_path),
        "ai_ml_path_exists": ai_ml_path.is_dir(),
        "fallback_engine": "services/ai_engine.py + services/speech_engine.py",
    }


# ---------------------------------------------------------------------------
# Scoring maths. Deliberately the same implementation for both engines, and
# never delegated to a model.
# ---------------------------------------------------------------------------
def compute_weighted_score(sub_scores: Dict[str, Any]) -> float:
    """
    Apply the spec's 30/20/20/15/15 model. A missing dimension counts as 0, never
    as full marks. Prefers scoring_agent's implementation when loaded so there is
    one arithmetic of record.

    Rounded to 1 decimal here regardless of engine. scoring_agent returns 2
    decimals; without this the same performance would surface as 78.75 on the LLM
    path and 78.8 on the local path, which looks like a bug in the UI.

    Anything that is not a dict scores 0.0 rather than raising. A router handing
    this a JSON body it did not validate is a realistic mistake, and a 500 on the
    scoring endpoint is a worse outcome than a visibly-zero score.
    """
    scores = sub_scores if isinstance(sub_scores, dict) else {}

    if _scoring_class is not None:
        try:
            return round(float(_scoring_class.compute_weighted_score(scores)), 1)
        except Exception:  # noqa: BLE001 - fall through to the local copy
            logger.warning("scoring_agent.compute_weighted_score failed; using the local copy.")

    total = 0.0
    for key, weight in SCORE_WEIGHTS.items():
        total += weight * _num(scores.get(key, 0.0))
    return round(total, 1)


def grade_for(overall_score: float) -> Tuple[str, str]:
    score = _num(overall_score)
    for threshold, grade, band in GRADE_BANDS:
        if score >= threshold:
            return grade, band
    return "F", "Needs Work"


# ---------------------------------------------------------------------------
# Capability 1: argument analysis
# ---------------------------------------------------------------------------
def _empty_analysis(message: str, engine: str) -> Dict[str, Any]:
    return {
        "engine": engine,
        "claim_identified": "",
        "evidence_items": [],
        "evidence_strength": 0.0,
        "reasoning_quality": 0.0,
        "clarity_score": 0.0,
        "relevance_score": 0.0,
        "logical_consistency": 0.0,
        "persuasiveness_score": 0.0,
        "fallacies": [],
        "counterarguments": [],
        "notes": message,
        "status": "not_analyzed",
        "message": message,
    }


def analyze_argument(
    text: str,
    topic: str = "",
    position: str = "",
    include_fallacies: bool = True,
    include_counterarguments: bool = True,
) -> Dict[str, Any]:
    """
    Claim + six sub-scores + fallacies + rebuttals, in one call.

    On the LLM path this fans out to three agents (analysis, fallacy,
    counterargument), because that is what the deterministic engine returns in
    one shot and the route contract must not change. Set include_fallacies /
    include_counterarguments to False to trade completeness for latency.
    """
    clean = " ".join(_text(text, 20000).split())
    if not clean:
        return _empty_analysis("No argument text was provided.", ENGINE_DETERMINISTIC)

    agent = _agent("argument_analysis")
    if agent is None:
        return _deterministic_analysis(clean)

    raw = agent.run(clean)

    evidence_items = _str_list(raw.get("evidence"), limit=10)
    persuasiveness = _num(raw.get("strength_score"))
    clarity = _num(raw.get("clarity_score"))
    relevance = _num(raw.get("relevance_score"))
    logic = _num(raw.get("logical_consistency_score"))

    # The agent reports the evidence it FOUND and an overall verdict, but no
    # standalone evidence_strength - so derive it here, transparently:
    # three or more distinct supports = full credit, one = a third, none = zero.
    # It can never exceed the model's own verdict, so it never inflates.
    # (The alternative - adding the field to the agent's prompt - would change a
    # file outside this batch's plan; flagged for the user instead.)
    coverage = min(1.0, len(evidence_items) / 3.0)
    evidence_strength = _num(persuasiveness * coverage)

    # Same formula the deterministic engine uses, so the field means the same
    # thing whichever engine produced it.
    reasoning_quality = _num((evidence_strength + logic + clarity) / 3.0)

    fallacies: List[Dict[str, Any]] = []
    if include_fallacies:
        fallacies = detect_fallacies(clean).get("fallacies", [])

    counterarguments: List[Dict[str, Any]] = []
    if include_counterarguments:
        counterarguments = generate_counterarguments(clean, topic=topic, position=position).get(
            "counterarguments", []
        )

    scored = persuasiveness > 0 or clarity > 0 or logic > 0
    return {
        "engine": ENGINE_LLM,
        "claim_identified": f"Main Proposition: {_text(raw.get('claim'), 1000) or clean[:200]}",
        "evidence_items": evidence_items,
        "evidence_strength": evidence_strength,
        "reasoning_quality": reasoning_quality,
        "clarity_score": clarity,
        "relevance_score": relevance,
        "logical_consistency": logic,
        "persuasiveness_score": persuasiveness,
        "fallacies": fallacies,
        "counterarguments": counterarguments,
        "notes": _text(raw.get("notes"), 2000),
        "status": "analyzed" if scored else "not_analyzed",
        "message": (
            f"Analyzed by the LLM agent ({_text(raw.get('strength_label')) or 'unrated'})."
            if scored
            else _text(raw.get("notes"), 500) or "The model could not score this text."
        ),
    }


def _deterministic_analysis(clean_text: str) -> Dict[str, Any]:
    """Local regex/arithmetic path. ai_engine.analyze_argument raises on empty text."""
    try:
        raw = ai_engine_service.analyze_argument(clean_text)
    except ValueError as exc:
        return _empty_analysis(str(exc), ENGINE_DETERMINISTIC)

    fallacies = _normalize_fallacies(raw.get("fallacies"), confidence_default=_REGEX_FALLACY_CONFIDENCE)
    for item in fallacies:
        item["confidence"] = _REGEX_FALLACY_CONFIDENCE

    return {
        "engine": ENGINE_DETERMINISTIC,
        "claim_identified": _text(raw.get("claim_identified"), 1000),
        "evidence_items": [],  # the local engine counts evidence markers, it does not extract them
        "evidence_strength": _num(raw.get("evidence_strength")),
        "reasoning_quality": _num(raw.get("reasoning_quality")),
        "clarity_score": _num(raw.get("clarity_score")),
        "relevance_score": _num(raw.get("relevance_score")),
        "logical_consistency": _num(raw.get("logical_consistency")),
        "persuasiveness_score": _num(raw.get("persuasiveness_score")),
        "fallacies": fallacies,
        "counterarguments": _normalize_rebuttals(
            raw.get("counterarguments"), strength_default=_TEMPLATE_REBUTTAL_STRENGTH
        ),
        "notes": (
            f"Scored locally without an LLM: {len(fallacies)} fallacy pattern(s) matched. "
            "Set GROQ_API_KEY or GEMINI_API_KEY for reasoning-based analysis."
        ),
        "status": "analyzed",
        "message": "Analyzed by the local deterministic engine (no LLM key configured).",
    }


# ---------------------------------------------------------------------------
# Capability 2: fallacy detection
# ---------------------------------------------------------------------------
def detect_fallacies(text: str) -> Dict[str, Any]:
    """Scan for the spec's eight fallacies. Always returns a list, never None."""
    clean = " ".join(_text(text, 20000).split())
    if not clean:
        return {
            "engine": ENGINE_DETERMINISTIC,
            "fallacies": [],
            "status": "no_clear_fallacies_detected",
            "message": "No argument text was provided.",
        }

    agent = _agent("fallacy_detection")
    if agent is not None:
        raw = agent.run(clean)
        fallacies = _normalize_fallacies(raw.get("fallacies_found"))
        return {
            "engine": ENGINE_LLM,
            "fallacies": fallacies,
            "status": "fallacies_detected" if fallacies else "no_clear_fallacies_detected",
            "message": _text(raw.get("message"), 600)
            or (f"Detected {len(fallacies)} possible fallacy/ies." if fallacies else "No clear fallacy detected."),
        }

    fallacies = _normalize_fallacies(
        ai_engine_service._detect_fallacies(clean),  # noqa: SLF001 - the only public-enough entry point
        confidence_default=_REGEX_FALLACY_CONFIDENCE,
    )
    for item in fallacies:
        item["confidence"] = _REGEX_FALLACY_CONFIDENCE
    return {
        "engine": ENGINE_DETERMINISTIC,
        "fallacies": fallacies,
        "status": "fallacies_detected" if fallacies else "no_clear_fallacies_detected",
        "message": (
            f"Pattern matching found {len(fallacies)} fallacy indicator(s)."
            if fallacies
            else "No fallacy pattern matched. Pattern matching only catches known phrasings."
        ),
    }


# ---------------------------------------------------------------------------
# Capability 3: counterargument generation
# ---------------------------------------------------------------------------
def generate_counterarguments(text: str, topic: str = "", position: str = "") -> Dict[str, Any]:
    """Five typed rebuttals (Logical, Evidence-Based, Ethical, Practical, Policy)."""
    clean = " ".join(_text(text, 20000).split())
    if not clean:
        return {
            "engine": ENGINE_DETERMINISTIC,
            "claim_targeted": "",
            "counterarguments": [],
            "strongest_type": "",
            "overall_strategy": "",
            "status": "no_counterarguments_generated",
            "message": "No argument text was provided.",
        }

    agent = _agent("counterargument")
    if agent is not None:
        raw = agent.run(clean, topic=_text(topic, 500), position=_text(position, 120))
        rebuttals = _normalize_rebuttals(raw.get("rebuttals"))
        if rebuttals:
            return {
                "engine": ENGINE_LLM,
                "claim_targeted": _text(raw.get("claim_targeted"), 1000) or clean[:200],
                "counterarguments": rebuttals,
                "strongest_type": _text(raw.get("strongest_type"), 60),
                "overall_strategy": _text(raw.get("overall_strategy"), 2000),
                "status": "counterarguments_generated",
                "message": _text(raw.get("message"), 600) or f"Generated {len(rebuttals)} rebuttal type(s).",
            }
        # The agent returned nothing usable - fall through to templates rather
        # than hand the caller an empty list.
        logger.info("Counterargument agent produced no usable rebuttals; using templates.")

    try:
        raw_local = ai_engine_service.analyze_argument(clean)
    except ValueError as exc:
        return {
            "engine": ENGINE_DETERMINISTIC,
            "claim_targeted": clean[:200],
            "counterarguments": [],
            "strongest_type": "",
            "overall_strategy": "",
            "status": "no_counterarguments_generated",
            "message": str(exc),
        }

    rebuttals = _normalize_rebuttals(
        raw_local.get("counterarguments"), strength_default=_TEMPLATE_REBUTTAL_STRENGTH
    )
    return {
        "engine": ENGINE_DETERMINISTIC,
        "claim_targeted": _text(raw_local.get("claim_identified"), 1000).replace("Main Proposition: ", ""),
        "counterarguments": rebuttals,
        "strongest_type": "Logical",
        "overall_strategy": (
            "Open with the logical objection to expose the hidden assumption, then press on evidence "
            "quality, and close on practicality."
        ),
        "status": "counterarguments_generated" if rebuttals else "no_counterarguments_generated",
        "message": f"Generated {len(rebuttals)} template rebuttal(s) locally (no LLM key configured).",
    }


# ---------------------------------------------------------------------------
# Capability 4: debate opponent
# ---------------------------------------------------------------------------
def _normalize_opponent(raw: Dict[str, Any], persona: str, turn_index: int, engine: str) -> Dict[str, Any]:
    """
    NOTE on rebuttal_strength_percent: it measures how strong the USER's argument
    was this turn, not the AI's reply. That is what the learner needs and what
    both engines actually produce (ai_engine derives it from the user's text;
    the agent returns user_argument_strength). The field name predates this file.
    """
    strength = raw.get("rebuttal_strength_percent", raw.get("user_argument_strength", 0))
    return {
        "engine": engine,
        "persona": persona,
        "opponent_rebuttal": _text(raw.get("opponent_rebuttal") or raw.get("response_text"), 4000),
        "tactic_used": _text(raw.get("tactic_used"), 200),
        "attacked_point": _text(raw.get("attacked_point"), 600),
        "challenge_question": _text(raw.get("challenge_question"), 600),
        "rebuttal_strength_percent": _num(strength),
        "coaching_tip": _text(raw.get("coaching_tip") or raw.get("coach_note"), 2000),
        "fallacies_detected": _normalize_fallacies(
            raw.get("fallacies_detected") or raw.get("fallacies_detected_in_user")
        ),
        "turn_index": max(0, _int(turn_index, default=0, high=10_000)),
        "status": _text(raw.get("status"), 60) or "response_generated",
        "message": _text(raw.get("message"), 600),
    }


def simulate_opponent(
    user_argument: str,
    topic: str = "",
    persona: str = DEFAULT_PERSONA,
    history: Optional[List[Dict[str, Any]]] = None,
    user_position: str = "Affirmative",
    difficulty: str = DEFAULT_DIFFICULTY,
    turn_index: int = 0,
) -> Dict[str, Any]:
    """
    One turn of the AI debate. `history` (oldest first) is what makes the
    opponent escalate instead of repeating itself; the deterministic engine
    ignores it, which is exactly why the LLM path is worth having.
    """
    canonical_persona = _resolve_persona(persona)
    clean = " ".join(_text(user_argument, 20000).split())

    if not clean:
        return _normalize_opponent(
            {
                "opponent_rebuttal": "Make your argument and I will respond to it.",
                "challenge_question": "What is your central claim, stated in one sentence?",
                "status": "fallback_response",
                "message": "No argument was submitted for this turn.",
            },
            canonical_persona,
            turn_index,
            ENGINE_DETERMINISTIC,
        )

    agent = _agent("opponent")
    if agent is not None:
        raw = agent.run(
            user_argument=clean,
            topic=_text(topic, 1000),
            persona=canonical_persona,
            history=history or [],
            user_position=_text(user_position, 60) or "Affirmative",
            difficulty=_resolve_difficulty(difficulty),
            turn_index=max(0, _int(turn_index, default=0, high=10_000)),
        )
        result = _normalize_opponent(raw, canonical_persona, raw.get("turn_index", turn_index), ENGINE_LLM)
        if result["opponent_rebuttal"]:
            # The opponent agent does not run fallacy detection itself; the UI
            # shows "fallacies in your argument" beside the reply, so fill it.
            if not result["fallacies_detected"]:
                result["fallacies_detected"] = detect_fallacies(clean).get("fallacies", [])
            return result
        logger.info("Opponent agent returned no text; using the deterministic engine for this turn.")

    try:
        raw_local = ai_engine_service.generate_simulation_response(clean, canonical_persona)
    except ValueError as exc:
        return _normalize_opponent(
            {
                "opponent_rebuttal": "That turn could not be processed.",
                "status": "fallback_response",
                "message": str(exc),
            },
            canonical_persona,
            turn_index,
            ENGINE_DETERMINISTIC,
        )

    raw_local.setdefault("message", "Generated by the local deterministic engine (no LLM key configured).")
    return _normalize_opponent(raw_local, canonical_persona, turn_index, ENGINE_DETERMINISTIC)


def opening_statement(
    topic: str,
    persona: str = DEFAULT_PERSONA,
    user_position: str = "Affirmative",
) -> Dict[str, Any]:
    """Start a round before the human has spoken. Same shape as simulate_opponent."""
    canonical_persona = _resolve_persona(persona)
    agent = _agent("opponent")

    if agent is not None:
        raw = agent.opening_statement(
            topic=_text(topic, 1000),
            persona=canonical_persona,
            user_position=_text(user_position, 60) or "Affirmative",
        )
        result = _normalize_opponent(raw, canonical_persona, 0, ENGINE_LLM)
        if result["opponent_rebuttal"]:
            return result

    openings = {
        "The Contrarian": "Interesting position. I disagree, and here is why.",
        "The Academic": "Let us be precise about what is actually being claimed here.",
        "The Strategist": "Set aside whether it is desirable. Consider whether it is workable.",
    }
    clean_topic = _text(topic, 500) or "this motion"
    return _normalize_opponent(
        {
            "opponent_rebuttal": (
                f"{openings[canonical_persona]} On '{clean_topic}', I will take the opposing side. "
                "State your case and I will test it."
            ),
            "challenge_question": f"What is your strongest single reason to support '{clean_topic}'?",
            "status": "opening_generated",
            "message": "Opening generated locally (no LLM key configured).",
        },
        canonical_persona,
        0,
        ENGINE_DETERMINISTIC,
    )


# ---------------------------------------------------------------------------
# Capability 5: performance scoring
# ---------------------------------------------------------------------------
def score_performance(
    argument_text: str,
    topic: str = "",
    transcript: Optional[List[Dict[str, Any]]] = None,
    fallacies_found: Optional[List[Dict[str, Any]]] = None,
    speech_metrics: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Five sub-scores plus the weighted total, grade, and coaching notes.

    The total is ALWAYS computed by compute_weighted_score() - the LLM is
    explicitly told not to compute it - so the 30/20/20/15/15 model can never
    drift no matter what the model returns.
    """
    clean = " ".join(_text(argument_text, 20000).split())
    agent = _agent("scoring")

    if agent is not None and clean:
        raw = agent.run(
            argument_text=clean,
            topic=_text(topic, 1000),
            transcript=transcript or [],
            fallacies_found=fallacies_found or [],
            speech_metrics=speech_metrics or {},
        )
        if _text(raw.get("status")) == "scored":
            sub_scores = {key: _num((raw.get("sub_scores") or {}).get(key)) for key in SUB_SCORE_KEYS}
            overall = compute_weighted_score(sub_scores)
            grade, band = grade_for(overall)
            rationale = raw.get("rationale") if isinstance(raw.get("rationale"), dict) else {}
            return {
                "engine": ENGINE_LLM,
                "sub_scores": sub_scores,
                "weights": dict(SCORE_WEIGHTS),
                "rationale": {key: _text(rationale.get(key), 800) for key in SUB_SCORE_KEYS},
                "overall_score": overall,
                "grade": grade,
                "band": band,
                "strengths": _str_list(raw.get("strengths")),
                "weaknesses": _str_list(raw.get("weaknesses")),
                "improvement_suggestions": _str_list(raw.get("improvement_suggestions")),
                "judge_summary": _text(raw.get("judge_summary"), 2000),
                "status": "scored",
                "message": f"Overall weighted score {overall} ({grade} - {band}).",
            }
        logger.info("Scoring agent did not score this input; deriving scores locally.")

    return _deterministic_score(clean, fallacies_found, speech_metrics)


def _deterministic_score(
    clean_text: str,
    fallacies_found: Optional[List[Dict[str, Any]]] = None,
    speech_metrics: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Map the local engine's analysis onto the spec's five dimensions. Explicit
    mapping, not a guess:
        argument_quality        <- reasoning_quality
        evidence_usage          <- evidence_strength
        logical_consistency     <- logical_consistency
        rebuttal_effectiveness  <- persuasiveness_score
        communication_skills    <- clarity_score, or the real speech clarity when
                                   presentation metrics were supplied
    """
    empty = {key: 0.0 for key in SUB_SCORE_KEYS}
    if not clean_text:
        return {
            "engine": ENGINE_DETERMINISTIC,
            "sub_scores": empty,
            "weights": dict(SCORE_WEIGHTS),
            "rationale": {key: "" for key in SUB_SCORE_KEYS},
            "overall_score": 0.0,
            "grade": "F",
            "band": "Needs Work",
            "strengths": [],
            "weaknesses": [],
            "improvement_suggestions": [],
            "judge_summary": "",
            "status": "not_scored",
            "message": "No argument text was provided to score.",
        }

    analysis = _deterministic_analysis(clean_text)
    fallacy_count = len(fallacies_found or analysis["fallacies"])

    communication = _num(analysis["clarity_score"])
    if isinstance(speech_metrics, dict) and speech_metrics.get("clarity_score") is not None:
        # Real delivery data beats a text-only proxy.
        communication = _num(
            (_num(speech_metrics.get("clarity_score")) + _num(speech_metrics.get("confidence_score"))) / 2.0
        )

    sub_scores = {
        "argument_quality": _num(analysis["reasoning_quality"]),
        "evidence_usage": _num(analysis["evidence_strength"]),
        "logical_consistency": _num(max(0.0, analysis["logical_consistency"] - fallacy_count * 5.0)),
        "rebuttal_effectiveness": _num(analysis["persuasiveness_score"]),
        "communication_skills": communication,
    }
    overall = compute_weighted_score(sub_scores)
    grade, band = grade_for(overall)

    strengths = [f"{key.replace('_', ' ').title()} scored {value}" for key, value in sub_scores.items() if value >= 75]
    weaknesses = [f"{key.replace('_', ' ').title()} scored {value}" for key, value in sub_scores.items() if value < 60]

    return {
        "engine": ENGINE_DETERMINISTIC,
        "sub_scores": sub_scores,
        "weights": dict(SCORE_WEIGHTS),
        "rationale": {
            "argument_quality": "Derived from local reasoning-quality analysis.",
            "evidence_usage": "Derived from density of evidence markers (numbers, citations, study references).",
            "logical_consistency": f"Reduced by {fallacy_count} detected fallacy pattern(s).",
            "rebuttal_effectiveness": "Derived from local persuasiveness analysis.",
            "communication_skills": (
                "Derived from measured speech clarity and confidence."
                if isinstance(speech_metrics, dict) and speech_metrics.get("clarity_score") is not None
                else "Derived from text clarity (no audio metrics supplied)."
            ),
        },
        "overall_score": overall,
        "grade": grade,
        "band": band,
        "strengths": strengths[:5],
        "weaknesses": weaknesses[:5],
        "improvement_suggestions": _local_suggestions(sub_scores, fallacy_count),
        "judge_summary": (
            f"Scored {overall} ({grade} - {band}) by the local engine. Configure an LLM API key for "
            "reasoning-based judging with per-dimension rationale."
        ),
        "status": "scored",
        "message": f"Overall weighted score {overall} ({grade} - {band}), local engine.",
    }


def _local_suggestions(sub_scores: Dict[str, float], fallacy_count: int) -> List[str]:
    tips: List[str] = []
    if sub_scores["evidence_usage"] < 70:
        tips.append("Add specific, verifiable evidence - a statistic, study, or named source per major claim.")
    if fallacy_count:
        tips.append(f"Rewrite the {fallacy_count} flagged passage(s) to remove the fallacious reasoning pattern.")
    if sub_scores["communication_skills"] < 70:
        tips.append("Shorten sentences and cut filler so each point lands clearly.")
    if sub_scores["rebuttal_effectiveness"] < 70:
        tips.append("Address the strongest opposing point directly before advancing your own.")
    if not tips:
        tips.append("Solid across all five dimensions - work on tightening delivery and pre-empting rebuttals.")
    return tips[:5]


# ---------------------------------------------------------------------------
# Capability 6: speech / presentation analysis
# ---------------------------------------------------------------------------
def transcribe_audio(audio_path: str, language: Optional[str] = None) -> Dict[str, Any]:
    """
    Audio file -> text with word timings. There is no deterministic fallback:
    without faster-whisper there is simply no transcript, and saying so beats
    returning something invented.
    """
    empty = {
        "engine": ENGINE_DETERMINISTIC,
        "transcript": "",
        "language": "",
        "duration_seconds": 0.0,
        "words": [],
        "segments": [],
        "status": "transcription_unavailable",
        "message": "",
    }

    agent = _agent("speech_analysis")
    if agent is None:
        empty["message"] = (
            "Transcription needs the ai-ml agent layer: "
            f"{_load_error or 'not loaded'}. Type or paste the text instead."
        )
        return empty

    raw = agent.transcribe(_text(audio_path, 1000), language=_text(language, 20) or None)
    return {
        "engine": ENGINE_LLM,
        "transcript": _text(raw.get("transcript"), 50000),
        "language": _text(raw.get("language"), 20),
        "duration_seconds": _num(raw.get("duration_seconds"), high=86400.0),
        "words": raw.get("words") if isinstance(raw.get("words"), list) else [],
        "segments": raw.get("segments") if isinstance(raw.get("segments"), list) else [],
        "status": _text(raw.get("status"), 60) or "transcription_unavailable",
        "message": _text(raw.get("message"), 600),
    }


def analyze_speech(
    transcript: str = "",
    audio_path: Optional[str] = None,
    duration_seconds: float = 0.0,
    language: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Delivery metrics. The first six metric keys match the presentation_metrics
    table columns exactly, so routers persist them without renaming anything.

    Pass audio_path for real timings (needs the agent layer + faster-whisper), or
    transcript + duration_seconds for the text-only path, which works everywhere.
    """
    clean_transcript = _text(transcript, 50000)
    agent = _agent("speech_analysis")

    if agent is not None:
        raw = agent.run(
            audio_path=_text(audio_path, 1000) or None,
            transcript=clean_transcript,
            duration_seconds=_num(duration_seconds, high=86400.0),
            language=_text(language, 20) or None,
        )
        if _text(raw.get("status")) == "analyzed":
            return {
                "engine": ENGINE_LLM,
                "transcript": _text(raw.get("transcript"), 50000) or clean_transcript,
                "language": _text(raw.get("language"), 20),
                "metrics": _normalize_metrics(raw.get("metrics")),
                "feedback": raw.get("feedback") if isinstance(raw.get("feedback"), dict) else {},
                "transcription_status": _text(raw.get("transcription_status"), 60) or "skipped",
                "status": "analyzed",
                "message": _text(raw.get("message"), 600) or "Analyzed by the speech analysis agent.",
            }
        # Keep whatever transcript Whisper managed to produce and let the local
        # engine measure it, rather than losing the work.
        clean_transcript = _text(raw.get("transcript"), 50000) or clean_transcript
        if not _num(duration_seconds):
            duration_seconds = _num(raw.get("metrics", {}).get("duration_seconds"), high=86400.0)
        logger.info("Speech agent did not complete; measuring locally instead.")

    if not clean_transcript:
        return {
            "engine": ENGINE_DETERMINISTIC,
            "transcript": "",
            "language": "",
            "metrics": _normalize_metrics({}),
            "feedback": {},
            "transcription_status": "transcription_unavailable" if audio_path else "skipped",
            "status": "not_analyzed",
            "message": (
                "Audio could not be transcribed and no text was supplied."
                if audio_path
                else "No speech text was provided."
            ),
        }

    seconds = _num(duration_seconds, high=86400.0)
    if seconds <= 0:
        # speech_engine raises on a non-positive duration. Estimate from word
        # count at an average 140 wpm so the caller still gets metrics; wpm then
        # reflects the assumption, which the message states plainly.
        word_count = len(re.findall(r"\b[\w']+\b", clean_transcript))
        seconds = max(1.0, round(word_count / 140.0 * 60.0, 1))
        estimated = True
    else:
        estimated = False

    try:
        raw_local = speech_engine_service.analyze_speech(clean_transcript, seconds)
    except ValueError as exc:
        return {
            "engine": ENGINE_DETERMINISTIC,
            "transcript": clean_transcript,
            "language": "",
            "metrics": _normalize_metrics({}),
            "feedback": {},
            "transcription_status": "skipped",
            "status": "not_analyzed",
            "message": str(exc),
        }

    metrics = _normalize_metrics(raw_local)
    metrics["duration_seconds"] = seconds
    metrics["word_count"] = len(re.findall(r"\b[\w']+\b", clean_transcript))
    return {
        "engine": ENGINE_DETERMINISTIC,
        "transcript": clean_transcript,
        "language": "",
        "metrics": metrics,
        "feedback": {},
        "transcription_status": "skipped",
        "status": "analyzed",
        "message": (
            f"Measured locally, assuming a {seconds}s delivery at an average pace "
            "(no duration supplied, so wpm is an estimate)."
            if estimated
            else "Measured by the local speech engine (no LLM key configured)."
        ),
    }


# The first six keys are the presentation_metrics table columns; the rest are
# prosody extras the API can return but the table does not store.
_METRIC_DEFAULTS: Dict[str, Any] = {
    "speech_pace_wpm": 0.0,
    "filler_words_count": 0,
    "filler_words_list": "None",
    "confidence_score": 0.0,
    "clarity_score": 0.0,
    "engagement_score": 0.0,
    "word_count": 0,
    "duration_seconds": 0.0,
    "pause_count": 0,
    "longest_pause_seconds": 0.0,
    "average_pause_seconds": 0.0,
    "pace_variability": 0.0,
    "speaking_time_seconds": 0.0,
    "average_sentence_length": 0.0,
    "sentence_count": 0,
}

DB_METRIC_KEYS: Tuple[str, ...] = (
    "speech_pace_wpm",
    "filler_words_count",
    "filler_words_list",
    "confidence_score",
    "clarity_score",
    "engagement_score",
)


def _normalize_metrics(metrics: Any) -> Dict[str, Any]:
    """Guarantee every metric key exists with the right type, whatever came in."""
    source = metrics if isinstance(metrics, dict) else {}
    result: Dict[str, Any] = {}
    for key, default in _METRIC_DEFAULTS.items():
        value = source.get(key, default)
        if isinstance(default, str):
            result[key] = _text(value, 1000) or "None"
        elif isinstance(default, int) and not isinstance(default, bool):
            result[key] = _int(value, default=default, high=1_000_000)
        else:
            # wpm and durations legitimately exceed 100, so no 0-100 clamp here.
            result[key] = _num(value, default=default, high=1_000_000.0)
    return result


def db_metrics(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Just the six keys that map to presentation_metrics columns."""
    normalized = _normalize_metrics(metrics)
    return {key: normalized[key] for key in DB_METRIC_KEYS}


# The agent calls it evidence_usage; the performance_scores table and the API
# schema call it evidence_use. Mapped here rather than in each of the nine
# routers, so the rename lives in exactly one place.
SUB_SCORE_TO_API: Dict[str, str] = {
    "argument_quality": "argument_quality",
    "evidence_usage": "evidence_use",
    "logical_consistency": "logical_consistency",
    "rebuttal_effectiveness": "rebuttal_effectiveness",
    "communication_skills": "communication_skills",
}
API_TO_SUB_SCORE: Dict[str, str] = {api: agent for agent, api in SUB_SCORE_TO_API.items()}


def to_api_scores(scored: Dict[str, Any]) -> Dict[str, Any]:
    """
    score_performance() output -> the field names PerformanceScore and
    WeightedScoreResponse use. The total is recomputed, never copied, so a
    hand-edited payload cannot smuggle in a bogus overall score.
    """
    sub_scores = scored.get("sub_scores") if isinstance(scored, dict) else {}
    sub_scores = sub_scores if isinstance(sub_scores, dict) else {}
    payload = {api_key: _num(sub_scores.get(agent_key)) for agent_key, api_key in SUB_SCORE_TO_API.items()}
    payload["overall_weighted_score"] = compute_weighted_score(sub_scores)
    return payload


def from_api_scores(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inverse of to_api_scores, for the coach's manual-override path: API field
    names in, agent sub-score keys out, ready for compute_weighted_score().
    """
    source = payload if isinstance(payload, dict) else {}
    return {agent_key: _num(source.get(api_key)) for api_key, agent_key in API_TO_SUB_SCORE.items()}



if __name__ == "__main__":
    # Smoke test: python -m services.agent_bridge   (run from backend/)
    import json

    print("=" * 70)
    print("ENGINE STATUS")
    print("=" * 70)
    print(json.dumps(warmup(), indent=2))

    SAMPLE = (
        "Cities should make public transport free. Fare collection eats roughly 30 percent of the "
        "revenue it raises, and removing fares cuts car traffic, which lowers emissions."
    )
    WEAK = "You cannot trust her transport policy - she never even finished university."

    for label, text in [("STRONG", SAMPLE), ("FALLACIOUS", WEAK)]:
        print("\n" + "=" * 70)
        print(f"analyze_argument - {label}")
        print("=" * 70)
        result = analyze_argument(text, topic="Free public transport")
        print(f"engine   : {result['engine']}")
        print(f"claim    : {result['claim_identified'][:100]}")
        print(
            "scores   : evidence={evidence_strength} reasoning={reasoning_quality} "
            "clarity={clarity_score} logic={logical_consistency}".format(**result)
        )
        print(f"fallacies: {[f['fallacy_type'] for f in result['fallacies']]}")
        print(f"rebuttals: {[r['rebuttal_type'] for r in result['counterarguments']]}")

    print("\n" + "=" * 70)
    print("simulate_opponent")
    print("=" * 70)
    turn = simulate_opponent(SAMPLE, topic="Free public transport", persona="academic", turn_index=0)
    print(f"engine : {turn['engine']}\npersona: {turn['persona']}\nreply  : {turn['opponent_rebuttal'][:200]}")

    print("\n" + "=" * 70)
    print("score_performance")
    print("=" * 70)
    scored = score_performance(SAMPLE, topic="Free public transport")
    print(f"engine : {scored['engine']}")
    print(json.dumps(scored["sub_scores"], indent=2))
    print(f"overall: {scored['overall_score']} ({scored['grade']} - {scored['band']})")

    print("\n" + "=" * 70)
    print("analyze_speech (text-only)")
    print("=" * 70)
    speech = analyze_speech(transcript="Um, so basically, like, I think we should, you know, do this.", duration_seconds=8.0)
    print(f"engine : {speech['engine']}")
    print(json.dumps(db_metrics(speech["metrics"]), indent=2))

    print("\n" + "=" * 70)
    print("Offline invariant checks")
    print("=" * 70)
    checks = [
        ("weights sum to 1.0", abs(sum(SCORE_WEIGHTS.values()) - 1.0) < 1e-9),
        ("perfect score is 100", compute_weighted_score({k: 100 for k in SUB_SCORE_KEYS}) == 100.0),
        ("empty sub_scores is 0", compute_weighted_score({}) == 0.0),
        ("missing dims count as 0", compute_weighted_score({"argument_quality": 100}) == 30.0),
        ("out-of-range clamped", compute_weighted_score({k: 500 for k in SUB_SCORE_KEYS}) == 100.0),
        ("grade 95 -> A", grade_for(95) == ("A", "Excellent")),
        ("grade 59 -> F", grade_for(59) == ("F", "Needs Work")),
        ("persona loose match", _resolve_persona("academic") == "The Academic"),
        ("persona unknown -> default", _resolve_persona("wizard") == DEFAULT_PERSONA),
        ("difficulty unknown -> medium", _resolve_difficulty("brutal") == "medium"),
        ("invented fallacy dropped", _normalize_fallacies([{"type": "Vibes Fallacy"}]) == []),
        ("unknown rebuttal dropped", _normalize_rebuttals([{"rebuttal_type": "Vibes", "rebuttal_text": "x"}]) == []),
        ("empty text never raises", analyze_argument("")["status"] == "not_analyzed"),
        ("empty speech never raises", analyze_speech("")["status"] == "not_analyzed"),
        ("all six DB keys present", set(db_metrics({})) == set(DB_METRIC_KEYS)),
    ]
    passed = sum(1 for _, ok in checks if ok)
    for name, ok in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    print(f"\n{passed}/{len(checks)} invariant checks passed.")
