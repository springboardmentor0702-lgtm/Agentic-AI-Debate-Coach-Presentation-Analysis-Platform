"""
Scoring Agent for debate performance evaluation across 5 standard dimensions.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.agents.base_agent import BaseAgent
from app.language_guard import ENGLISH_ONLY_INSTRUCTION, enforce_english
from app.llm_client import call_llm_json, safe_call_llm_json

SCORE_WEIGHTS: Dict[str, float] = {
    "argument_quality": 0.30,
    "evidence_usage": 0.20,
    "logical_consistency": 0.20,
    "rebuttal_effectiveness": 0.15,
    "communication_skills": 0.15,
}

SUB_SCORE_KEYS: Tuple[str, ...] = tuple(SCORE_WEIGHTS.keys())
MIN_WORDS = 4

GRADE_BANDS: Tuple[Tuple[float, str, str], ...] = (
    (90.0, "A", "Excellent"),
    (80.0, "B", "Strong"),
    (70.0, "C", "Competent"),
    (60.0, "D", "Developing"),
    (0.0, "F", "Needs Work"),
)


def _clamp_score(val: Any) -> float:
    try:
        num = float(val)
    except (TypeError, ValueError):
        return 0.0
    if num != num:  # NaN
        return 0.0
    return round(max(0.0, min(100.0, num)), 1)


class ScoringAgent(BaseAgent):
    name = "ScoringAgent"
    role = "Evaluates speech/debate arguments on a 100-point rubric and produces weighted scores, grade, and feedback in English."

    @staticmethod
    def compute_weighted_score(sub_scores: Optional[Dict[str, Any]]) -> float:
        if not isinstance(sub_scores, dict):
            return 0.0
        total = 0.0
        for dim, weight in SCORE_WEIGHTS.items():
            val = _clamp_score(sub_scores.get(dim, 0.0))
            total += val * weight
        return round(max(0.0, min(100.0, total)), 1)

    @staticmethod
    def grade_for(score: float) -> Tuple[str, str]:
        s = _clamp_score(score)
        for threshold, letter, band in GRADE_BANDS:
            if s >= threshold:
                return letter, band
        return "F", "Needs Work"

    def run(
        self,
        argument_text: Optional[str] = None,
        topic: str = "",
        transcript: Optional[List[Dict[str, Any]]] = None,
        fallacies_found: Optional[List[Dict[str, Any]]] = None,
        speech_metrics: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        raw_text = argument_text or kwargs.get("speech_text") or ""
        clean = " ".join(str(raw_text).split())

        if not clean or (not transcript and len(clean.split()) < MIN_WORDS):
            empty_subs = {k: 0.0 for k in SUB_SCORE_KEYS}
            return {
                "overall_score": 0.0,
                "grade": "F",
                "band": "Needs Work",
                "sub_scores": empty_subs,
                "weights": dict(SCORE_WEIGHTS),
                "rationale": {k: "No speech or argument submitted." for k in SUB_SCORE_KEYS},
                "strengths": [],
                "weaknesses": ["No argument presented"],
                "improvement_suggestions": ["Present a clear argument to receive feedback."],
                "judge_summary": "Session ended with no submitted content.",
                "status": "not_scored",
                "message": "No complete argument text was provided to score.",
            }

        system_prompt = f"""You are a master debate adjudicator evaluating a speaker's presentation.
Score the performance across these 5 dimensions (0-100):
1. argument_quality (weight 30%)
2. evidence_usage (weight 20%)
3. logical_consistency (weight 20%)
4. rebuttal_effectiveness (weight 15%)
5. communication_skills (weight 15%)

{ENGLISH_ONLY_INSTRUCTION}

Respond ONLY with a JSON object:
{{
  "sub_scores": {{
    "argument_quality": <integer 0-100>,
    "evidence_usage": <integer 0-100>,
    "logical_consistency": <integer 0-100>,
    "rebuttal_effectiveness": <integer 0-100>,
    "communication_skills": <integer 0-100>
  }},
  "rationale": {{
    "argument_quality": "1-sentence reason",
    "evidence_usage": "1-sentence reason",
    "logical_consistency": "1-sentence reason",
    "rebuttal_effectiveness": "1-sentence reason",
    "communication_skills": "1-sentence reason"
  }},
  "strengths": ["List of 2-3 specific strengths"],
  "weaknesses": ["List of 2-3 specific weaknesses"],
  "improvement_suggestions": ["List of 2-3 actionable coaching suggestions"],
  "judge_summary": "2-3 sentence overall adjudicator summary"
}}
"""
        user_prompt = f"""Topic: {topic or 'Debate Round'}
Argument Text:
\"{clean}\"
"""
        raw_result = safe_call_llm_json(system_prompt, user_prompt)
        raw_subs = raw_result.get("sub_scores") if isinstance(raw_result.get("sub_scores"), dict) else {}

        if "error" in raw_result or not raw_subs:
            empty_subs = {k: 0.0 for k in SUB_SCORE_KEYS}
            return {
                "overall_score": 0.0,
                "grade": "F",
                "band": "Needs Work",
                "sub_scores": empty_subs,
                "weights": dict(SCORE_WEIGHTS),
                "rationale": {k: "" for k in SUB_SCORE_KEYS},
                "strengths": [],
                "weaknesses": [],
                "improvement_suggestions": [],
                "judge_summary": "Scoring unavailable due to provider error.",
                "status": "not_scored",
                "message": raw_result.get("error") or "Failed to score argument.",
            }

        sub_scores = {
            k: _clamp_score(raw_subs.get(k, 0.0))
            for k in SUB_SCORE_KEYS
        }

        overall_score = self.compute_weighted_score(sub_scores)
        grade, band = self.grade_for(overall_score)

        raw_rationale = raw_result.get("rationale") if isinstance(raw_result.get("rationale"), dict) else {}
        rationale = {
            k: enforce_english(str(raw_rationale.get(k) or f"Scored based on speech clarity and structure."))
            for k in SUB_SCORE_KEYS
        }

        strengths = [
            enforce_english(str(s)) for s in (raw_result.get("strengths") or ["Clear proposition articulation"]) if str(s).strip()
        ]
        weaknesses = [
            enforce_english(str(w)) for w in (raw_result.get("weaknesses") or ["Could integrate more verifiable empirical sources"]) if str(w).strip()
        ]
        suggestions = [
            enforce_english(str(sg)) for sg in (raw_result.get("improvement_suggestions") or ["Ground claims with specific studies or statistics."]) if str(sg).strip()
        ]
        summary = enforce_english(
            str(raw_result.get("judge_summary") or f"Speaker achieved an overall score of {overall_score} ({grade} - {band})."),
        )

        return {
            "overall_score": overall_score,
            "grade": grade,
            "band": band,
            "sub_scores": sub_scores,
            "weights": dict(SCORE_WEIGHTS),
            "rationale": rationale,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "improvement_suggestions": suggestions,
            "judge_summary": summary,
            "status": "scored",
            "message": "Performance scored successfully.",
        }


scoring_agent = ScoringAgent()
