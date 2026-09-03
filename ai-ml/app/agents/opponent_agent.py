"""Persona-driven opponent for debate simulation."""
from app.agents.base_agent import BaseAgent


class OpponentAgent(BaseAgent):
    name = "OpponentAgent"
    role = "Challenges an argument in a selected debate persona."

    def run(self, argument_text: str, persona: str = "The Contrarian") -> dict:
        text = " ".join((argument_text or "").split())
        persona = persona if persona in {"The Contrarian", "The Academic", "The Strategist"} else "The Contrarian"
        prompts = {
            "The Contrarian": "I challenge your core premise.",
            "The Academic": "Your argument needs clearer definitions and methodological support.",
            "The Strategist": "Your thesis needs a stronger implementation plan.",
        }
        return {"persona": persona, "opponent_rebuttal": f"{prompts[persona]} What evidence would change your position?", "rebuttal_strength_percent": 60.0 if text else 0.0}


opponent_agent = OpponentAgent()
