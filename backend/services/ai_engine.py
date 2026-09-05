"""Deterministic & LLM-Powered AI services for argument analysis and debate simulation.

Guarantees high-level English rhetoric, persona-driven counterarguments, 
dynamic logical fallacy audits, and seamless Groq/Gemini/Local fallback.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from typing import Any, Dict, List, Optional

# Set up python path to include the workspace root so we can import from ai-ml folder
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ai-ml")))
try:
    from app.agents.argument_analysis_agent import argument_analysis_agent
    from app.agents.fallacy_detection_agent import fallacy_detection_agent
    from app.llm_client import call_llm_json
    AI_ML_AGENTS_AVAILABLE = True
except ImportError:
    AI_ML_AGENTS_AVAILABLE = False
    call_llm_json = None

import numpy as np

try:
    import faiss
except ImportError:
    faiss = None


EMBEDDING_DIMENSION = 128
SUPPORTED_PERSONAS = {"The Contrarian", "The Academic", "The Strategist"}

FALLACY_PATTERNS: Dict[str, Dict[str, Any]] = {
    "Ad Hominem": {
        "patterns": [
            r"\b(?:idiot|fool|corrupt|liar|ignorant|stupid|incompetent)\b",
            r"\byou\s+(?:don't|do not)\s+know\b",
        ],
        "explanation": "Attacking the opponent's character or personal traits rather than engaging with the argument's premises.",
        "correction": "Focus directly on the empirical evidence and logical structure of the claim rather than personal attributes.",
    },
    "Straw Man": {
        "patterns": [
            r"\bso\s+you're\s+saying\b",
            r"\byou\s+want\s+to\s+(?:destroy|eliminate)\b",
            r"\bclaim(?:s|ing)?\s+that\s+all\b",
        ],
        "explanation": "Misrepresenting or exaggerating an opponent's argument to make it easier to attack.",
        "correction": "State the opponent's true proposition accurately before offering counter-arguments.",
    },
    "False Dilemma": {
        "patterns": [
            r"\beither\b.{0,160}\bor\b",
            r"\bonly\s+two\s+choices\b",
            r"\bwith\s+us\s+or\s+against\s+us\b",
        ],
        "explanation": "Presenting two extreme alternatives as the only possibilities when viable middle grounds exist.",
        "correction": "Acknowledge nuanced intermediate positions, hybrid frameworks, and multi-variable solutions.",
    },
    "Slippery Slope": {
        "patterns": [
            r"\b(?:inevitably|eventually)\s+(?:lead|result)\b",
            r"\bnext\s+thing\s+you\s+know\b",
            r"\bslippery\s+slope\b",
            r"\bcatastrophe\b",
        ],
        "explanation": "Asserting that a first step will inevitably trigger a disastrous chain reaction without proving each causal link.",
        "correction": "Demonstrate each sequential causal link with verifiable evidence rather than assuming inevitability.",
    },
    "Appeal to Authority": {
        "patterns": [
            r"\b(?:because|as)\s+(?:an?\s+)?(?:authority|expert)\s+(?:said|says)\b",
            r"\bfamous\s+person\s+said\b",
            r"\bcelebrity\s+agrees\b",
            r"\bunnamed\s+experts?\s+claim\b",
        ],
        "explanation": "Accepting a claim as definitively true solely because a figure of authority stated it without corroboration.",
        "correction": "Cite primary empirical sources and explain the methodology supporting the conclusion.",
    },
    "Circular Reasoning": {
        "patterns": [
            r"\bobviously\s+true\s+because\b",
            r"\bself[- ]evident\s+that\b",
            r"\btrue\s+because\s+it\s+is\s+true\b",
        ],
        "explanation": "Using the conclusion itself as a foundational premise instead of providing external justification.",
        "correction": "Provide independent, observable evidence that does not presuppose the thesis being defended.",
    },
    "Hasty Generalization": {
        "patterns": [
            r"\beveryone\s+knows\b",
            r"\b(?:all|none)\s+of\s+them\b",
            r"\b(?:always|never)\b",
            r"\bbased\s+on\s+my\s+one\s+(?:friend|experience)\b",
        ],
        "explanation": "Drawing a sweeping universal conclusion from an insufficient or statistically unrepresentative sample.",
        "correction": "Bound your claim with qualifying criteria and reference representative, aggregated datasets.",
    },
    "Red Herring": {
        "patterns": [
            r"\bwhat\s+about\b",
            r"\bmoving\s+on\s+to\b",
            r"\b(?:irrelevant|distraction)\s+topic\b",
            r"\binstead\s+of\s+talking\s+about\b",
        ],
        "explanation": "Introducing an extraneous or sensational topic to distract from the core debate motion.",
        "correction": "Maintain focus on the primary motion and address the opposing team's core contentions directly.",
    },
}

EVIDENCE_PATTERNS = (
    r"\b\d+(?:\.\d+)?%\b",
    r"\b\d+(?:\.\d+)?\b",
    r"\b(?:study|studies|research|survey|data|dataset|evidence|source|report|according to)\b",
    r"\b(?:citation|peer[- ]reviewed|experiment|sample|trial|statistics|empirically)\b",
)


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _sentences(text: str) -> List[str]:
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text.strip()) if part.strip()]


class AIEngine:
    """Intelligent analysis engine with LLM integration, deterministic fallback, and semantic memory."""

    def __init__(self) -> None:
        self.argument_memory: List[Dict[str, Any]] = []
        self._faiss_index: Optional[Any] = None
        if faiss is not None:
            self._faiss_index = faiss.IndexFlatIP(EMBEDDING_DIMENSION)

    def _get_embedding(self, text: str) -> np.ndarray:
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
        evidence_strength = _clamp(45.0 + min(24.0, word_count * 0.65) + min(34.0, evidence_matches * 8.0))
        clarity_score = _clamp(96.0 - max(0, len(sentences) - 3) * 4.0 - max(0, word_count - 100) * 0.12)
        relevance_score = _clamp(78.0 + min(15.0, len(sentences) * 2.0) - (8.0 if word_count < 8 else 0.0))
        logical_consistency = _clamp(100.0 - len(fallacies) * 15.0)
        reasoning_quality = _clamp((evidence_strength + logical_consistency + clarity_score) / 3.0)
        persuasiveness_score = _clamp(reasoning_quality * 0.7 + relevance_score * 0.3)

        # Connect to AI/ML Agents if keys are present in environment
        has_api_keys = bool(os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_API_KEY"))
        if AI_ML_AGENTS_AVAILABLE and has_api_keys:
            try:
                fallacies_res = fallacy_detection_agent.run(text)
                if "error" not in fallacies_res and "fallacies_found" in fallacies_res:
                    agent_fallacies = []
                    for f in fallacies_res["fallacies_found"]:
                        agent_fallacies.append({
                            "fallacy_type": f.get("type", "Logical Fallacy"),
                            "explanation": f.get("explanation", "Logical flaw detected."),
                            "correction_suggestion": f.get("correction_suggestion", "Rephrase to eliminate flaws.")
                        })
                    if agent_fallacies:
                        fallacies = agent_fallacies

                analysis_res = argument_analysis_agent.run(text)
                if "error" not in analysis_res:
                    claim = analysis_res.get("claim", claim)
                    evidence_strength = float(analysis_res.get("strength_score", evidence_strength))
                    clarity_score = float(analysis_res.get("clarity_score", clarity_score))
                    relevance_score = float(analysis_res.get("relevance_score", relevance_score))
                    logical_consistency = float(analysis_res.get("logical_consistency_score", logical_consistency))
                    reasoning_quality = float(analysis_res.get("strength_score", reasoning_quality))
                    persuasiveness_score = _clamp(reasoning_quality * 0.7 + relevance_score * 0.3)
            except Exception as e:
                print(f"[AI ML Agents] Fallback to local heuristic: {e}")

        counterarguments = [
            {
                "rebuttal_type": "Logical",
                "rebuttal_text": f"Your premise '{claim[:90]}' assumes a causal link that remains unproven. If external variables account for this outcome, the conclusion collapses.",
                "challenge_question": "What independent evidence proves your stated cause is necessary and sufficient?",
                "strategy_tip": "Identify and substantiate the unstated assumption in your core premise.",
            },
            {
                "rebuttal_type": "Evidence-Based",
                "rebuttal_text": "While plausible in theory, this assertion lacks empirical backing from peer-reviewed studies or measurable field data.",
                "challenge_question": "What concrete statistical sample or controlled trial corroborates this claim?",
                "strategy_tip": "Bolster your point with quantified metrics and verifiable citations.",
            },
            {
                "rebuttal_type": "Ethical",
                "rebuttal_text": "Implementing this policy poses severe moral dilemmas and disproportionately shifts burdens onto vulnerable stakeholders.",
                "challenge_question": "How do you reconcile this outcome with fundamental principles of fairness and equity?",
                "strategy_tip": "Acknowledge conflicting ethical values and define clear safeguarding mechanisms.",
            },
            {
                "rebuttal_type": "Practical",
                "rebuttal_text": "Operational realities such as capital allocation, compliance overhead, and enforcement constraints undermine feasibility.",
                "challenge_question": "How will your model overcome implementation friction and unintended enforcement costs?",
                "strategy_tip": "Present a phased execution roadmap with risk-mitigation buffers.",
            },
            {
                "rebuttal_type": "Policy",
                "rebuttal_text": "Market-driven or adaptive regulatory frameworks achieve the same social objectives without incurring regulatory lock-in.",
                "challenge_question": "Why choose an inflexible mandate over adaptive, reversible policy alternatives?",
                "strategy_tip": "Demonstrate why your solution is superior to existing incremental alternatives.",
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
        persona = persona if persona in SUPPORTED_PERSONAS else "The Contrarian"
        
        # 1. Try LLM (Groq / Gemini) with full English debate prompt
        has_api_keys = bool(os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_API_KEY"))
        if AI_ML_AGENTS_AVAILABLE and call_llm_json is not None and has_api_keys:
            try:
                system_prompt = (
                    "You are a championship-level AI debate opponent and master rhetoric coach in an Oxford/Parliamentary debate competition. "
                    "All your outputs MUST be in fluent, eloquent, natural ENGLISH.\n\n"
                    f"Your assigned persona is: '{persona}'.\n"
                    "- The Contrarian: Skeptical, relentless, attacks foundational premises, uses sharp logical counter-examples.\n"
                    "- The Academic: Socratic, rigorous, demands precise definitions, empirical methodology, and epistemological clarity.\n"
                    "- The Strategist: Pragmatic, focuses on economic incentives, trade-offs, secondary effects, and implementation feasibility.\n\n"
                    "RULES:\n"
                    "1. Respond directly to the user's specific argument in high-level English.\n"
                    "2. Output ONLY a valid JSON object matching this exact schema:\n"
                    "{\n"
                    '  "opponent_rebuttal": "2-4 sentences of persuasive, high-impact English counter-argument dismantling the user.",\n'
                    '  "fallacies_detected": [\n'
                    '    {"fallacy_type": "Fallacy Name", "explanation": "Why this is a fallacy in English", "correction_suggestion": "How to fix it in English"}\n'
                    "  ],\n"
                    '  "rebuttal_strength_percent": 88.5,\n'
                    '  "coaching_tip": "A concise, strategic coaching tip in English on how the user can counter this or strengthen their speech."\n'
                    "}"
                )
                user_prompt = f"User's Debate Argument:\n\"\"\"{text}\"\"\""
                llm_output = call_llm_json(system_prompt, user_prompt)
                
                if "opponent_rebuttal" in llm_output and isinstance(llm_output["opponent_rebuttal"], str):
                    rebuttal = llm_output["opponent_rebuttal"].strip()
                    fallacies = llm_output.get("fallacies_detected", [])
                    strength = float(llm_output.get("rebuttal_strength_percent", 88.0))
                    coaching = llm_output.get("coaching_tip", "Address the opponent's core premise before presenting new points.")
                    return {
                        "opponent_rebuttal": rebuttal,
                        "fallacies_detected": fallacies,
                        "rebuttal_strength_percent": round(_clamp(strength, 40.0, 99.0), 1),
                        "coaching_tip": coaching,
                    }
            except Exception as e:
                print(f"[AI Simulation] LLM call exception ({e}). Utilizing high-tier English fallback engine.")

        # 2. High-Tier English Native Heuristic Generation
        analysis = self.analyze_argument(text)
        sentences = _sentences(text)
        claim_snippet = sentences[0] if sentences else text
        if len(claim_snippet) > 80:
            claim_snippet = claim_snippet[:77] + "..."

        persona_rebuttals = {
            "The Contrarian": [
                f"I strongly challenge your premise regarding \"{claim_snippet}\". Your position assumes a causal certainty that completely ignores competing empirical factors.",
                f"Your argument that \"{claim_snippet}\" oversimplifies a multifaceted dilemma. In reality, alternative mechanisms yield superior outcomes without your proposed liabilities.",
                f"You assert that \"{claim_snippet}\", but this fails under rigorous scrutiny. How do you reconcile this claim with the undeniable economic and structural counter-evidence?"
            ],
            "The Academic": [
                f"From an epistemological standpoint, your claim regarding \"{claim_snippet}\" lacks rigorous methodological substantiation. Correlation does not imply the causation you assume.",
                f"The literature on this subject directly contradicts your premise on \"{claim_snippet}\". Without controlled empirical baseline data, this remains an unverified hypothesis.",
                f"To defend \"{claim_snippet}\", you must first establish clear definitions and quantify the scope of your parameters. What peer-reviewed framework supports your assertion?"
            ],
            "The Strategist": [
                f"From an implementation and incentive perspective, your proposal on \"{claim_snippet}\" introduces severe moral hazard and unsustainable operational friction.",
                f"While \"{claim_snippet}\" sounds appealing in principle, the secondary consequences and capital misallocations render it unviable in practice.",
                f"Your strategy for \"{claim_snippet}\" fails to account for stakeholder pushback and enforcement bottlenecks. What is your risk-mitigation model?"
            ]
        }

        persona_tips = {
            "The Contrarian": "The Contrarian thrives on exposing unstated assumptions. Preemptively acknowledge counter-arguments and provide direct empirical proof.",
            "The Academic": "The Academic demands definitions and evidence. Strengthen your delivery by citing specific studies, metrics, and conceptual frameworks.",
            "The Strategist": "The Strategist attacks execution feasibility. Clarify your implementation roadmap, timeline, and trade-off mitigations."
        }

        # Pick dynamic variant based on text hash
        variants = persona_rebuttals.get(persona, persona_rebuttals["The Contrarian"])
        variant_idx = int(hashlib.md5(text.encode()).hexdigest(), 16) % len(variants)
        selected_rebuttal = variants[variant_idx]

        primary_counter = analysis["counterarguments"][0]
        full_rebuttal = f"{selected_rebuttal} {primary_counter['challenge_question']}"
        strength = _clamp(60.0 + analysis["logical_consistency"] * 0.2 + analysis["reasoning_quality"] * 0.2)

        return {
            "opponent_rebuttal": full_rebuttal,
            "fallacies_detected": analysis["fallacies"],
            "rebuttal_strength_percent": round(strength, 1),
            "coaching_tip": persona_tips.get(persona, "Address the opponent's core challenge directly before introducing new arguments."),
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
