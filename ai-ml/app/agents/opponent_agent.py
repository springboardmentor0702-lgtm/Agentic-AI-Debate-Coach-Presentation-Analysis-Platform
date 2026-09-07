"""
Persona-driven opponent agent for debate simulation.
Generates structured, English-only rebuttals adapting to debate persona, topic, and turn history.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.agents.base_agent import BaseAgent
from app.language_guard import ENGLISH_ONLY_INSTRUCTION, enforce_english, is_probably_english
from app.llm_client import call_llm_json, safe_call_llm_json

PERSONAS: Dict[str, Dict[str, str]] = {
    "The Contrarian": {
        "style": "Challenges core premises, questions consensus assumptions, and highlights logical counter-examples.",
        "opening": "I challenge the premise of this motion. Present your opening case and let us test its foundations.",
    },
    "The Academic": {
        "style": "Demands methodological clarity, empirical rigor, verifiable evidence, and precise definitions.",
        "opening": "We must examine the definitions, data sources, and empirical evidence underlying this proposition.",
    },
    "The Strategist": {
        "style": "Focuses on execution feasibility, systemic incentives, second-order effects, and pragmatic trade-offs.",
        "opening": "Setting aside abstract ideals, we must examine real-world implementation, costs, and trade-offs.",
    },
}

DIFFICULTY_LEVELS: tuple[str, ...] = ("easy", "medium", "hard")
DEFAULT_PERSONA = "The Contrarian"
MIN_WORDS = 4


class OpponentAgent(BaseAgent):
    name = "OpponentAgent"
    role = "Engages learners in multi-turn debate simulation with distinct rhetorical personas in English."

    def _resolve_persona(self, persona: Any) -> str:
        clean = str(persona or "").strip().lower().replace("the ", "")
        if not clean:
            return DEFAULT_PERSONA
        for canonical in PERSONAS:
            if clean == canonical.lower().replace("the ", ""):
                return canonical
        return DEFAULT_PERSONA

    def _resolve_difficulty(self, difficulty: Any) -> str:
        clean = str(difficulty or "").strip().lower()
        return clean if clean in DIFFICULTY_LEVELS else "medium"

    def _format_history(self, history: Optional[List[Dict[str, Any]]]) -> str:
        if not history:
            return "(This is the opening turn of the debate round.)"
        lines = []
        for turn in history[-6:]:
            if isinstance(turn, dict):
                if "speaker" in turn and "text" in turn:
                    spk = "HUMAN" if str(turn["speaker"]).lower() in ("user", "you") else "YOU"
                    lines.append(f"{spk}: {turn['text']}")
                else:
                    if turn.get("user_argument"):
                        lines.append(f"HUMAN: {turn['user_argument']}")
                    if turn.get("ai_response") or turn.get("opponent_rebuttal"):
                        lines.append(f"YOU: {turn.get('ai_response') or turn.get('opponent_rebuttal')}")
        return "\n".join(lines) if lines else "(This is the opening turn of the debate round.)"

    def opening_statement(
        self,
        topic: str = "",
        persona: str = DEFAULT_PERSONA,
        user_position: str = "Affirmative",
    ) -> Dict[str, Any]:
        canonical_persona = self._resolve_persona(persona)
        topic_clean = str(topic or "the motion").strip()
        user_pos_clean = str(user_position or "Affirmative").strip()
        opp_pos = "Negative" if user_pos_clean.lower() == "affirmative" else "Affirmative"

        system_prompt = f"""You are the AI debate opponent in a live competitive debate.
Persona: {canonical_persona} ({PERSONAS[canonical_persona]['style']})
Topic: "{topic_clean}"
User's Position: {user_pos_clean}
Your Position: {opp_pos}

{ENGLISH_ONLY_INSTRUCTION}

Generate an opening statement for the debate round. Respond ONLY with a JSON object:
{{
  "response_text": "Your crisp 2-3 sentence opening challenge in English.",
  "tactic_used": "e.g. Framing the Motion / Burden of Proof / Epistemic Challenge",
  "challenge_question": "A focused question challenging the user's opening thesis.",
  "coach_note": "A brief coaching tip on how to handle this opening.",
  "status": "opening_generated",
  "message": "Opening statement generated."
}}
"""
        user_prompt = f"Deliver your opening statement opposing '{topic_clean}' from the {opp_pos} stance."
        res = safe_call_llm_json(system_prompt, user_prompt)

        response_text = enforce_english(
            res.get("response_text", ""),
            fallback=f"{PERSONAS[canonical_persona]['opening']} On '{topic_clean}', defend your {user_pos_clean} case.",
        )
        challenge_q = enforce_english(
            res.get("challenge_question", ""),
            fallback=f"What is your central thesis defending '{topic_clean}'?",
        )
        coach_note = enforce_english(
            res.get("coach_note", ""),
            fallback=f"Persona {canonical_persona}: Lead with your strongest premise and clear definitions.",
        )

        return {
            "persona": canonical_persona,
            "response_text": response_text,
            "tactic_used": res.get("tactic_used") or "Frame the motion",
            "challenge_question": challenge_q,
            "coach_note": coach_note,
            "turn_index": 0,
            "status": "opening_generated",
            "message": "ok",
        }

    def run(
        self,
        user_argument: Optional[str] = None,
        topic: str = "",
        persona: str = DEFAULT_PERSONA,
        history: Optional[List[Dict[str, Any]]] = None,
        user_position: str = "Affirmative",
        difficulty: str = "medium",
        turn_index: int = 0,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        raw_text = user_argument or kwargs.get("argument_text") or ""
        clean_text = " ".join(str(raw_text).split())
        canonical_persona = self._resolve_persona(persona or kwargs.get("opponent_persona"))
        canonical_diff = self._resolve_difficulty(difficulty)
        clean_topic = str(topic or kwargs.get("topic") or "the debated resolution").strip()
        clean_pos = str(user_position or "Affirmative").strip()
        idx = max(0, int(turn_index or kwargs.get("turn_index") or 0))

        if not clean_text or len(clean_text.split()) < MIN_WORDS:
            return {
                "persona": canonical_persona,
                "response_text": "I await your full argument. Please present your claim with supporting evidence.",
                "tactic_used": "Demand Proposition",
                "attacked_point": "lack of complete argument",
                "challenge_question": "What is your main point regarding this topic?",
                "user_argument_strength": 0,
                "coach_note": "Ensure you state a clear claim before moving to evidence.",
                "turn_index": idx,
                "status": "fallback_response",
                "message": "No complete argument submitted for this turn.",
            }

        formatted_history = self._format_history(history)
        system_prompt = f"""You are a master debate opponent in a live competitive debate simulation.
Persona: {canonical_persona} - {PERSONAS[canonical_persona]['style']}
Debate Topic: "{clean_topic}"
User Position: {clean_pos}
Difficulty Level: {canonical_diff}

{ENGLISH_ONLY_INSTRUCTION}

You must evaluate the human speaker's argument and deliver a direct, formidable, and coherent counter-argument in the style of your persona.

Respond ONLY with a JSON object in this exact schema:
{{
  "response_text": "Your direct 2-4 sentence rebuttal in fluent English addressing their specific claims.",
  "tactic_used": "Name of the rhetorical/debate tactic used",
  "attacked_point": "The exact weakness or unproven assumption targeted in their argument",
  "challenge_question": "A sharp Socratic question forcing them to defend their premise",
  "user_argument_strength": <integer 0-100 evaluating the logical strength of the user's input>,
  "coach_note": "A 1-2 sentence actionable coaching tip advising how the user can defend against this rebuttal"
}}
"""
        user_prompt = f"""Debate History so far:
{formatted_history}

Current Human Argument (Turn {idx + 1}):
\"{clean_text}\"

Formulate your persona counter-argument now:"""

        raw_result = safe_call_llm_json(system_prompt, user_prompt)

        default_rebuttals = {
            "The Contrarian": f"I challenge the premise that '{clean_text[:60]}...' is sound without addressing counter-evidence.",
            "The Academic": f"Your argument regarding '{clean_text[:60]}...' requires verified methodology and empirical evidence.",
            "The Strategist": f"While '{clean_text[:60]}...' sounds plausible, practical constraints and trade-offs undermine its viability.",
        }

        # Check if LLM call failed or returned unexpected shape
        is_fallback = "error" in raw_result or not raw_result.get("response_text")

        response_text = enforce_english(
            raw_result.get("response_text", ""),
            fallback=default_rebuttals.get(canonical_persona, default_rebuttals[DEFAULT_PERSONA]),
        )
        challenge_q = enforce_english(
            raw_result.get("challenge_question", ""),
            fallback="What empirical evidence or falsifiable premise supports your central claim?",
        )
        coach_note = enforce_english(
            raw_result.get("coach_note", ""),
            fallback=f"Persona {canonical_persona}: Address the counter-challenge directly.",
        )
        attacked_point = enforce_english(
            raw_result.get("attacked_point", ""),
            fallback="Assumed premise validity",
        )

        try:
            arg_strength = int(round(float(raw_result.get("user_argument_strength", 0 if is_fallback else 65))))
            arg_strength = max(0, min(100, arg_strength))
        except (TypeError, ValueError):
            arg_strength = 0 if is_fallback else 60

        return {
            "persona": canonical_persona,
            "response_text": response_text,
            "tactic_used": str(raw_result.get("tactic_used") or "Direct Refutation")[:100],
            "attacked_point": attacked_point[:300],
            "challenge_question": challenge_q[:300],
            "user_argument_strength": 0 if is_fallback else arg_strength,
            "coach_note": coach_note[:500],
            "turn_index": idx,
            "status": "fallback_response" if is_fallback else "response_generated",
            "message": raw_result.get("error") or "ok",
        }


opponent_agent = OpponentAgent()
