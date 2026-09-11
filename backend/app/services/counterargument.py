from .ai_client import llm_json


def generate_counterarguments(text: str, topic: str = "", ctype: str = "logical") -> dict:
    fallback = {
        "type": ctype,
        "rebuttals": [
            f"Your premise assumes '{text[:60]}...' but this generalizes beyond what the evidence supports - the causal link you describe is not established.",
            "Even granting your claim, the cost-benefit balance shifts once you account for second-order effects you haven't addressed.",
            f"On the question of {topic or 'this topic'}, alternative frameworks (practical feasibility, long-term outcomes) suggest a different conclusion."],
        "challenge_questions": [
            "What specific evidence would change your position?",
            "How do you respond to counterexamples where this policy fails?",
            "Who bears the cost of your proposal, and is that fair?"],
        "strategy": "Attack the weakest evidentiary link first, then offer a constructive alternative."}
    return llm_json(
        'You are an elite debate coach. Produce sharp counterarguments. Return ONLY JSON: '
        '{"rebuttals":[str,str,str],"challenge_questions":[str,str,str],"strategy":str}',
        f"Topic: {topic}\nCounterargument type: {ctype}\nOpponent argument:\n{text}", fallback)
