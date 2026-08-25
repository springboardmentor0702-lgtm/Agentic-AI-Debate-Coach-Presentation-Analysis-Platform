"""
coaching.py
-----------
Stage 4: Coaching Recommendation
    • Identify weaknesses
    • Personalized feedback

Stage 5: Personalized Learning Plan
    • Practice activities
    • Improvement goals
"""

from llm_client import LLMClient


def generate_coaching_feedback(
    llm: LLMClient,
    evaluation: dict
) -> dict:
    """
    Converts evaluation results into actionable coaching feedback.
    """

    system = (
        "You are a supportive but honest debate coach. "
        "Analyze the evaluation results and identify the student's "
        "most important weaknesses and strengths. "
        "Give specific, actionable advice. "
        "Avoid vague praise or vague criticism. "
        "Keep every explanation concise. "
        "Return ONLY valid JSON."
    )

    user = f"""
Evaluation results:
{evaluation}

Return EXACTLY this JSON structure:

{{
  "top_weaknesses": [
    "weakness 1",
    "weakness 2"
  ],
  "top_strengths": [
    "strength 1",
    "strength 2"
  ],
  "feedback_summary": "2-4 concise sentences of specific coaching feedback.",
  "priority_focus_area": "logic"
}}

Rules:
- priority_focus_area MUST be one of:
  logic, clarity, evidence, rebuttal_quality
- Give at most 2 weaknesses.
- Give at most 2 strengths.
- Keep feedback_summary concise.
- Return valid JSON only.
"""

    return llm.call_json(
        system,
        user,
        max_tokens=1500
    )


def generate_learning_plan(
    llm: LLMClient,
    coaching: dict,
    evaluation: dict
) -> dict:
    """
    Builds a short personalized practice plan based on
    the student's evaluation and coaching feedback.
    """

    system = (
        "You are a debate training program designer. "
        "Create a short, realistic and measurable practice plan "
        "based on the student's priority weakness. "
        "Every activity must be specific and achievable in "
        "under 30 minutes. "
        "Keep all descriptions concise. "
        "Return ONLY valid JSON."
    )

    user = f"""
Coaching feedback:
{coaching}

Evaluation:
{evaluation}

Create a personalized learning plan.

Return EXACTLY this JSON structure:

{{
  "improvement_goals": [
    {{
      "goal": "specific improvement goal",
      "target_metric": "measurable target",
      "timeframe": "2 weeks"
    }}
  ],
  "practice_activities": [
    {{
      "activity": "short specific practice activity",
      "skill_targeted": "skill being improved",
      "duration_minutes": 20
    }}
  ],
  "recommended_next_topics": [
    "topic 1",
    "topic 2",
    "topic 3"
  ]
}}

Rules:
- Give at most 2 improvement goals.
- Give at most 3 practice activities.
- Give at most 3 recommended topics.
- Each activity must take 30 minutes or less.
- duration_minutes must be a number.
- Keep descriptions short.
- Do not include long quotations.
- Return valid JSON only.
"""

    return llm.call_json(
        system,
        user,
        max_tokens=2000
    )


def run_coaching_stage(
    llm: LLMClient,
    evaluation: dict
) -> dict:
    """
    Runs both coaching feedback and personalized learning plan.
    """

    coaching = generate_coaching_feedback(
        llm,
        evaluation
    )

    learning_plan = generate_learning_plan(
        llm,
        coaching,
        evaluation
    )

    return {
        "coaching": coaching,
        "learning_plan": learning_plan
    }