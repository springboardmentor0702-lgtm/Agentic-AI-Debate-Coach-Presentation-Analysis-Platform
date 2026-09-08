import re
import random
import numpy as np
from typing import Dict, List, Any

FALLACY_PATTERNS = {
    "Ad Hominem": (["idiot", "fool", "corrupt", "liar", "ignorant", "stupid"], "Attacking a person rather than the argument.", "Address the evidence and premises directly."),
    "Straw Man": (["so you're saying", "you want to destroy", "ban everything"], "Misrepresenting an opponent's position.", "State the actual position before rebutting it."),
    "False Dilemma": (["either", "only two choices", "with us or against us", "or else"], "Presenting two options as the only possibilities.", "Consider reasonable alternatives."),
    "Slippery Slope": (["inevitably result in", "slippery slope", "catastrophe"], "Claiming an unproven chain of consequences.", "Support each causal step with evidence."),
    "Hasty Generalization": (["everyone knows", "all of them", "always", "never"], "Making a broad claim from too little evidence.", "Use representative evidence and qualifying language.")
}

class AIEngine:
    def __init__(self):
        self.argument_memory = []
        self._last_rebuttal_index = {}

    def _get_embedding(self, text: str) -> np.ndarray:
        vector = np.zeros(128)
        for word in text.lower().split()[:128]:
            vector[hash(word) % 128] += 1
        norm = np.linalg.norm(vector)
        return vector / norm if norm else vector

    def index_argument(self, text: str):
        self.argument_memory.append({"text": text, "vector": self._get_embedding(text)})

    def search_similar_arguments(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        if not self.argument_memory:
            return []
        query_vector = self._get_embedding(query)
        ranked = sorted(((float(np.dot(query_vector, item["vector"])), item["text"]) for item in self.argument_memory), reverse=True)
        return [{"text": text, "similarity": score} for score, text in ranked[:top_k]]

    def analyze_argument(self, text: str) -> Dict[str, Any]:
        self.index_argument(text)
        lowered = text.lower()
        fallacies, consistency = [], 90.0
        for name, (keywords, explanation, correction) in FALLACY_PATTERNS.items():
            if any(keyword in lowered for keyword in keywords):
                consistency -= 15
                fallacies.append({"fallacy_type": name, "explanation": explanation, "correction_suggestion": correction})
        words = len(text.split())
        evidence = min(100.0, max(45.0, words * 1.5 + (20 if any(key in lowered for key in ["data", "study", "percent", "%"]) else 0)))
        clarity, relevance = (85.0 if words < 100 else 75.0), round(random.uniform(80, 95), 1)
        quality = (evidence + consistency + clarity) / 3
        return {"claim_identified": f"Main Proposition: {text.split('.')[0].strip()}", "evidence_strength": round(evidence, 1), "reasoning_quality": round(quality, 1), "clarity_score": clarity, "relevance_score": relevance, "logical_consistency": max(20.0, consistency), "persuasiveness_score": round(quality * .7 + relevance * .3, 1), "fallacies": fallacies, "counterarguments": []}

    def generate_simulation_response(self, text: str, persona: str) -> Dict[str, Any]:
        analysis = self.analyze_argument(text)
        claim = re.sub(r"\s+", " ", text.strip().strip("“”\"")).rstrip(".?!")
        claim = claim[:180] + ("..." if len(claim) > 180 else "")
        responses = {
            "The Contrarian": [
                ("Your claim — '{claim}' — assumes the benefit will follow automatically. What evidence isolates this proposal's effect from other factors?", "Give one measurable causal link and evidence for it."),
                ("I dispute the scope of '{claim}'. It treats affected people and institutions as if they have identical needs and resources.", "Who is most likely to be harmed or excluded?"),
                ("'{claim}' identifies an objective but skips the mechanism. A desired result is not proof that this intervention can deliver it.", "Explain who acts, what changes, and how success is measured."),
                ("'{claim}' overlooks a narrower, reversible alternative that could pursue the same goal with less risk.", "Why is a broad rule better than a pilot or targeted policy?"),
                ("I challenge the trade-off in '{claim}'. A gain for one group may transfer cost or power to another.", "What downside are you accepting, and how will you limit it?")
            ],
            "The Academic": [
                ("The proposition '{claim}' is under-specified. Its key terms and success standard are not defined.", "Define the scope, comparison group, and success metric."),
                ("You assert '{claim}', but have not established causation. Intuition and anecdotes are not enough.", "Which credible study supports the causal claim?"),
                ("'{claim}' needs a boundary condition: a policy working in one context may not generalize.", "Under what conditions would it fail?"),
                ("Before accepting '{claim}', compare it with plausible alternatives and doing nothing.", "What evidence shows it outperforms the nearest alternative?"),
                ("'{claim}' makes a value choice as if it were purely factual.", "Which value wins when fairness, autonomy, and effectiveness conflict?")
            ],
            "The Strategist": [
                ("Even if '{claim}' has an attractive goal, implementation determines success. Enforcement, staffing, and compliance costs are missing.", "Who administers it, what does it cost, and how is compliance checked?"),
                ("'{claim}' may create incentives that undermine its purpose.", "What unintended consequence is most likely, and how would you mitigate it?"),
                ("'{claim}' has a sequencing problem: deployment before testing capacity can turn a good idea into a costly failure.", "What pilot, review point, and exit criteria would you use?"),
                ("A uniform version of '{claim}' may be inefficient when local conditions differ.", "Why not use a targeted or phased approach first?"),
                ("'{claim}' has an opportunity cost: resources used here cannot address competing priorities.", "What is displaced, and why is this the better investment?")
            ]
        }
        options = responses.get(persona, responses["The Contrarian"])
        last = self._last_rebuttal_index.get(persona)
        selected = random.choice([index for index in range(len(options)) if index != last])
        self._last_rebuttal_index[persona] = selected
        template, coaching = options[selected]
        styles = {"The Contrarian": "Direct, assumption-testing, and adversarial.", "The Academic": "Socratic, precise, and evidence-focused.", "The Strategist": "Pragmatic and implementation-focused."}
        return {"opponent_rebuttal": template.format(claim=claim), "fallacies_detected": analysis["fallacies"], "rebuttal_strength_percent": round(random.uniform(91, 99.4), 1), "coaching_tip": f"{styles.get(persona, 'Standard style')} {coaching}"}

    def calculate_weighted_score(self, arg_quality: float, evidence: float, logic: float, rebuttal: float, comms: float) -> float:
        return round(.30 * arg_quality + .20 * evidence + .20 * logic + .15 * rebuttal + .15 * comms, 1)

ai_engine_service = AIEngine()
