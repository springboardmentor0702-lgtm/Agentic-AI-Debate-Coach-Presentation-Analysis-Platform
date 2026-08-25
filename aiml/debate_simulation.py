"""
debate_simulation.py
---------------------
Stage 2 of the pipeline: AI Debate Simulation
    • AI opponent persona
    • Multi-turn conversation
    • Context maintained across turns
"""

from llm_client import LLMClient


class DebateSimulator:
    """
    Maintains conversation state across turns so the AI opponent
    remembers what's already been said (context is NOT re-derived
    from scratch each turn — it's passed in full every call).
    """

    def __init__(self, llm: LLMClient, topic: str, opponent_stance: str, difficulty: str = "intermediate"):
        self.llm = llm
        self.topic = topic
        self.opponent_stance = opponent_stance
        self.difficulty = difficulty
        self.history: list[dict] = []  # [{"role": "user"/"opponent", "text": str}]

    def _system_prompt(self) -> str:
        difficulty_notes = {
            "beginner": "Use simple, direct rebuttals. Avoid highly technical jargon.",
            "intermediate": "Use solid reasoning and occasional evidence-based points.",
            "advanced": "Use sophisticated reasoning, cite plausible evidence/precedent, "
                        "anticipate the user's next move, and pressure-test weak logic hard.",
        }
        return f"""You are an AI debate opponent in a live debate.
Topic: {self.topic}
Your stance: {self.opponent_stance}
Difficulty level: {self.difficulty} — {difficulty_notes.get(self.difficulty, "")}

Rules:
- Stay in character as the opponent for the whole debate.
- Respond ONLY with your next spoken debate turn (no meta-commentary).
- Directly engage with the user's most recent point before introducing new ones.
- Keep each turn to 2-4 sentences, debate-speech style."""

    def _format_history(self) -> str:
        lines = []
        for turn in self.history:
            speaker = "User" if turn["role"] == "user" else "Opponent"
            lines.append(f"{speaker}: {turn['text']}")
        return "\n".join(lines) if lines else "(debate not yet started)"

    def opening_statement(self) -> str:
        user_prompt = f"Give your opening statement on the topic: {self.topic}"
        text = self.llm.call_text(self._system_prompt(), user_prompt)
        self.history.append({"role": "opponent", "text": text})
        return text

    def respond(self, user_turn: str) -> str:
        """Feed the user's latest turn, get the opponent's reply, keep context."""
        self.history.append({"role": "user", "text": user_turn})
        user_prompt = f"""Debate so far:
{self._format_history()}

Now give your next rebuttal turn responding to the user's latest point."""
        text = self.llm.call_text(self._system_prompt(), user_prompt, max_tokens=400)
        self.history.append({"role": "opponent", "text": text})
        return text

    def get_transcript(self) -> list[dict]:
        return self.history