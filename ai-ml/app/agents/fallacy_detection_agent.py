from app.agents.base_agent import BaseAgent
from app.llm_client import call_llm_json

MIN_WORDS = 4

SUPPORTED_FALLACIES = [
    "Ad Hominem", "Straw Man", "False Dilemma", "Slippery Slope",
    "Appeal to Authority", "Circular Reasoning", "Hasty Generalization", "Red Herring",
]

SYSTEM_PROMPT = f"""You are a critical thinking expert who detects logical fallacies.
Only check for these fallacy types: {", ".join(SUPPORTED_FALLACIES)}.
If none are present, return an empty list. Do not invent fallacies outside this list.
Always respond with ONLY a JSON object in this exact shape:

{{
  "fallacies_found": [
    {{
      "type": "one of the supported fallacy names",
      "excerpt": "the specific phrase from the text that shows this fallacy",
      "explanation": "1 sentence explaining why this is that fallacy",
      "correction_suggestion": "1 sentence suggesting how to fix/rephrase it",
      "confidence": <integer 0-100, how certain you are this is genuinely that fallacy>
    }}
  ]
}}
"""


def _build_no_fallacy_response(argument_text: str) -> dict:
    return {
        "fallacies_found": [],
        "status": "no_clear_fallacies_detected",
        "message": (
            "No clear logical fallacy was detected in this statement. "
            "It may be a neutral comment, a topic introduction, or a claim "
            "that is simply not obviously flawed."
        ),
        "argument_preview": argument_text.strip()[:120],
    }


class FallacyDetectionAgent(BaseAgent):
    name = "FallacyDetectionAgent"
    role = "Detects logical fallacies and suggests corrections."

    def _filter_valid_fallacies(self, fallacies: list) -> list:
        valid = []
        for f in fallacies:
            if not isinstance(f, dict):
                continue
            if f.get("type") not in SUPPORTED_FALLACIES:
                continue
            f.setdefault("confidence", 60)
            valid.append(f)
        return valid

    def run(self, argument_text: str) -> dict:
        if not argument_text or not argument_text.strip():
            return _build_no_fallacy_response(argument_text or "")

        word_count = len(argument_text.strip().split())
        if word_count < MIN_WORDS:
            return _build_no_fallacy_response(argument_text)

        user_prompt = f"Check this argument for logical fallacies:\n\n\"{argument_text}\""
        raw_result = call_llm_json(SYSTEM_PROMPT, user_prompt)

        if "error" in raw_result or "fallacies_found" not in raw_result:
            return _build_no_fallacy_response(argument_text)

        filtered_fallacies = self._filter_valid_fallacies(raw_result["fallacies_found"])
        if not filtered_fallacies:
            return _build_no_fallacy_response(argument_text)

        return {
            "fallacies_found": filtered_fallacies,
            "status": "fallacies_detected",
            "message": f"Detected {len(filtered_fallacies)} possible logical fallacy/ies.",
        }


fallacy_detection_agent = FallacyDetectionAgent()
