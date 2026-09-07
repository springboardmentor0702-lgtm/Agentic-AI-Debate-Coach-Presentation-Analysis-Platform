import re
from typing import Dict, Any, List
from .ai_engine import ai_engine
from .fallacy_engine import fallacy_engine
from .glossary import extract_difficult_words

class AIDebateSimulationEngine:
    """
    Multi-turn AI debate engine supporting configurable opponent personas:
    1. Dr. Eleanor Vance (Empirical Scholar) - High evidence, statistical critique
    2. Marcus Reed (Aggressive Cross-Examiner) - Relentless clash, exposes assumptions
    3. Prof. Sophia Lin (Socratic Inquirer) - Philosophical depth, foundational questions
    Also provides real-time coaching assistance for the human debater.
    """

    PERSONAS = {
        "Dr. Eleanor Vance (Empirical Scholar)": {
            "style": "rigorous, metric-focused, demands empirical citations, systematic breakdown",
            "opening_prefix": "While I appreciate my worthy opponent's passion, empirical data reveals a starkly different reality.",
            "tone": "Scholarly, authoritative, evidence-grounded"
        },
        "Marcus Reed (Aggressive Cross-Examiner)": {
            "style": "combative, rapid-fire clash, exploits logical inconsistencies and procedural gaps",
            "opening_prefix": "My opponent's line of reasoning collapses under the slightest scrutiny.",
            "tone": "Incivility-free sharp adversarial critique"
        },
        "Prof. Sophia Lin (Socratic Inquirer)": {
            "style": "inquiring, questions unstated presuppositions, reframes ethical and societal paradigms",
            "opening_prefix": "Let us step back and examine the fundamental premise that underpins this assertion.",
            "tone": "Probing, intellectual, philosophical"
        }
    }

    def generate_opponent_turn(
        self,
        topic: str,
        opponent_persona: str,
        opponent_position: str,
        user_argument: str,
        turn_number: int,
        debate_format: str = "Oxford Debate"
    ) -> Dict[str, Any]:
        persona_info = self.PERSONAS.get(opponent_persona, self.PERSONAS["Dr. Eleanor Vance (Empirical Scholar)"])

        # Check for fallacies in user argument first
        fallacy_check = fallacy_engine.detect_fallacies(user_argument)
        detected_fallacies = fallacy_check.get("detected_fallacies", [])

        # 1. Try LLM if configured
        if ai_engine.is_llm_active():
            prompt = f"""
            You are debating in a {debate_format} round on the topic: "{topic}".
            Your assigned position is {opponent_position}.
            Your persona is {opponent_persona} with style: {persona_info['style']}.
            Turn number: {turn_number}.
            
            The opponent just argued:
            "{user_argument}"

            Generate:
            1. Your substantive debate response (2-3 concise, powerful paragraphs).
            2. A 'live_coaching_hint' for the user's debate coach panel (advising the user how best to counter what you just said).
            3. Two 'quick_tips' for the user.

            Format output as JSON:
            {{
                "opponent_speech": "your full counter speech",
                "live_coaching_hint": "strategic advice for the user",
                "quick_tips": ["tip 1", "tip 2"]
            }}
            """
            try:
                res = ai_engine.generate_completion(prompt, system_prompt=f"You are {opponent_persona}, an elite debate champion.")
                match = re.search(r"\{.*\}", res, re.DOTALL)
                if match:
                    import json
                    parsed = json.loads(match.group(0))
                    opp_speech = parsed.get("opponent_speech", "")
                    feedback = self._generate_ai_feedback(user_argument, opponent_persona, opp_speech, detected_fallacies)
                    return {
                        "ai_response": opp_speech,
                        "live_coaching_hint": parsed.get("live_coaching_hint", ""),
                        "detected_fallacies": detected_fallacies,
                        "quick_tips": parsed.get("quick_tips", []),
                        "ai_feedback": feedback
                    }
            except Exception:
                pass

        # 2. Heuristic Agentic Debate Simulation Response
        prefix = persona_info["opening_prefix"]
        arg_snippet = " ".join(user_argument.split()[:10]) + "..." if len(user_argument.split()) > 10 else user_argument

        if "Eleanor Vance" in opponent_persona:
            speech = (
                f"{prefix} The claim that '{arg_snippet}' relies on an unverified causal leap. "
                f"When we look at comprehensive longitudinal evaluations across international policy trials, "
                f"we see that the affirmative's mechanism fails to account for secondary economic feedback loops.\n\n"
                f"Specifically, independent research by leading policy institutes indicates that unilateral intervention "
                f"leads to a 14% to 22% variance in systemic outcomes, demonstrating that market-driven adaptation or targeted "
                f"institutional reforms achieve significantly higher stability. If we commit to {opponent_position.lower()} on this motion, "
                f"we protect evidentiary integrity and preserve long-term institutional trust."
            )
            coach_hint = "Dr. Vance is attacking your lack of empirical data. In your next turn, cite concrete historical or statistical precedents to re-anchor your credibility."
            quick_tips = [
                "Cite a specific percentage, study, or jurisdiction that succeeded under your framework.",
                "Turn her point: argue that waiting for perfect empirical data paralyzes urgent moral action."
            ]

        elif "Marcus Reed" in opponent_persona:
            speech = (
                f"{prefix} Notice what the speaker conveniently omitted: '{arg_snippet}'. "
                f"This entire construct is built upon a fundamental contradiction. You cannot simultaneously advocate for "
                f"this policy while claiming to safeguard stakeholder autonomy. When the practical consequences unfold, "
                f"who absorbs the catastrophic externalities? Certainly not the proponents in this chamber.\n\n"
                f"Furthermore, this proposal establishes an uncontrollable precedent. By conceding the premise, "
                f"you surrender the adjudicators' ability to draw clear, defensible boundaries in future cases. "
                f"The only rational decision on the ballot is to vote {opponent_position}."
            )
            coach_hint = "Marcus is using aggressive cross-examination tactics to force you into a corner. Reject his false dichotomy immediately and clarify your boundary conditions."
            quick_tips = [
                "Identify his slippery slope assertion and state clearly: 'This policy has explicit statutory limits.'",
                "Keep your composure: maintain a measured, articulate tone to contrast his aggression."
            ]

        else: # Prof. Sophia Lin
            speech = (
                f"{prefix} When my opponent asserts that '{arg_snippet}', we are invited to accept an unexamined normative premise: "
                f"that utilitarian optimization should supersede deontological dignity. But is society truly a balance sheet "
                f"to be adjusted at will?\n\n"
                f"If we adopt the {opponent_position} stance, we recognize that true human flourishing requires respecting institutional "
                f"pluralism and individual agency. The affirmative proposal reduces complex moral questions to an administrative formula, "
                f"and in doing so, surrenders the very values it claims to protect."
            )
            coach_hint = "Prof. Lin is shifting the clash to moral and ethical philosophy. Pivot back to concrete human impacts to demonstrate why your stance is both ethical and urgent."
            quick_tips = [
                "Address her ethical challenge: explain how real-world harms to individuals outweigh abstract philosophical concerns.",
                "Use a vivid human case study to make the ethical stakes tangible for the judges."
            ]

        # If user committed fallacies, inject a direct callout into the AI response
        if detected_fallacies:
            f_top = detected_fallacies[0]
            speech += f"\n\nMoreover, the speaker commits a clear {f_top['fallacy_type']} error: {f_top['explanation']} I urge the adjudicators to discount this compromised reasoning."

        ai_feedback = self._generate_ai_feedback(user_argument, opponent_persona, speech, detected_fallacies)

        return {
            "ai_response": speech,
            "live_coaching_hint": coach_hint,
            "detected_fallacies": detected_fallacies,
            "quick_tips": quick_tips,
            "ai_feedback": ai_feedback
        }

    def _generate_ai_feedback(
        self,
        user_argument: str,
        opponent_persona: str,
        opponent_speech: str,
        detected_fallacies: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generates plain-English feedback, praise, tips, word definitions, and suggested replies."""
        words = user_argument.split()
        word_count = len(words)
        user_lower = user_argument.lower()

        # 1. Plain English Praise
        if detected_fallacies:
            praise = "You showed great energy and took a bold stand! Confidence is a key strength in debates."
        elif word_count >= 25 or any(k in user_lower for k in ["because", "for example", "evidence", "study", "data"]):
            praise = "Terrific reasoning! You clearly linked your claim to real explanations and supporting details."
        else:
            praise = "Clear, direct delivery! You expressed your core opinion in simple, easy-to-follow terms."

        # 2. Friendly, constructive tip
        if detected_fallacies:
            f_top = detected_fallacies[0]
            s_name = f_top.get("simple_name", f_top.get("fallacy_type", "reasoning trap"))
            s_meaning = f_top.get("simple_meaning", "Stick directly to verified facts.")
            tip = f"Coaching Tip on '{s_name}': {s_meaning} Avoid sweeping generalizations—give one concrete example instead."
        elif word_count < 18:
            tip = "Try adding a 'Warrant' (the explanation connecting your fact to your conclusion). Ask yourself: 'WHY does this happen?'"
        elif "Eleanor Vance" in opponent_persona:
            tip = "Dr. Vance relies heavily on numbers. In your next speech, counter with a real-life human impact story."
        elif "Marcus Reed" in opponent_persona:
            tip = "Marcus is trying to push an extreme either/or dilemma. Tell the judges: 'We have sensible middle-ground safeguards.'"
        else:
            tip = "Prof. Lin is questioning your moral philosophy. Explain who actually benefits most in everyday life."

        # 3. Extract difficult words with everyday explanations
        combined_text = f"{user_argument} {opponent_speech}"
        difficult_words = extract_difficult_words(combined_text)

        # 4. Ready-to-use suggested reply for user's next turn
        if "Eleanor Vance" in opponent_persona:
            suggested_reply = (
                "While empirical statistics are important, they cannot replace moral action. "
                "Real families face this challenge today, and waiting years for more studies will cause irreversible harm."
            )
        elif "Marcus Reed" in opponent_persona:
            suggested_reply = (
                "I reject the idea that this is an all-or-nothing choice. "
                "Our proposal puts in place clear, practical safeguards that prevent the extreme scenario you described."
            )
        else:
            suggested_reply = (
                "Abstract philosophical theories are interesting, but our primary duty is practical results. "
                "The tangible benefits of our solution directly improve everyday human lives."
            )

        return {
            "praise": praise,
            "constructive_tip": tip,
            "difficult_words": difficult_words,
            "suggested_reply": suggested_reply
        }

simulation_engine = AIDebateSimulationEngine()
