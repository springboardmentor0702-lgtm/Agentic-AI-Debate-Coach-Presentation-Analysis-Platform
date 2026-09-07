import re
from typing import Dict, Any, List
from .ai_engine import ai_engine

class LogicalFallacyDetectionEngine:
    """
    Detection engine for the 8 core fallacies mandated by the specification:
    1. Ad Hominem
    2. Straw Man
    3. False Dilemma
    4. Slippery Slope
    5. Appeal to Authority
    6. Circular Reasoning
    7. Hasty Generalization
    8. Red Herring
    """

    FALLACY_RULES = {
        "Ad Hominem": {
            "patterns": [
                r"\b(idiot|fool|corrupt|moron|naive|clueless|hypocrite|liar|unqualified|incompetent|stupid)\b",
                r"\b(you don't know what you're talking about|look at who is saying this|only a fool would)\b",
                r"\b(don't listen to (him|her|them)|biased because)\b"
            ],
            "simple_name": "Attacking the Person (Name-Calling)",
            "simple_meaning": "Insulting someone's character instead of answering their argument.",
            "explanation": "Attacking the character, motive, or background of the opponent rather than addressing the substance of their argument.",
            "correction": "Critique the opponent's facts and reasoning rather than their personality or background.",
            "severity": "High"
        },
        "Straw Man": {
            "patterns": [
                r"\b(so you want to destroy|so you're saying we should abolish all|wants everyone to suffer)\b",
                r"\b(you completely hate|you think money doesn't matter|you want total chaos)\b",
                r"\b(wants to ban everything|take away all our freedoms)\b"
            ],
            "simple_name": "Twisting Words (Straw Man)",
            "simple_meaning": "Exaggerating or changing what the other person said to make them sound crazy or wrong.",
            "explanation": "Exaggerating, misrepresenting, or oversimplifying the opponent's position to make it easier to attack.",
            "correction": "Address what the person actually said without exaggerating or twisting their words.",
            "severity": "High"
        },
        "False Dilemma": {
            "patterns": [
                r"\beither\b[\w\s,']+\bor\b",
                r"\b(the only alternative is|there are only two options|it's black or white|if you're not with us)\b",
                r"\b(if we don't .* society will collapse)\b"
            ],
            "simple_name": "Only Two Choices (Black-or-White Thinking)",
            "simple_meaning": "Pretending there are only two extreme options when there are actually many middle solutions.",
            "explanation": "Presenting complex issues as an artificial either/or binary while ignoring moderate, blended, or alternative pathways.",
            "correction": "Acknowledge that there are middle-ground options, compromises, and other solutions.",
            "severity": "Medium"
        },
        "Slippery Slope": {
            "patterns": [
                r"\b(if we allow this, next thing you know|will inevitably lead to the total collapse)\b",
                r"\b(opens the floodgates to|first it's .* and before long we will be)\b",
                r"\b(where does it stop\? It will end up destroy)\b"
            ],
            "simple_name": "Exaggerated Chain Reaction (Slippery Slope)",
            "simple_meaning": "Claiming that one small step will automatically lead to a huge disaster with no proof.",
            "explanation": "Asserting without evidence that an initial action will inevitably trigger a disastrous chain reaction of extreme consequences.",
            "correction": "Explain the exact realistic steps that would happen instead of jumping to the worst-case scenario.",
            "severity": "Medium"
        },
        "Appeal to Authority": {
            "patterns": [
                r"\b(a famous actor said|celebrities agree that|everyone knows that|experts agree with no source)\b",
                r"\b(he is a billionaire so he must be right|trust me because an influencer said)\b",
                r"\b(unnamed experts have proven)\b"
            ],
            "simple_name": "Believing Someone Just Because They're Famous",
            "simple_meaning": "Saying something must be true just because a celebrity or influencer said so.",
            "explanation": "Citing an unqualified authority or treating an opinion as fact without showing the real evidence.",
            "correction": "Share real facts, data, or research from qualified experts rather than just names.",
            "severity": "Medium"
        },
        "Circular Reasoning": {
            "patterns": [
                r"\b(is true because it is a fact|successful because it succeeds|it is right because that's the law)\b",
                r"\b(it's valid because I said it's true|it works because of its effectiveness)\b",
                r"\b(we must follow the rules because they are the rules)\b"
            ],
            "simple_name": "Repeating the Same Point (Circular Logic)",
            "simple_meaning": "Saying 'This is true because it is true' without giving any real reason.",
            "explanation": "Assuming the truth of the conclusion inside the claim itself; merely rewording the original statement.",
            "correction": "Give an external reason or real-world example to prove your point.",
            "severity": "High"
        },
        "Hasty Generalization": {
            "patterns": [
                r"\b(i know one case so all|my friend had this happen and that proves)\b",
                r"\b(all .* are always|none of them ever|this single example proves that every)\b",
                r"\b(based on this one experience, it is clear that all)\b"
            ],
            "simple_name": "Jumping to Conclusions (Hasty Generalization)",
            "simple_meaning": "Making a blanket rule for everyone based on just one personal story or tiny sample.",
            "explanation": "Drawing a universal conclusion from an isolated anecdotal instance or insufficient sample size.",
            "correction": "Use representative examples or say 'In some cases' instead of 'All people always...'.",
            "severity": "Medium"
        },
        "Red Herring": {
            "patterns": [
                r"\b(why are we talking about this when|what about the real problem of)\b",
                r"\b(that's unimportant compared to|don't look at this, look over there)\b",
                r"\b(how can we discuss .* when people are)\b"
            ],
            "simple_name": "Changing the Topic (Distraction / Red Herring)",
            "simple_meaning": "Bringing up an unrelated shocking topic to distract people from the main question.",
            "explanation": "Introducing an emotionally charged, irrelevant topic to distract attention from the core issue.",
            "correction": "Answer the main debate topic directly first before discussing other topics.",
            "severity": "Low"
        }
    }

    def detect_fallacies(self, text: str) -> Dict[str, Any]:
        text_clean = text.strip()
        if not text_clean:
            return {
                "detected_fallacies": [],
                "credibility_penalty": 0.0,
                "reasoning_analysis": "No text provided for fallacy inspection."
            }

        # 1. Try LLM if available
        if ai_engine.is_llm_active():
            prompt = f"""
            Analyze the following debate text for logical fallacies.
            Look specifically for: Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, Red Herring.
            
            Text: "{text_clean}"

            Return a valid JSON object matching:
            {{
                "detected_fallacies": [
                    {{
                        "fallacy_type": "string (one of the 8 fallacies)",
                        "quote": "string (the exact or closely matched phrase)",
                        "explanation": "string (why this constitutes a fallacy)",
                        "correction_suggestion": "string (how to rephrase legitimately)",
                        "severity": "Low|Medium|High"
                    }}
                ],
                "credibility_penalty": number (0 to 40),
                "reasoning_analysis": "string summary"
            }}
            """
            try:
                res = ai_engine.generate_completion(prompt, system_prompt="You are a formal logic professor and fallacy detection judge.")
                match = re.search(r"\{.*\}", res, re.DOTALL)
                if match:
                    import json
                    return json.loads(match.group(0))
            except Exception:
                pass

        # 2. Rule-based heuristic pattern matcher
        detected = []
        total_penalty = 0.0

        for f_name, info in self.FALLACY_RULES.items():
            for pattern in info["patterns"]:
                match = re.search(pattern, text_clean, re.IGNORECASE)
                if match:
                    quote_text = match.group(0)
                    # Expand context around match
                    start_pos = max(0, match.start() - 25)
                    end_pos = min(len(text_clean), match.end() + 25)
                    expanded_quote = text_clean[start_pos:end_pos].strip()

                    severity = info["severity"]
                    penalty = 12.0 if severity == "High" else (8.0 if severity == "Medium" else 4.0)
                    total_penalty += penalty

                    detected.append({
                        "fallacy_type": f_name,
                        "simple_name": info.get("simple_name", f_name),
                        "simple_meaning": info.get("simple_meaning", info["explanation"]),
                        "quote": f"...{expanded_quote}...",
                        "explanation": info["explanation"],
                        "correction_suggestion": info["correction"],
                        "severity": severity
                    })
                    break  # avoid multiple hits for the same fallacy

        credibility_penalty = min(50.0, total_penalty)

        if detected:
            fallacy_names = ", ".join([f["fallacy_type"] for f in detected])
            analysis = f"Identified {len(detected)} critical reasoning flaw(s) ({fallacy_names}) that degrade argument soundness and adjudicator credibility."
        else:
            analysis = "No blatant formal or informal fallacies detected. The line of reasoning maintains formal structural validity."

        return {
            "detected_fallacies": detected,
            "credibility_penalty": round(credibility_penalty, 1),
            "reasoning_analysis": analysis
        }

fallacy_engine = LogicalFallacyDetectionEngine()
