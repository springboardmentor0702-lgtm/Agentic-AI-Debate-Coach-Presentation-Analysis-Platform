"""Deterministic local AI/ML services for argument analysis and debate simulation.

The service is intentionally provider-neutral: it can run without an external LLM,
while exposing structured outputs that can later be enriched by an LLM adapter.
FAISS is used when available and a deterministic NumPy fallback keeps local setup
simple.
"""

from __future__ import annotations

import hashlib
import re
from typing import Any, Dict, List, Optional

import numpy as np

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

    def analyze_argument(self, text: str) -> Dict[str, Any]:
        text = " ".join(text.split())
        if not text:
            raise ValueError("Argument text cannot be empty.")

        self.index_argument(text)
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

        # Keep the quoted claim readable: never cut it in the middle of a word.
        claim_excerpt = claim
        if len(claim_excerpt) > 120:
            claim_excerpt = claim_excerpt[:120].rsplit(" ", 1)[0].rstrip(" ,.;:") + "..."

        counterarguments = [
            {
                "rebuttal_type": "Logical",
                "rebuttal_text": f"Your proposition, '{claim_excerpt}', may rely on an unstated assumption. Test whether the conclusion still follows if that assumption is weakened.",
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

    def generate_simulation_response(self, text: str, persona: str) -> Dict[str, Any]:
        analysis = self.analyze_argument(text)
        persona = persona if persona in SUPPORTED_PERSONAS else "The Contrarian"
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
        # Choose a rebuttal based on the actual argument topic/claim first,
        # then fall back to the analytical scores. This prevents every weak
        # argument from receiving the same generic rebuttal.
        normalized = text.lower()
        fallacies = analysis["fallacies"]

        if re.search(r"\b(teacher|teachers|school|classroom|education|educator|teaching)\b", normalized) and re.search(r"\b(replace|replacing|replacement|substitut|take over)\b", normalized):
            primary_counter = {
                "rebuttal_type": "Practical",
                "rebuttal_text": (
                    "Replacing teachers assumes teaching is mainly an information-delivery task, "
                    "but teachers also provide mentorship, classroom management, emotional support, "
                    "and individualized human interaction."
                ),
                "challenge_question": (
                    "What evidence shows AI can perform those human-centered teaching functions "
                    "at the same level across different students and classrooms?"
                ),
            }
        elif re.search(r"\b(ai|artificial intelligence|model|models|chatbot|chatbots)\b", normalized) and re.search(r"\b(always|fully|completely|100%|all|every|correct|accurate|never wrong)\b", normalized):
            primary_counter = {
                "rebuttal_type": "Evidence-Based",
                "rebuttal_text": (
                    "The claim that AI gives fully correct answers is an absolute claim and "
                    "assumes that AI outputs are universally accurate across subjects, contexts, "
                    "and edge cases."
                ),
                "challenge_question": (
                    "What independent evidence or verification process demonstrates that AI answers "
                    "remain correct across those different situations?"
                ),
            }
        elif re.search(r"\b(ai|artificial intelligence|model|models)\b", normalized) and re.search(r"\b(not|don't|do not|incorrect|incorrectly|wrong|error|errors|mistake|mistakes)\b", normalized):
            primary_counter = {
                "rebuttal_type": "Evidence-Based",
                "rebuttal_text": (
                    "Acknowledging that some AI systems can produce incorrect answers weakens any "
                    "absolute claim about AI accuracy, but the scope of the problem still needs to "
                    "be established."
                ),
                "challenge_question": (
                    "Which AI systems are you referring to, how often do they make errors, and what "
                    "evidence supports that error rate?"
                ),
            }
        elif re.search(r"\b(legal|liable|liability|law|lawsuit|regulation|regulatory|legally)\b", normalized):
            primary_counter = {
                "rebuttal_type": "Policy",
                "rebuttal_text": (
                    "Legal liability requires a clear basis for responsibility, especially when an AI "
                    "system, developer, deployer, and user may all contribute to the outcome."
                ),
                "challenge_question": (
                    "Who should be legally responsible when an autonomous system causes unintended damage, "
                    "and how should that responsibility be determined?"
                ),
            }
        elif fallacies:
            primary_counter = analysis["counterarguments"][0]
        elif analysis["evidence_strength"] < 65:
            primary_counter = analysis["counterarguments"][1]
        elif analysis["logical_consistency"] < 80:
            primary_counter = analysis["counterarguments"][0]
        elif analysis["clarity_score"] < 75:
            primary_counter = analysis["counterarguments"][3]
        elif analysis["persuasiveness_score"] < 80:
            primary_counter = analysis["counterarguments"][2]
        else:
            primary_counter = analysis["counterarguments"][4]

        strength = _clamp(55.0 + analysis["logical_consistency"] * 0.25 + analysis["reasoning_quality"] * 0.2)
        if fallacies:
            names = ", ".join(item["fallacy_type"] for item in fallacies)
            coaching_tip = (
                f"Fallacy alert: {names}. {fallacies[0]['correction_suggestion']} "
                "Address the opponent's strongest challenge before introducing a new point."
            )
        elif analysis["evidence_strength"] < 65:
            coaching_tip = (
                "Evidence gap: add a specific, verifiable source, statistic, study, or example "
                "to support your central claim before moving to a new point."
            )
        elif analysis["logical_consistency"] < 80:
            coaching_tip = (
                "Logic focus: make the connection between your premises and conclusion explicit, "
                "and avoid unsupported leaps in reasoning."
            )
        elif analysis["clarity_score"] < 75:
            coaching_tip = (
                "Clarity focus: shorten the argument, state one main claim, and connect each "
                "supporting point directly to it."
            )
        else:
            coaching_tip = (
                f"{styles[persona]} Your argument is relatively strong; now directly answer "
                "the opponent's strongest challenge and strengthen your evidence."
            )

        return {
            "opponent_rebuttal": f"{prefixes[persona]} {primary_counter['rebuttal_text']} {primary_counter['challenge_question']}",
            "fallacies_detected": fallacies,
            "rebuttal_strength_percent": round(strength, 1),
            "coaching_tip": coaching_tip,
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
