import random
from typing import Dict, List


PERSONAS = {
    "supportive": {
        "name": "Supportive Opponent",
        "description": "Encourages discussion while presenting reasonable objections.",
        "style": "friendly"
    },

    "skeptical": {
        "name": "Skeptical Opponent",
        "description": "Questions assumptions and asks for stronger evidence.",
        "style": "critical"
    },

    "aggressive": {
        "name": "Aggressive Opponent",
        "description": "Challenges claims directly and quickly.",
        "style": "challenging"
    },

    "academic": {
        "name": "Academic Opponent",
        "description": "Focuses on evidence, reasoning and precise definitions.",
        "style": "analytical"
    }
}


def get_personas() -> List[Dict]:

    return [
        {
            "id": key,
            **value
        }

        for key, value in PERSONAS.items()
    ]


def generate_opening(
    topic: str,
    position: str,
    persona: str
) -> str:

    persona_data = PERSONAS.get(
        persona,
        PERSONAS["skeptical"]
    )

    opponent_position = (
        "against"
        if position.lower() == "for"
        else "for"
    )

    if persona_data["style"] == "friendly":

        return (
            f"I understand the argument in favor of "
            f"{topic}. However, I will argue {opponent_position} "
            f"it and examine whether there are stronger alternatives."
        )

    if persona_data["style"] == "critical":

        return (
            f"You argue {position} {topic}. "
            f"My first question is: what reliable evidence "
            f"supports the central claim behind your position?"
        )

    if persona_data["style"] == "challenging":

        return (
            f"I disagree with the {position} position on "
            f"{topic}. Your argument needs to explain why "
            f"the proposed approach would actually work."
        )

    return (
        f"Let us examine the {topic} debate carefully. "
        f"I will challenge the {position} position by "
        f"examining its assumptions, evidence and conclusions."
    )


def generate_opponent_response(
    topic: str,
    user_argument: str,
    persona: str,
    turn_number: int
) -> Dict:

    persona_data = PERSONAS.get(
        persona,
        PERSONAS["skeptical"]
    )

    lower = user_argument.lower()

    has_evidence = any(
        word in lower
        for word in [
            "research",
            "study",
            "data",
            "evidence",
            "survey",
            "statistics"
        ]
    )

    has_reasoning = any(
        word in lower
        for word in [
            "because",
            "therefore",
            "however",
            "thus",
            "since"
        ]
    )

    if not has_evidence:

        response = (
            f"You have presented a position about {topic}, "
            f"but I am not convinced by the evidence. "
            f"What reliable data or research supports your claim?"
        )

        strategy = "evidence_challenge"

    elif not has_reasoning:

        response = (
            "You have provided some supporting information, "
            "but the connection between that evidence and "
            "your conclusion needs to be explained more clearly. "
            "Why does the evidence necessarily support your conclusion?"
        )

        strategy = "reasoning_challenge"

    elif persona_data["style"] == "analytical":

        response = (
            "Your argument has supporting evidence. "
            "However, we should examine whether the evidence "
            "is representative and whether alternative "
            "interpretations are possible."
        )

        strategy = "alternative_interpretation"

    elif persona_data["style"] == "challenging":

        response = (
            "Even if your evidence is correct, your conclusion "
            "may be too broad. What assumptions are you making "
            "and what would happen if those assumptions were wrong?"
        )

        strategy = "assumption_challenge"

    else:

        response = (
            "That is a reasonable point. However, an opposing "
            "perspective would argue that there are additional "
            "factors that your argument has not considered."
        )

        strategy = "alternative_perspective"

    return {
        "response": response,
        "persona": persona,
        "persona_name": persona_data["name"],
        "turn": turn_number,
        "strategy": strategy
    }


def generate_debate_summary(
    messages: List[Dict]
) -> Dict:

    user_messages = [
        message
        for message in messages
        if message.get("speaker") == "user"
    ]

    ai_messages = [
        message
        for message in messages
        if message.get("speaker") == "ai"
    ]

    return {
        "total_turns": len(user_messages),
        "user_turns": len(user_messages),
        "ai_turns": len(ai_messages),
        "completed": len(user_messages) >= 3
    }
