import re
from typing import Dict, Any, List
from .ai_engine import ai_engine

class CounterargumentGenerationEngine:
    """
    Engine generating 5 distinct rebuttal paradigms:
    1. Logical Rebuttals
    2. Evidence-Based Rebuttals
    3. Ethical Counterarguments
    4. Practical Counterarguments
    5. Policy Counterarguments
    """

    def generate_counterarguments(self, text: str, context: str = "") -> Dict[str, Any]:
        text_clean = text.strip()
        if not text_clean:
            return {
                "rebuttals": [],
                "recommended_strategy": "Please enter an argument to generate targeted counter-strategies."
            }

        # 1. Try LLM if configured
        if ai_engine.is_llm_active():
            prompt = f"""
            Generate strong counterarguments to the following debate statement.
            Statement: "{text_clean}"
            Motion/Context: "{context}"

            Provide 5 counterarguments, one for each category:
            1. Logical Rebuttals (demonstrate inferential gaps or flawed premise linkage)
            2. Evidence-Based Rebuttals (counter with empirical metrics, study biases, or contradictory historical data)
            3. Ethical Counterarguments (critique underlying moral framework, rights vs utility, equity impacts)
            4. Practical Counterarguments (highlight operational barriers, financial strain, execution friction)
            5. Policy Counterarguments (propose a superior, less disruptive alternative mechanism)

            Return as a JSON object:
            {{
                "rebuttals": [
                    {{
                        "argument_type": "Logical Rebuttals | Evidence-Based Rebuttals | Ethical Counterarguments | Practical Counterarguments | Policy Counterarguments",
                        "rebuttal_text": "detailed 2-3 sentence rebuttal",
                        "strategy_tip": "strategic delivery advice for the debater",
                        "challenge_question": "sharp cross-examination question to ask the speaker"
                    }}
                ],
                "recommended_strategy": "overall strategic roadmap for winning this clash point"
            }}
            """
            try:
                res = ai_engine.generate_completion(prompt, system_prompt="You are a championship debate coach and argumentation strategist.")
                match = re.search(r"\{.*\}", res, re.DOTALL)
                if match:
                    import json
                    return json.loads(match.group(0))
            except Exception:
                pass

        # 2. Heuristic Agentic Rebuttal Generator
        words = text_clean.split()
        summary_core = " ".join(words[:12]) + ("..." if len(words) > 12 else "")

        rebuttals = [
            {
                "argument_type": "Logical Rebuttals",
                "rebuttal_text": f"The argument assumes that '{summary_core}' is both a necessary and sufficient condition. However, correlation does not equate to causation; alternative confounding variables account for these observed effects without necessitating this conclusion.",
                "strategy_tip": "Dissect the inferential link during cross-examination. Ask the opponent to isolate the single variable driving the outcome.",
                "challenge_question": "Can you demonstrate that this outcome wouldn't have occurred naturally through external macroeconomic trends alone?"
            },
            {
                "argument_type": "Evidence-Based Rebuttals",
                "rebuttal_text": f"The empirical evidence cited in support of '{summary_core}' suffers from selection bias and small sample sizes. Recent comparative meta-analyses demonstrate that real-world outcomes diverge sharply when testing across diverse demographic controls.",
                "strategy_tip": "Cite longitudinal data and counter-case studies to invalidate their isolated anecdotal benchmarks.",
                "challenge_question": "What peer-reviewed longitudinal dataset replicates your primary findings outside this specific control environment?"
            },
            {
                "argument_type": "Ethical Counterarguments",
                "rebuttal_text": f"Prioritizing '{summary_core}' compromises fundamental principles of procedural justice and proportionality. It disproportionately transfers negative externalities onto marginalized stakeholders who lack representation in the decision calculus.",
                "strategy_tip": "Frame the ethical calculus around rights and intergenerational fairness to win adjudicator empathy.",
                "challenge_question": "How does your proposed paradigm protect vulnerable minority interests who bear the primary burden of this intervention?"
            },
            {
                "argument_type": "Practical Counterarguments",
                "rebuttal_text": f"Even if theoretically viable, the operational implementation of '{summary_core}' entails prohibitive administrative overhead, severe regulatory bottlenecks, and systemic enforcement hazards that outweigh projected marginal benefits.",
                "strategy_tip": "Pivot the debate from theory to frontline execution. Adjudicators heavily discount policies that cannot realistically be enforced.",
                "challenge_question": "What is the exact funding timeline and regulatory enforcement mechanism required to prevent immediate implementation failure?"
            },
            {
                "argument_type": "Policy Counterarguments",
                "rebuttal_text": f"Rather than enforcing '{summary_core}', a decentralized incentive-based framework achieves identical societal objectives at a fraction of the cost without triggering systemic unintended side-effects.",
                "strategy_tip": "Deploy a 'Counter-Plan' (CP). Concede the underlying problem, but prove your alternative solution solves it more cleanly.",
                "challenge_question": "Why adopt a high-risk coercive mandate when targeted market-based subsidies solve the identical root bottleneck?"
            }
        ]

        recommended_strategy = (
            "Adopt an offense-defense hybrid approach: first attack the practical execution bottlenecks "
            "using the Practical Counterargument, then introduce the Policy Counter-Plan to capture the moral high ground."
        )

        return {
            "rebuttals": rebuttals,
            "recommended_strategy": recommended_strategy
        }

counterargument_engine = CounterargumentGenerationEngine()
