import re

from .ai_client import llm_json

FALLACY_INFO = {
 "ad_hominem": "Attacking the person instead of their argument.",
 "straw_man": "Misrepresenting the opponent's position to attack a weaker version.",
 "false_dilemma": "Presenting only two options when more exist.",
 "slippery_slope": "Assuming one step inevitably leads to extreme outcomes without justification.",
 "appeal_to_authority": "Relying on authority rather than evidence.",
 "circular_reasoning": "The conclusion is assumed in the premise.",
 "hasty_generalization": "Drawing broad conclusions from insufficient examples.",
 "red_herring": "Introducing irrelevant information to divert attention.",
}
FALLACY_PATTERNS = {
 "ad_hominem": [r"\b(idiots?|stupid|dumb|clueless|fools?|morons?)\b"],
 "straw_man": [r"so you(?:'re| are) (?:saying|arguing)", r"you (?:just )?want (?:to ban|everyone)"],
 "false_dilemma": [r"\beither\b.*\bor\b", r"(no|the only) (other )?(choice|option|way)", r"two (and only two )?options"],
 "slippery_slope": [r"next thing (you know|we know)", r"will (inevitably )?lead to", r"before you know it", r"eventually everyone"],
 "appeal_to_authority": [r"experts (all )?(say|agree)", r"(scientists|doctors) say", r"as .{2,25} (himself|herself|said)"],
 "circular_reasoning": [r"because it('s| is) (good|true|right)", r"it('s| is) true because it('s| is) true"],
 "hasty_generalization": [r"\b(everyone knows|nobody can deny|all people)\b"],
 "red_herring": [r"(that's|that is) not the (point|issue)", r"\bwhat about\b"],
}
VALID_FALLACIES = list(FALLACY_INFO.keys())


def detect_fallacies(text: str) -> dict:
    found = []
    for name, pats in FALLACY_PATTERNS.items():
        for p in pats:
            m = re.search(p, text.lower())
            if m:
                found.append({"fallacy": name, "excerpt": m.group(0),
                    "explanation": FALLACY_INFO[name],
                    "correction": f"Rewrite to address the actual argument rather than using {name.replace('_', ' ')}.",
                    "confidence": 0.6})
                break
    fallback = {"fallacies": found, "credibility": max(0, 100 - len(found) * 15)}
    return llm_json(
        "You are a logical fallacy detection engine. Identify fallacies ONLY from this list: "
        + ", ".join(VALID_FALLACIES) +
        '. Return ONLY JSON: {"fallacies":[{"fallacy":name,"excerpt":str,"explanation":str,"correction":str,"confidence":0-1}],'
        '"credibility":0-100}',
        f"Text:\n{text}", fallback)
