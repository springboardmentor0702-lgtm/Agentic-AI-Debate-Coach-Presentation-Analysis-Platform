from typing import List, Dict, Any


PERSONAS = {
    "skeptical": {
        "name": "Skeptical Analyst",
        "description": "Demands empirical evidence, scrutinizes assumptions, and challenges weak data.",
        "style": "analytical"
    },
    "aggressive": {
        "name": "Passionate Ideologue",
        "description": "Uses bold rhetoric, challenges moral principles, and emphasizes emotional conviction.",
        "style": "challenging"
    },
    "socratic": {
        "name": "Socratic Inquirer",
        "description": "Asks probing questions to expose internal contradictions and foundational definitions.",
        "style": "socratic"
    },
    "pragmatic": {
        "name": "Pragmatic Realist",
        "description": "Focuses on operational feasibility, economic trade-offs, and unintended consequences.",
        "style": "pragmatic"
    }
}


def get_personas() -> List[Dict]:
    return [
        {"id": key, **value}
        for key, value in PERSONAS.items()
    ]


def generate_opening(
    topic: str,
    position: str,
    persona: str = "skeptical"
) -> str:
    opposing_position = "against" if position.lower() == "for" else "for"
    persona_info = PERSONAS.get(persona, PERSONAS["skeptical"])

    if persona == "skeptical":
        return (
            f"Welcome to this debate on '{topic}'. As the opposition arguing {opposing_position}, "
            f"I challenge the premise that your position is supported by rigorous empirical data. "
            f"Present your opening claim and state your verifiable evidence."
        )
    elif persona == "socratic":
        return (
            f"We are here to examine the fundamental truths concerning '{topic}'. "
            f"Before defending your stance, what core principles and definitions "
            f"lead you to advocate {position} this motion?"
        )
    elif persona == "pragmatic":
        return (
            f"Regarding '{topic}', theoretical intentions matter far less than tangible outcomes. "
            f"How does your proposal address real-world cost, logistics, and enforcement constraints?"
        )
    else:
        return (
            f"I strongly advocate {opposing_position} '{topic}'. "
            f"The status quo cannot sustain your proposed direction. Convince me otherwise."
        )


def generate_opponent_response(
    topic: str,
    user_argument: str,
    persona: str,
    turn_number: int
) -> Dict[str, Any]:
    persona_data = PERSONAS.get(persona, PERSONAS["skeptical"])
    lower = user_argument.lower()

    has_evidence = any(
        word in lower
        for word in ["research", "study", "data", "evidence", "survey", "statistics", "%", "percent"]
    )
    has_reasoning = any(
        word in lower
        for word in ["because", "therefore", "however", "thus", "since", "consequently"]
    )

    if not has_evidence:
        response = (
            f"While your point on '{topic}' is articulate, it lacks concrete empirical substantiation. "
            f"What peer-reviewed research, statistical figures, or credible documentation supports your claim?"
        )
        strategy = "evidence_challenge"
        coach_feedback = "Coach Tip: Your opponent noted the absence of evidence. Quote a specific study, percentage, or verifiable fact in your next turn."

    elif not has_reasoning:
        response = (
            f"You provided supporting data, but you have not demonstrated how it logically leads to your conclusion. "
            f"Why does this evidence necessarily imply that your proposal will succeed?"
        )
        strategy = "reasoning_challenge"
        coach_feedback = "Coach Tip: Bridge your data to your conclusion using causal reasoning ('Because X occurred, Y will inevitably follow...')."

    elif persona_data["style"] == "socratic":
        response = (
            f"Interesting assertion. If we accept that principle, does it also apply in extreme boundary cases? "
            f"What trade-off are you willing to accept when this policy conflicts with individual liberty?"
        )
        strategy = "socratic_contradiction"
        coach_feedback = "Coach Tip: The Socratic opponent is testing your definitions. Clarify the boundary limits of your argument."

    elif persona_data["style"] == "pragmatic":
        response = (
            f"Even assuming the theoretical benefits hold, what is the implementation timeline and fiscal cost? "
            f"Who bears the economic burden if projected estimates fall short?"
        )
        strategy = "practical_constraint"
        coach_feedback = "Coach Tip: Rebut by demonstrating cost-effectiveness or presenting a phased rollout plan."

    else:
        response = (
            f"Your argument has merit, but it downplays significant counter-incentives. "
            f"An alternative perspective reveals that competing priorities would yield far greater societal return."
        )
        strategy = "alternative_perspective"
        coach_feedback = "Coach Tip: Strong defense! Now counter-attack your opponent's alternative by showing its hidden flaws."

    return {
        "response": response,
        "ai_response": response,
        "persona": persona,
        "persona_name": persona_data["name"],
        "turn": turn_number,
        "strategy": strategy,
        "coach_feedback": coach_feedback
    }


def generate_debate_summary(messages: List[Dict]) -> Dict[str, Any]:
    user_msgs = [
        m for m in messages
        if m.get("role") == "user" or m.get("speaker") == "user"
    ]
    ai_msgs = [
        m for m in messages
        if m.get("role") in ["ai", "assistant"] or m.get("speaker") in ["ai", "assistant"]
    ]

    total_turns = len(user_msgs)
    overview = (
        f"Debate concluded after {total_turns} round(s). "
        f"The user defended their position with consistent enthusiasm, demonstrating solid argumentation "
        f"and responding directly to opposing challenges."
    )

    strengths = [
        "Structured claims with clear thematic positioning.",
        "Prompt responsiveness to counterarguments during rebuttal phases.",
        "Effective rhetorical tone and clear conversational pacing."
    ]

    improvements = [
        "Incorporate more statistical citations and quantitative benchmarks.",
        "Anticipate pragmatic implementation obstacles before the opponent raises them.",
        "Strengthen logical transitions between intermediate premises."
    ]

    scores = {
        "overall_score": 83.5,
        "argument_quality": 85.0,
        "evidence_usage": 78.0,
        "logical_consistency": 86.0,
        "rebuttal_effectiveness": 82.0,
        "communication_skills": 88.0
    }

    return {
        "overview": overview,
        "strengths": strengths,
        "improvements": improvements,
        "scores": scores,
        "total_turns": total_turns,
        "user_turns": total_turns,
        "ai_turns": len(ai_msgs),
        "completed": True
    }
