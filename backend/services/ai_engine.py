import re
import random
from typing import Dict, List, Any

# Supported Fallacies Catalogue
FALLACY_PATTERNS = {
    "Ad Hominem": {
        "keywords": ["idiot", "fool", "corrupt", "liar", "ignorant", "stupid", "you don't know", "incompetent"],
        "explanation": "Attacking the opponent's character or personal traits rather than engaging with their argument.",
        "correction": "Focus directly on the evidence and logical premises of the claim rather than personal attributes."
    },
    "Straw Man": {
        "keywords": ["so you're saying", "you want to destroy", "completely eliminate", "ban everything", "claim that all"],
        "explanation": "Misrepresenting or exaggerating an opponent's argument to make it easier to attack.",
        "correction": "State the opponent's true position accurately before refuting it."
    },
    "False Dilemma": {
        "keywords": ["either", "or else", "only two choices", "with us or against us", "if we don't then total"],
        "explanation": "Presenting two alternative states as the only possibilities, when in fact more possibilities exist.",
        "correction": "Acknowledge nuanced middle-ground positions and alternative solutions."
    },
    "Slippery Slope": {
        "keywords": ["lead to total", "inevitably result in", "next thing you know", "slippery slope", "catastrophe"],
        "explanation": "Asserting that a relatively small first step will inevitably lead to a chain of negative events without proving direct causality.",
        "correction": "Provide empirical evidence for each causal step in the predicted chain reaction."
    },
    "Appeal to Authority": {
        "keywords": ["famous person said", "celebrity agrees", "unnamed experts claim", "because I said so", "authority"],
        "explanation": "Claiming something is true simply because an authoritative figure said it, without corroborating evidence.",
        "correction": "Cite peer-reviewed data, verifiable statistics, and primary research sources."
    },
    "Circular Reasoning": {
        "keywords": ["because it is", "obviously true because", "by definition", "self-evident that"],
        "explanation": "Using the conclusion of the argument as one of the premises used to support it.",
        "correction": "Provide independent supporting evidence that does not assume the conclusion."
    },
    "Hasty Generalization": {
        "keywords": ["everyone knows", "all of them", "always", "never", "based on my one friend"],
        "explanation": "Making a broad claim based on an insufficient or unrepresentative sample size.",
        "correction": "Qualify your claim with statistical bounds and representative sample data."
    },
    "Red Herring": {
        "keywords": ["what about", "moving on to", "distraction", "irrelevant topic", "instead of talking about"],
        "explanation": "Introducing an irrelevant topic into an argument to divert attention from the original issue.",
        "correction": "Maintain focus on the specific proposition currently being debated."
    }
}

class AIEngine:
    def analyze_argument(self, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        
        # 1. Claim extraction
        first_sentence = text.split('.')[0] if '.' in text else text
        claim = f"Main Proposition: {first_sentence.strip()}"
        
        # 2. Score calculations
        word_count = len(text.split())
        evidence_strength = min(100.0, max(45.0, word_count * 1.5 + (20 if "data" in text_lower or "percent" in text_lower or "%" in text_lower or "study" in text_lower else 0)))
        clarity_score = min(100.0, max(50.0, 95.0 - (word_count > 100) * 10))
        relevance_score = min(100.0, max(60.0, 85.0 + random.uniform(-5, 10)))
        logical_consistency = 90.0
        
        # 3. Detect fallacies
        detected_fallacies = []
        for fallacy_name, meta in FALLACY_PATTERNS.items():
            for kw in meta["keywords"]:
                if kw in text_lower:
                    logical_consistency -= 15.0
                    detected_fallacies.append({
                        "fallacy_type": fallacy_name,
                        "explanation": meta["explanation"],
                        "correction_suggestion": meta["correction"]
                    })
                    break
        
        logical_consistency = max(20.0, logical_consistency)
        reasoning_quality = (evidence_strength + logical_consistency + clarity_score) / 3.0
        persuasiveness_score = (reasoning_quality * 0.7) + (relevance_score * 0.3)

        # 4. Generate Rebuttals across 5 types
        counterarguments = [
            {
                "rebuttal_type": "Logical",
                "rebuttal_text": f"While your premise rests on '{claim[:60]}...', it assumes a linear causal relationship that ignores external systemic variables.",
                "challenge_question": "What empirical evidence demonstrates that your premise holds under non-ideal market conditions?",
                "strategy_tip": "Challenge the opponent's unstated core assumption."
            },
            {
                "rebuttal_type": "Evidence-Based",
                "rebuttal_text": "Recent quantitative studies contradict this stance by showing a counter-correlation when accounting for socioeconomic baselines.",
                "challenge_question": "Can you provide peer-reviewed statistical validation for this specific claim?",
                "strategy_tip": "Demand primary source verification."
            },
            {
                "rebuttal_type": "Ethical",
                "rebuttal_text": "From a normative perspective, prioritizing this outcome disproportionately burdens underrepresented stakeholders.",
                "challenge_question": "How does your policy safeguard the rights of affected minority groups?",
                "strategy_tip": "Shift the moral frame to equitable distribution of impacts."
            },
            {
                "rebuttal_type": "Practical",
                "rebuttal_text": "Implementation of this approach faces severe operational bottlenecks and fiscal overruns in real-world scenarios.",
                "challenge_question": "What is the concrete timeline and budget allocation for enforcing this proposal?",
                "strategy_tip": "Focus on feasibility and operational friction."
            },
            {
                "rebuttal_type": "Policy",
                "rebuttal_text": "Alternative regulatory frameworks achieve identical strategic objectives with significantly lower systemic risk.",
                "challenge_question": "Why should we adopt this high-risk policy over proven incremental reforms?",
                "strategy_tip": "Offer a safer, higher-yield policy alternative."
            }
        ]

        return {
            "claim_identified": claim,
            "evidence_strength": round(evidence_strength, 1),
            "reasoning_quality": round(reasoning_quality, 1),
            "clarity_score": round(clarity_score, 1),
            "relevance_score": round(relevance_score, 1),
            "logical_consistency": round(logical_consistency, 1),
            "persuasiveness_score": round(persuasiveness_score, 1),
            "fallacies": detected_fallacies,
            "counterarguments": counterarguments
        }

    def generate_simulation_response(self, text: str, persona: str) -> Dict[str, Any]:
        analysis = self.analyze_argument(text)
        
        persona_styles = {
            "The Contrarian": "Directly challenging assumptions with aggressive counter-evidence.",
            "The Academic": "Socratic, precise, demanding rigorous citations and methodological clarity.",
            "The Strategist": "Focusing on pragmatic policy outcomes, unintended consequences, and cost-benefit trade-offs."
        }
        
        rebuttal_prefix = {
            "The Contrarian": "I strongly reject your core premise.",
            "The Academic": "Your argument exhibits notable methodological gaps.",
            "The Strategist": "From a policy implementation standpoint, your thesis collapses."
        }
        
        prefix = rebuttal_prefix.get(persona, "I counter your statement.")
        primary_counter = analysis["counterarguments"][0]["rebuttal_text"]
        
        rebuttal_full = f"{prefix} {primary_counter} {analysis['counterarguments'][0]['challenge_question']}"
        rebuttal_strength = round(random.uniform(91.0, 99.4), 1)
        
        return {
            "opponent_rebuttal": rebuttal_full,
            "fallacies_detected": analysis["fallacies"],
            "rebuttal_strength_percent": rebuttal_strength,
            "coaching_tip": f"Persona Style: {persona_styles.get(persona, 'Standard')}. Maintain composure and address the core challenge question directly."
        }

    def calculate_weighted_score(self, arg_quality: float, evidence: float, logic: float, rebuttal: float, comms: float) -> float:
        # Standard Formula:
        # Score = (30% Arg Quality) + (20% Evidence) + (20% Logical Consistency) + (15% Rebuttal) + (15% Communication)
        weighted = (0.30 * arg_quality) + (0.20 * evidence) + (0.20 * logic) + (0.15 * rebuttal) + (0.15 * comms)
        return round(weighted, 1)

ai_engine_service = AIEngine()
