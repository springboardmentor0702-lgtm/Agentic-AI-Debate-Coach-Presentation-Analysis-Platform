"""
Argument Analysis Agent (Module 4 from the project doc)
Role: judges how strong an argument is - claim, evidence, clarity, relevance, logical consistency.
"""
from app.agents.base_agent import BaseAgent
from app.llm_client import call_llm_json

MIN_WORDS = 4

SYSTEM_PROMPT = """You are an expert debate judge and argument analyst.
Given an argument, break it down and evaluate it honestly and critically.
Always respond with ONLY a JSON object in this exact shape, no extra text:

{
  "claim": "the main point being argued",
  "evidence": ["list of evidence/reasons the speaker gave"],
  "strength_label": "weak" | "moderate" | "strong",
  "strength_score": <integer 0-100>,
  "clarity_score": <integer 0-100>,
  "relevance_score": <integer 0-100>,
  "logical_consistency_score": <integer 0-100>,
  "notes": "1-2 sentence explanation of the scoring"
}

If the text is too vague or short to evaluate meaningfully, still return this shape,
but set all scores to 0 and explain why in "notes".
"""

DEFAULT_RESULT = {
    "claim": "",
    "evidence": [],
    "strength_label": "weak",
    "strength_score": 0,
    "clarity_score": 0,
    "relevance_score": 0,
    "logical_consistency_score": 0,
    "notes": "",
}


class ArgumentAnalysisAgent(BaseAgent):
    name = "ArgumentAnalysisAgent"
    role = "Judges the strength, clarity, relevance, and logical consistency of an argument."

    def _validate_and_fill(self, result: dict) -> dict:
        safe_result = DEFAULT_RESULT.copy()
        safe_result.update({k: v for k, v in result.items() if k in DEFAULT_RESULT})
        return safe_result

    def run(self, argument_text: str) -> dict:
        """
        argument_text: the raw text of what the user said (typed, or transcribed from speech)
        Returns a dict matching the JSON shape above. Never raises.
        """
        if not argument_text or not argument_text.strip():
            return {**DEFAULT_RESULT, "notes": "No argument text was provided."}

        word_count = len(argument_text.strip().split())
        if word_count < MIN_WORDS:
            return {
                **DEFAULT_RESULT,
                "claim": argument_text.strip(),
                "notes": f"Text is too short ({word_count} word(s)) to evaluate as a full argument.",
            }

        user_prompt = f"Analyze this argument:\n\n\"{argument_text}\""
        raw_result = call_llm_json(SYSTEM_PROMPT, user_prompt)

        if "error" in raw_result:
            return {**DEFAULT_RESULT, "notes": "Analysis failed - model returned an unexpected format."}

        return self._validate_and_fill(raw_result)


# Module-level singleton so other files can just do:
#   from app.agents.argument_analysis_agent import argument_analysis_agent
#   result = argument_analysis_agent.run(text)
argument_analysis_agent = ArgumentAnalysisAgent()
