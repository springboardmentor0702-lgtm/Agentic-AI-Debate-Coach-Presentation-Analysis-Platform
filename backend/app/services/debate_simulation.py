from .ai_client import llm_text

PHASES = {"opening": "Deliver a strong opening statement.",
          "rebuttal": "Directly rebut the opponent's last point, then advance your case.",
          "closing": "Deliver a persuasive closing summary."}


def ai_opponent_turn(topic: str, ai_position: str, user_text: str, phase: str, turn_no: int) -> str:
    fallback = (
        f"[{phase.title()} - turn {turn_no}] I maintain the {'affirmative' if ai_position == 'pro' else 'negative'} position on '{topic}'. "
        + (f"My opponent argues: \"{user_text[:140]}...\" - but this rests on three shaky pillars. "
           "First, the evidence cited is correlational, not causal. Second, the argument ignores the "
           "practical costs of implementation. Third, even if partially true, proportionality matters: "
           "the remedy proposed exceeds the harm demonstrated. "
           if user_text else
           "The core of my case rests on measurable outcomes, expert consensus built on peer-reviewed "
           "research, and the principle that policy should follow evidence rather than sentiment. ")
        + "I look forward to specific evidence, not assertion, in response.")
    return llm_text(
        f"You are a formidable AI debate opponent arguing the {'FOR' if ai_position == 'pro' else 'AGAINST'} side "
        f"of: '{topic}'. Phase: {PHASES.get(phase, 'rebuttal')} Keep it under 220 words, use evidence style, "
        "numbered reasoning, and end with one pointed challenge question. Output only your speech.",
        f"Opponent's last statement:\n{user_text or '(opening move - you speak first)'}", fallback)
