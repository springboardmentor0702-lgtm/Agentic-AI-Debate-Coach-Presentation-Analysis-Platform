"""Deterministic persona opponent service."""

PERSONAS = {"The Contrarian", "The Academic", "The Strategist"}

def generate_opponent_response(text: str, persona: str) -> dict:
    if not text or not text.strip():
        raise ValueError("Argument text cannot be empty.")
    persona = persona if persona in PERSONAS else "The Contrarian"
    prefix = {
        "The Contrarian": "I challenge your core premise.",
        "The Academic": "Your argument needs clearer methodological support.",
        "The Strategist": "Your thesis needs a stronger implementation plan.",
    }[persona]
    return {"opponent_rebuttal": f"{prefix} What evidence would change your position?", "rebuttal_strength_percent": 60.0, "coaching_tip": f"Persona style: {persona}. Address the challenge directly."}
