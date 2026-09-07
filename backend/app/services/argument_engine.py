import re
from typing import Dict, Any, List
from .ai_engine import ai_engine

class ArgumentAnalysisEngine:
    """
    Engine for claim identification, evidence evaluation,
    reasoning analysis, and multi-criteria scoring.
    """

    EVIDENCE_MARKERS = [
        r"according to", r"study shows", r"research indicates", r"data suggests",
        r"percent", r"\%", r"statistics", r"evidence", r"found that", r"demonstrated",
        r"experiment", r"survey", r"published in", r"source", r"reported by"
    ]

    REASONING_MARKERS = [
        r"therefore", r"because", r"thus", r"consequently", r"as a result",
        r"since", r"furthermore", r"leads to", r"implies", r"proves that", r"in contrast"
    ]

    def analyze(self, text: str, context: str = "") -> Dict[str, Any]:
        text_clean = text.strip()
        if not text_clean:
            return {
                "claim": "No claim detected.",
                "evidence": "No evidence provided.",
                "reasoning_quality": "Insufficient input to evaluate reasoning.",
                "clarity_score": 0.0,
                "relevance_score": 0.0,
                "evidence_strength_score": 0.0,
                "logical_consistency_score": 0.0,
                "persuasiveness_score": 0.0,
                "feedback": "Please provide an argument or speech text for analysis.",
                "extracted_premises": []
            }

        # 1. Try LLM if available
        if ai_engine.is_llm_active():
            prompt = f"""
            Analyze the following debate argument in detail.
            Text: "{text_clean}"
            Context/Topic: "{context}"

            Return a valid JSON object with the following fields:
            {{
                "claim": "string (the main assertional claim)",
                "evidence": "string (summary of evidence or note lack thereof)",
                "reasoning_quality": "string (assessment of inferential validity)",
                "clarity_score": number (0-100),
                "relevance_score": number (0-100),
                "evidence_strength_score": number (0-100),
                "logical_consistency_score": number (0-100),
                "persuasiveness_score": number (0-100),
                "feedback": "string (actionable coaching critique)",
                "extracted_premises": ["premise 1", "premise 2"]
            }}
            """
            try:
                res = ai_engine.generate_completion(prompt, system_prompt="You are an expert debate judge and argument analyst.")
                # Extract JSON block
                json_match = re.search(r"\{.*\}", res, re.DOTALL)
                if json_match:
                    import json
                    parsed = json.loads(json_match.group(0))
                    return parsed
            except Exception:
                pass

        # 2. Heuristic Agentic Parser
        sentences = [s.strip() for s in re.split(r"[.!?]+", text_clean) if s.strip()]
        
        # Claim extraction (usually first sentence or sentence containing assertional cues)
        claim = sentences[0] if sentences else text_clean
        for s in sentences:
            if re.search(r"\b(we must|should|is essential|proves|argue that|contend|believe)\b", s, re.IGNORECASE):
                claim = s
                break

        # Evidence extraction
        evidence_found = []
        for marker in self.EVIDENCE_MARKERS:
            matches = re.findall(rf"([^.!?]*{marker}[^.!?]*)", text_clean, re.IGNORECASE)
            for m in matches:
                if m.strip() not in evidence_found:
                    evidence_found.append(m.strip())

        evidence_str = "; ".join(evidence_found[:3]) if evidence_found else "No empirical data, citations, or statistical references cited."

        # Premises extraction
        premises = []
        for s in sentences:
            if any(re.search(rf"\b{m}\b", s, re.IGNORECASE) for m in ["because", "since", "given that", "due to", "furthermore"]):
                premises.append(s)
        if not premises and len(sentences) > 1:
            premises = sentences[1:min(4, len(sentences))]

        # Scoring heuristics
        word_count = len(text_clean.split())
        
        # Clarity: penalized by extreme sentence length, rewarded for clean structure
        avg_sent_len = word_count / max(1, len(sentences))
        clarity_score = 88.0
        if avg_sent_len > 35:
            clarity_score -= 18.0
        elif avg_sent_len < 6:
            clarity_score -= 10.0
        if word_count < 20:
            clarity_score -= 15.0

        # Relevance: baseline high, modulated by substantive word presence
        relevance_score = 85.0
        if context:
            context_words = set(re.findall(r"\w{4,}", context.lower()))
            overlap = [w for w in text_clean.lower().split() if w in context_words]
            if overlap:
                relevance_score = min(98.0, 80.0 + len(overlap) * 5.0)
            else:
                relevance_score = 72.0

        # Evidence Strength: heavily dependent on citations / numbers
        evidence_hits = len(evidence_found)
        has_numbers = bool(re.search(r"\b\d+(\.\d+)?%?\b", text_clean))
        evidence_score = 50.0 + (evidence_hits * 15.0) + (15.0 if has_numbers else 0.0)
        evidence_score = max(35.0, min(95.0, evidence_score))

        # Logical Consistency
        reasoning_hits = sum(1 for m in self.REASONING_MARKERS if re.search(rf"\b{m}\b", text_clean, re.IGNORECASE))
        logical_consistency = 70.0 + min(25.0, reasoning_hits * 8.0)

        # Persuasiveness: balanced blend
        persuasiveness = (clarity_score * 0.25) + (evidence_score * 0.35) + (logical_consistency * 0.40)

        # Reasoning analysis text
        if reasoning_hits >= 2:
            reasoning_quality = "Well-structured deductive chain with explicit inferential connectives."
        elif reasoning_hits == 1:
            reasoning_quality = "Moderate inferential linkage; consider explicitly connecting premises to the conclusion."
        else:
            reasoning_quality = "Assertional style without clear transitional logic; needs stronger deductive markers."

        # Actionable feedback
        feedback_points = []
        if evidence_score < 70:
            feedback_points.append("Ground your claim with peer-reviewed research, statistical benchmarks, or case studies.")
        if clarity_score < 75:
            feedback_points.append("Shorten compound sentences to elevate punchiness and clarity for the adjudicators.")
        if reasoning_hits < 2:
            feedback_points.append("Use causal signposts ('consequently', 'this demonstrates that') to reinforce your premise chain.")
        if not feedback_points:
            feedback_points.append("Compelling and well-articulated argumentation. Focus on anticipating potential counter-examples.")

        return {
            "claim": claim,
            "evidence": evidence_str,
            "reasoning_quality": reasoning_quality,
            "clarity_score": round(max(10.0, min(99.0, clarity_score)), 1),
            "relevance_score": round(max(10.0, min(99.0, relevance_score)), 1),
            "evidence_strength_score": round(max(10.0, min(99.0, evidence_score)), 1),
            "logical_consistency_score": round(max(10.0, min(99.0, logical_consistency)), 1),
            "persuasiveness_score": round(max(10.0, min(99.0, persuasiveness)), 1),
            "feedback": " ".join(feedback_points),
            "extracted_premises": premises if premises else ["Implicit premise: " + claim]
        }

argument_engine = ArgumentAnalysisEngine()
