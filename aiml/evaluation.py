"""
evaluation.py
-------------
Stage 3 of the pipeline: Performance Evaluation

Evaluates the user's debate performance on:
    • Logic
    • Clarity
    • Evidence
    • Rebuttal quality
"""

from llm_client import LLMClient


RUBRIC_DIMENSIONS = [
    "logic",
    "clarity",
    "evidence",
    "rebuttal_quality",
]


def evaluate_performance(
    llm: LLMClient,
    topic: str,
    transcript: list[dict],
) -> dict:
    """
    Scores only the user's turns in the transcript.

    Returns:
        scores:
            0-10 score for each evaluation dimension
        justifications:
            Explanation for each score
        overall_score:
            Overall score from 0-10
        strong_moments:
            Strong user arguments/turns
        weak_moments:
            Weak user arguments/turns
    """

    # Extract only the user's turns.
    user_turns = [
        t.get("text", "")
        for t in transcript
        if t.get("role") == "user"
    ]

    # Handle an empty transcript safely.
    if not user_turns:
        return {
            "scores": {
                "logic": 0,
                "clarity": 0,
                "evidence": 0,
                "rebuttal_quality": 0,
            },
            "justifications": {
                "logic": "No user turns were available for evaluation.",
                "clarity": "No user turns were available for evaluation.",
                "evidence": "No user turns were available for evaluation.",
                "rebuttal_quality": "No user turns were available for evaluation.",
            },
            "overall_score": 0,
            "strong_moments": [],
            "weak_moments": [],
        }

    system = """
You are a rigorous and fair debate judge.

Evaluate ONLY the user's turns.
Do NOT score or praise the opponent's turns.

Use a 0-10 scale for each dimension:

1. logic
   - Logical consistency
   - Quality of reasoning
   - Avoidance of unsupported logical jumps

2. clarity
   - Clear expression of ideas
   - Organization
   - Conciseness
   - Ease of understanding

3. evidence
   - Use of facts, examples, statistics, sources, or concrete evidence
   - Do not assume evidence that the user did not provide

4. rebuttal_quality
   - How effectively the user responds to the opponent's arguments
   - Whether the user directly addresses opposing points
   - Strength of the response

Important:
- Base every score only on the supplied transcript.
- Do not invent evidence or quotes.
- Keep justifications concise.
- Return ONLY the JSON object requested by the user.
"""

    user = f"""
Debate topic:
{topic}

Full debate transcript:
{transcript}

User turns being evaluated:
{user_turns}

Evaluate the user's performance.

Return EXACTLY this JSON structure:

{{
  "scores": {{
    "logic": 0,
    "clarity": 0,
    "evidence": 0,
    "rebuttal_quality": 0
  }},
  "justifications": {{
    "logic": "Brief explanation based on the user's turns.",
    "clarity": "Brief explanation based on the user's turns.",
    "evidence": "Brief explanation based on the user's turns.",
    "rebuttal_quality": "Brief explanation based on the user's turns."
  }},
  "overall_score": 0,
  "strong_moments": [
    "Brief description or paraphrase of a strong user turn."
  ],
  "weak_moments": [
    "Brief description or paraphrase of a weak user turn."
  ]
}}

Rules:
- All scores must be numbers between 0 and 10.
- overall_score must be between 0 and 10.
- strong_moments must contain at most 3 items.
- weak_moments must contain at most 3 items.
- Do not include long quotations.
- Do not include markdown.
- Return valid JSON only.
"""

    return llm.call_json(
        system,
        user,
        max_tokens=2500,
    )