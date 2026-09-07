"""
Counterargument Agent for generating multi-angle, structured debate rebuttals.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.agents.base_agent import BaseAgent
from app.language_guard import ENGLISH_ONLY_INSTRUCTION, enforce_english
from app.llm_client import call_llm_json, safe_call_llm_json

REBUTTAL_TYPES: tuple[str, ...] = ("Logical", "Evidence-Based", "Ethical", "Practical", "Policy")
MIN_WORDS = 4

DEFAULT_TEMPLATES: Dict[str, Dict[str, str]] = {
    "Logical": {
        "rebuttal_text": "The proposition may rely on an unstated assumption. Test whether the conclusion still holds if that assumption is weakened.",
        "challenge_question": "Which premise is necessary for your conclusion, and what would falsify it?",
        "strategy_tip": "Identify and challenge the argument's strongest hidden assumption.",
        "strength": 75,
    },
    "Evidence-Based": {
        "rebuttal_text": "The claim would be significantly stronger with representative, verifiable evidence rather than isolated assertions.",
        "challenge_question": "What primary source or measured empirical dataset supports the central claim?",
        "strategy_tip": "Ask for source quality, sample size, and relevance.",
        "strength": 70,
    },
    "Ethical": {
        "rebuttal_text": "Consider whether the proposed outcome distributes costs and benefits fairly across all affected stakeholders.",
        "challenge_question": "Which groups bear the asymmetric risk, and what safeguards protect them?",
        "strategy_tip": "Make the affected stakeholders and competing fundamental values explicit.",
        "strength": 65,
    },
    "Practical": {
        "rebuttal_text": "Even a sound principle can fail during implementation if its timeline, resources, incentives, and operational constraints are neglected.",
        "challenge_question": "What is the implementation plan, budget, and measurable success criterion?",
        "strategy_tip": "Move from abstract agreement to feasibility and execution details.",
        "strength": 70,
    },
    "Policy": {
        "rebuttal_text": "A lower-risk, reversible policy alternative may achieve the objective while preserving flexibility and reducing unintended side effects.",
        "challenge_question": "Why is this proposal preferable to an incremental or lower-cost alternative?",
        "strategy_tip": "Compare alternatives against the same outcome, cost, and risk criteria.",
        "strength": 68,
    },
}


class CounterargumentAgent(BaseAgent):
    name = "CounterargumentAgent"
    role = "Produces distinct rebuttal angles (Logical, Evidence-Based, Ethical, Practical, Policy) for a stated proposition."

    def _validate_rebuttals(self, items: Any) -> List[Dict[str, Any]]:
        """Validate, sanitize, deduplicate, and order rebuttals canonically."""
        if not isinstance(items, (list, tuple)):
            return []

        cleaned: Dict[str, Dict[str, Any]] = {}
        for item in items:
            if not isinstance(item, dict):
                continue
            rtype = str(item.get("rebuttal_type") or "").strip()
            match = next((t for t in REBUTTAL_TYPES if t.lower() == rtype.lower()), None)
            if not match or match in cleaned:
                continue
            raw_rtext = str(item.get("rebuttal_text") or "").strip()
            if not raw_rtext:
                continue
            rtext = enforce_english(raw_rtext, fallback=raw_rtext)
            if not rtext:
                continue

            try:
                strength_raw = item.get("strength", 60)
                strength = int(round(float(strength_raw)))
                strength = max(0, min(100, strength))
            except (TypeError, ValueError):
                strength = 60

            raw_cq = str(item.get("challenge_question") or "").strip()
            raw_st = str(item.get("strategy_tip") or "").strip()
            cleaned[match] = {
                "rebuttal_type": match,
                "rebuttal_text": rtext,
                "challenge_question": enforce_english(raw_cq, fallback=raw_cq) if raw_cq else "",
                "strategy_tip": enforce_english(raw_st, fallback=raw_st) if raw_st else "",
                "strength": strength,
            }

        return [cleaned[t] for t in REBUTTAL_TYPES if t in cleaned]

    def run(
        self,
        argument_text: Optional[str] = None,
        topic: str = "",
        position: str = "Affirmative",
        **kwargs: Any,
    ) -> Dict[str, Any]:
        raw_text = argument_text or kwargs.get("user_argument") or ""
        clean = " ".join(str(raw_text).split())
        if not clean or len(clean.split()) < MIN_WORDS:
            return {
                "claim": clean[:100],
                "claim_targeted": clean[:100],
                "rebuttals": [],
                "strongest_type": "",
                "overall_strategy": "",
                "status": "no_counterarguments_generated",
                "message": "Argument text too short or empty to generate counterarguments.",
            }

        claim_targeted = clean.split(".")[0][:150]
        system_prompt = f"""You are an elite debate strategist. Analyze the user's argument and provide five distinct rebuttal angles in English: Logical, Evidence-Based, Ethical, Practical, Policy.

{ENGLISH_ONLY_INSTRUCTION}

Topic: {topic or 'General Debate'}
Speaker Position: {position}

Respond ONLY with a JSON object in this exact schema:
{{
  "claim_targeted": "Brief statement of the core claim being attacked",
  "rebuttals": [
    {{
      "rebuttal_type": "Logical" | "Evidence-Based" | "Ethical" | "Practical" | "Policy",
      "rebuttal_text": "Clear 2-sentence counter-argument in English",
      "challenge_question": "Socratic question testing the premise",
      "strategy_tip": "Advice on how to deliver this rebuttal",
      "strength": <integer 0-100>
    }}
  ],
  "strongest_type": "The name of the most effective rebuttal type for this argument",
  "overall_strategy": "A 1-2 sentence overarching debate strategy"
}}
"""
        user_prompt = f"Target this argument:\n\"{clean}\""
        raw_result = safe_call_llm_json(system_prompt, user_prompt)

        if "error" in raw_result or not isinstance(raw_result.get("rebuttals"), list):
            return {
                "claim": claim_targeted,
                "claim_targeted": claim_targeted,
                "rebuttals": [],
                "strongest_type": "",
                "overall_strategy": "",
                "status": "no_counterarguments_generated",
                "message": raw_result.get("error") or "Failed to generate counterarguments from LLM.",
            }

        rebuttals = self._validate_rebuttals(raw_result.get("rebuttals"))
        if not rebuttals:
            return {
                "claim": claim_targeted,
                "claim_targeted": claim_targeted,
                "rebuttals": [],
                "strongest_type": "",
                "overall_strategy": "",
                "status": "no_counterarguments_generated",
                "message": "Model produced no valid rebuttals matching the supported types.",
            }

        strongest = str(raw_result.get("strongest_type") or "Logical")
        if strongest not in REBUTTAL_TYPES:
            strongest = "Logical"

        return {
            "claim": claim_targeted,
            "claim_targeted": str(raw_result.get("claim_targeted") or claim_targeted)[:200],
            "rebuttals": rebuttals,
            "strongest_type": strongest,
            "overall_strategy": enforce_english(
                str(raw_result.get("overall_strategy") or "Expose unproven premises first, then challenge empirical evidence and feasibility."),
            ),
            "status": "counterarguments_generated",
            "message": f"Generated {len(rebuttals)} counterargument angles.",
        }


counterargument_agent = CounterargumentAgent()
