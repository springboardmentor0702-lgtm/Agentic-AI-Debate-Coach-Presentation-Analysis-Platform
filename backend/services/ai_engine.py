"""Deterministic local AI/ML services for argument analysis and debate simulation.

The service is intentionally provider-neutral: it can run without an external LLM,
while exposing structured outputs that can later be enriched by an LLM adapter.
FAISS is used when available and a deterministic NumPy fallback keeps local setup
simple.
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any, Dict, List, Optional

import numpy as np

try:
    from config import settings
except ImportError:  # pragma: no cover - allows isolated service imports.
    settings = None

try:  # FAISS is optional at runtime, but included in the backend requirements.
    import faiss
except ImportError:  # pragma: no cover - exercised only in minimal deployments.
    faiss = None


EMBEDDING_DIMENSION = 128
SUPPORTED_PERSONAS = {"The Contrarian", "The Academic", "The Strategist"}

FALLACY_PATTERNS: Dict[str, Dict[str, Any]] = {
    "Ad Hominem": {
        "patterns": [
            r"\b(?:idiot|fool|corrupt|liar|ignorant|stupid|incompetent)\b",
            r"\byou\s+(?:don't|do not)\s+know\b",
        ],
        "explanation": "Attacking the opponent's character or personal traits rather than engaging with their argument.",
        "correction": "Focus directly on the evidence and logical premises of the claim rather than personal attributes.",
    },
    "Straw Man": {
        "patterns": [
            r"\bso\s+you're\s+saying\b",
            r"\byou\s+want\s+to\s+(?:destroy|eliminate)\b",
            r"\bclaim(?:s|ing)?\s+that\s+all\b",
        ],
        "explanation": "Misrepresenting or exaggerating an opponent's argument to make it easier to attack.",
        "correction": "State the opponent's true position accurately before refuting it.",
    },
    "False Dilemma": {
        "patterns": [
            r"\beither\b.{0,160}\bor\b",
            r"\bonly\s+two\s+choices\b",
            r"\bwith\s+us\s+or\s+against\s+us\b",
        ],
        "explanation": "Presenting two alternatives as the only possibilities when additional options exist.",
        "correction": "Acknowledge nuanced middle-ground positions and alternative solutions.",
    },
    "Slippery Slope": {
        "patterns": [
            r"\b(?:inevitably|eventually)\s+(?:lead|result)\b",
            r"\bnext\s+thing\s+you\s+know\b",
            r"\bslippery\s+slope\b",
            r"\bcatastrophe\b",
        ],
        "explanation": "Asserting that a first step will inevitably cause a chain of negative events without proving each causal link.",
        "correction": "Provide evidence for each causal step instead of assuming an inevitable chain reaction.",
    },
    "Appeal to Authority": {
        "patterns": [
            r"\b(?:because|as)\s+(?:an?\s+)?(?:authority|expert)\s+(?:said|says)\b",
            r"\bfamous\s+person\s+said\b",
            r"\bcelebrity\s+agrees\b",
            r"\bunnamed\s+experts?\s+claim\b",
        ],
        "explanation": "Treating a claim as true solely because an authority stated it without sufficient corroboration.",
        "correction": "Cite verifiable primary evidence and explain why the source is relevant to this claim.",
    },
    "Circular Reasoning": {
        "patterns": [
            r"\bobviously\s+true\s+because\b",
            r"\bself[- ]evident\s+that\b",
            r"\btrue\s+because\s+it\s+is\s+true\b",
        ],
        "explanation": "Using the conclusion as a premise instead of providing independent support.",
        "correction": "Provide evidence that does not assume the conclusion being defended.",
    },
    "Hasty Generalization": {
        "patterns": [
            r"\beveryone\s+knows\b",
            r"\b(?:all|none)\s+of\s+them\b",
            r"\b(?:always|never)\b",
            r"\bbased\s+on\s+my\s+one\s+(?:friend|experience)\b",
        ],
        "explanation": "Making a broad claim from an insufficient or unrepresentative sample.",
        "correction": "Qualify the claim and support it with representative data or an appropriately bounded sample.",
    },
    "Red Herring": {
        "patterns": [
            r"\bwhat\s+about\b",
            r"\bmoving\s+on\s+to\b",
            r"\b(?:irrelevant|distraction)\s+topic\b",
            r"\binstead\s+of\s+talking\s+about\b",
        ],
        "explanation": "Introducing an irrelevant issue to divert attention from the proposition under discussion.",
        "correction": "Return to the original claim and explain how each piece of evidence bears on it.",
    },
}

EVIDENCE_PATTERNS = (
    r"\b\d+(?:\.\d+)?%\b",
    r"\b\d+(?:\.\d+)?\b",
    r"\b(?:study|studies|research|survey|data|dataset|evidence|source|report|according to)\b",
    r"\b(?:citation|peer[- ]reviewed|experiment|sample|trial)\b",
)


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _sentences(text: str) -> List[str]:
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text.strip()) if part.strip()]


class AIEngine:
    """Local analysis engine with deterministic scores and semantic memory."""

    def __init__(self) -> None:
        self.argument_memory: List[Dict[str, Any]] = []
        self._faiss_index: Optional[Any] = None
        self.llm_failures = 0
        if faiss is not None:
            self._faiss_index = faiss.IndexFlatIP(EMBEDDING_DIMENSION)

    def _get_embedding(self, text: str) -> np.ndarray:
        """Create a deterministic normalized hashing embedding for local semantic search."""
        vector = np.zeros(EMBEDDING_DIMENSION, dtype="float32")
        tokens = re.findall(r"[a-z0-9']+", text.lower())
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % EMBEDDING_DIMENSION
            vector[index] += 1.0
        norm = np.linalg.norm(vector)
        if norm:
            vector /= norm
        return vector

    def index_argument(self, text: str) -> None:
        vector = self._get_embedding(text)
        self.argument_memory.append({"text": text, "vector": vector})
        if self._faiss_index is not None:
            self._faiss_index.add(vector.reshape(1, -1))

    def search_similar_arguments(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        if not self.argument_memory or top_k <= 0:
            return []
        top_k = min(top_k, len(self.argument_memory))
        query_vector = self._get_embedding(query)
        if self._faiss_index is not None:
            similarities, indices = self._faiss_index.search(query_vector.reshape(1, -1), top_k)
            return [
                {
                    "text": self.argument_memory[int(index)]["text"],
                    "similarity": round(float(similarity), 4),
                }
                for similarity, index in zip(similarities[0], indices[0])
                if int(index) >= 0
            ]

        ranked = sorted(
            ((float(np.dot(query_vector, item["vector"])), item["text"]) for item in self.argument_memory),
            reverse=True,
        )
        return [{"text": text, "similarity": round(score, 4)} for score, text in ranked[:top_k]]

    def _detect_fallacies(self, text: str) -> List[Dict[str, str]]:
        detected: List[Dict[str, str]] = []
        for fallacy_name, metadata in FALLACY_PATTERNS.items():
            if any(re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL) for pattern in metadata["patterns"]):
                detected.append(
                    {
                        "fallacy_type": fallacy_name,
                        "explanation": metadata["explanation"],
                        "correction_suggestion": metadata["correction"],
                    }
                )
        return detected

    def _analyze_with_llm(self, text: str) -> Optional[Dict[str, Any]]:
        """Use structured model output when explicitly enabled; never make it a hard dependency."""
        if settings is None or settings.AI_PROVIDER not in {"openai", "llm", "builtin"}:
            return None
        try:
            from openai import OpenAI

            client_kwargs = {}
            if settings.OPENAI_API_KEY:
                client_kwargs["api_key"] = settings.OPENAI_API_KEY
            if settings.OPENAI_API_BASE:
                client_kwargs["base_url"] = settings.OPENAI_API_BASE
            client = OpenAI(**client_kwargs)
            schema = {
                "type": "object",
                "properties": {
                    "claim_identified": {"type": "string"},
                    "evidence_strength": {"type": "number"},
                    "reasoning_quality": {"type": "number"},
                    "clarity_score": {"type": "number"},
                    "relevance_score": {"type": "number"},
                    "logical_consistency": {"type": "number"},
                    "persuasiveness_score": {"type": "number"},
                    "fallacies": {"type": "array", "items": {"type": "object", "properties": {
                        "fallacy_type": {"type": "string"},
                        "explanation": {"type": "string"},
                        "correction_suggestion": {"type": "string"},
                    }, "required": ["fallacy_type", "explanation", "correction_suggestion"], "additionalProperties": False}},
                    "counterarguments": {"type": "array", "items": {"type": "object", "properties": {
                        "rebuttal_type": {"type": "string"},
                        "rebuttal_text": {"type": "string"},
                        "challenge_question": {"type": "string"},
                        "strategy_tip": {"type": "string"},
                    }, "required": ["rebuttal_type", "rebuttal_text", "challenge_question", "strategy_tip"], "additionalProperties": False}},
                },
                "required": ["claim_identified", "evidence_strength", "reasoning_quality", "clarity_score", "relevance_score", "logical_consistency", "persuasiveness_score", "fallacies", "counterarguments"],
                "additionalProperties": False,
            }
            kwargs = {
                "model": settings.AI_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a rigorous debate coach. Analyze only the supplied argument. Return calibrated 0-100 scores, identify observable fallacies, and provide exactly five distinct rebuttal strategies. Output JSON only."},
                    {"role": "user", "content": text},
                ],
                "response_format": {"type": "json_schema", "json_schema": {"name": "argument_analysis", "strict": True, "schema": schema}},
            }
            if settings.AI_MODEL.startswith("gpt-"):
                kwargs["max_completion_tokens"] = 1800
            else:
                kwargs["max_tokens"] = 1800
            response = client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content
            result = json.loads(content)
            for key in ("fallacies", "counterarguments"):
                if not isinstance(result.get(key), list):
                    return None
            result["counterarguments"] = result["counterarguments"][:5]
            if len(result["counterarguments"]) < 5:
                return None
            for key in ("evidence_strength", "reasoning_quality", "clarity_score", "relevance_score", "logical_consistency", "persuasiveness_score"):
                result[key] = round(_clamp(float(result[key])), 1)
            return result
        except Exception:
            self.llm_failures += 1
            return None

    def analyze_argument(self, text: str) -> Dict[str, Any]:
        text = " ".join(text.split())
        if not text:
            raise ValueError("Argument text cannot be empty.")

        self.index_argument(text)
        llm_result = self._analyze_with_llm(text)
        if llm_result is not None:
            return llm_result
        sentences = _sentences(text)
        claim = sentences[0] if sentences else text
        word_count = len(re.findall(r"\b\w+\b", text))
        fallacies = self._detect_fallacies(text)
        evidence_matches = sum(len(re.findall(pattern, text, flags=re.IGNORECASE)) for pattern in EVIDENCE_PATTERNS)
        evidence_strength = _clamp(42.0 + min(24.0, word_count * 0.65) + min(34.0, evidence_matches * 8.0))
        clarity_score = _clamp(96.0 - max(0, len(sentences) - 3) * 4.0 - max(0, word_count - 100) * 0.12)
        relevance_score = _clamp(78.0 + min(15.0, len(sentences) * 2.0) - (8.0 if word_count < 8 else 0.0))
        logical_consistency = _clamp(100.0 - len(fallacies) * 15.0)
        reasoning_quality = _clamp((evidence_strength + logical_consistency + clarity_score) / 3.0)
        persuasiveness_score = _clamp(reasoning_quality * 0.7 + relevance_score * 0.3)

        counterarguments = [
            {
                "rebuttal_type": "Logical",
                "rebuttal_text": f"Your proposition, '{claim[:120]}', may rely on an unstated assumption. Test whether the conclusion still follows if that assumption is weakened.",
                "challenge_question": "Which premise is necessary for your conclusion, and what would falsify it?",
                "strategy_tip": "Identify and challenge the argument's strongest hidden assumption.",
            },
            {
                "rebuttal_type": "Evidence-Based",
                "rebuttal_text": "The claim would be stronger with representative, verifiable evidence rather than an isolated example or unsupported assertion.",
                "challenge_question": "What primary source or measured result supports the central factual claim?",
                "strategy_tip": "Ask for source quality, sample size, and whether the evidence directly measures the proposition.",
            },
            {
                "rebuttal_type": "Ethical",
                "rebuttal_text": "Consider whether the proposed outcome distributes costs and benefits fairly across the people affected by the decision.",
                "challenge_question": "Which groups bear the risk, and what safeguards protect them?",
                "strategy_tip": "Make the affected stakeholders and competing values explicit.",
            },
            {
                "rebuttal_type": "Practical",
                "rebuttal_text": "Even a sound principle can fail during implementation if its timeline, resources, incentives, and operational constraints are not addressed.",
                "challenge_question": "What is the implementation plan, budget, and measurable success criterion?",
                "strategy_tip": "Move from abstract agreement to feasibility and execution details.",
            },
            {
                "rebuttal_type": "Policy",
                "rebuttal_text": "A lower-risk alternative may achieve the same objective while preserving flexibility and reducing unintended consequences.",
                "challenge_question": "Why is this proposal preferable to a reversible or incremental alternative?",
                "strategy_tip": "Compare alternatives against the same outcome, cost, and risk criteria.",
            },
        ]
        return {
            "claim_identified": f"Main Proposition: {claim}",
            "evidence_strength": round(evidence_strength, 1),
            "reasoning_quality": round(reasoning_quality, 1),
            "clarity_score": round(clarity_score, 1),
            "relevance_score": round(relevance_score, 1),
            "logical_consistency": round(logical_consistency, 1),
            "persuasiveness_score": round(persuasiveness_score, 1),
            "fallacies": fallacies,
            "counterarguments": counterarguments,
        }

    def _simulate_with_llm(self, text: str, persona: str, prior_turns: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if settings is None or settings.AI_PROVIDER not in {"openai", "llm", "builtin"}:
            return None
        try:
            from openai import OpenAI

            client_kwargs = {}
            if settings.OPENAI_API_KEY:
                client_kwargs["api_key"] = settings.OPENAI_API_KEY
            if settings.OPENAI_API_BASE:
                client_kwargs["base_url"] = settings.OPENAI_API_BASE
            client = OpenAI(**client_kwargs)
            history = "\n".join(
                f"Turn {item.get('turn_index', '?')}: learner={item.get('user_argument', '')}; opponent={item.get('opponent_rebuttal', '')}"
                for item in prior_turns[-6:]
            ) or "No previous turns."
            schema = {
                "type": "object",
                "properties": {
                    "opponent_rebuttal": {"type": "string"},
                    "fallacies_detected": {"type": "array", "items": {"type": "object", "properties": {
                        "fallacy_type": {"type": "string"}, "explanation": {"type": "string"}, "correction_suggestion": {"type": "string"}
                    }, "required": ["fallacy_type", "explanation", "correction_suggestion"], "additionalProperties": False}},
                    "rebuttal_strength_percent": {"type": "number"},
                    "coaching_tip": {"type": "string"},
                },
                "required": ["opponent_rebuttal", "fallacies_detected", "rebuttal_strength_percent", "coaching_tip"],
                "additionalProperties": False,
            }
            kwargs = {
                "model": settings.AI_MODEL,
                "messages": [
                    {"role": "system", "content": "You are an adversarial but constructive debate coach. Stay in the selected persona, respond only to the learner argument, and return strict JSON with one concise rebuttal, detected fallacies, a 0-100 strength score, and one coaching tip."},
                    {"role": "user", "content": f"Persona: {persona}\nPrior turns:\n{history}\n\nCurrent learner argument:\n{text}"},
                ],
                "response_format": {"type": "json_schema", "json_schema": {"name": "simulation_turn", "strict": True, "schema": schema}},
            }
            if settings.AI_MODEL.startswith("gpt-"):
                kwargs["max_completion_tokens"] = 900
            elif settings.AI_MODEL.startswith("claude-"):
                kwargs["max_tokens"] = 1200
            else:
                kwargs["max_tokens"] = 1200
            response = client.chat.completions.create(**kwargs)
            result = json.loads(response.choices[0].message.content)
            if not result.get("opponent_rebuttal") or not result.get("coaching_tip"):
                return None
            result["rebuttal_strength_percent"] = round(_clamp(float(result["rebuttal_strength_percent"])), 1)
            if not isinstance(result.get("fallacies_detected"), list):
                return None
            return result
        except Exception:
            self.llm_failures += 1
            return None

    def generate_simulation_response(self, text: str, persona: str, prior_turns: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        text = " ".join(text.split())
        if not text:
            raise ValueError("Argument text cannot be empty.")
        persona = persona if persona in SUPPORTED_PERSONAS else "The Contrarian"
        llm_result = self._simulate_with_llm(text, persona, prior_turns or [])
        if llm_result is not None:
            return llm_result
        analysis = self.analyze_argument(text)
        styles = {
            "The Contrarian": "Challenge the premise directly, but keep the response tied to evidence.",
            "The Academic": "Use a Socratic style and request precise definitions, sources, and methodology.",
            "The Strategist": "Focus on implementation, incentives, trade-offs, and unintended consequences.",
        }
        prefixes = {
            "The Contrarian": "I challenge your core premise.",
            "The Academic": "Your argument needs clearer methodological support.",
            "The Strategist": "From an implementation perspective, your thesis needs a stronger plan.",
        }
        primary_counter = analysis["counterarguments"][0]
        strength = _clamp(55.0 + analysis["logical_consistency"] * 0.25 + analysis["reasoning_quality"] * 0.2)
        return {
            "opponent_rebuttal": f"{prefixes[persona]} {primary_counter['rebuttal_text']} {primary_counter['challenge_question']}",
            "fallacies_detected": analysis["fallacies"],
            "rebuttal_strength_percent": round(strength, 1),
            "coaching_tip": f"Persona style: {styles[persona]} Address the challenge directly before introducing a new point.",
        }

    def calculate_weighted_score(
        self, arg_quality: float, evidence: float, logic: float, rebuttal: float, comms: float
    ) -> float:
        components = [arg_quality, evidence, logic, rebuttal, comms]
        if any(value < 0 or value > 100 for value in components):
            raise ValueError("Every score component must be between 0 and 100.")
        weighted = (0.30 * arg_quality) + (0.20 * evidence) + (0.20 * logic) + (0.15 * rebuttal) + (0.15 * comms)
        return round(weighted, 1)


ai_engine_service = AIEngine()
