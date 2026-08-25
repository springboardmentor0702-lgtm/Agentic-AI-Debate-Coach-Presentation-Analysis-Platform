"""
counterargument.py
-------------------
Stage 1 of the pipeline: Counterargument Generation
    • Claim extraction
    • Argument analysis
    • Counterargument generation
"""

from llm_client import LLMClient


def extract_claims(llm: LLMClient, argument_text: str) -> list[dict]:
    """
    Breaks the user's argument into discrete, checkable claims.
    Returns a list of {"claim": str, "type": "factual|value|policy"}.
    """
    system = (
        "You are a debate analyst. Extract the distinct claims made in an "
        "argument. Classify each as 'factual', 'value', or 'policy'."
    )
    user = f"""Argument:
\"\"\"{argument_text}\"\"\"

Return JSON: {{"claims": [{{"claim": "...", "type": "..."}}]}}"""
    result = llm.call_json(system, user)
    return result.get("claims", [])


def analyze_argument(llm: LLMClient, topic: str, argument_text: str, claims: list[dict]) -> dict:
    """
    Evaluates structural quality of the argument before any rebuttal is built:
    logical structure, strongest point, weakest point, unsupported assumptions.
    """
    system = (
        "You are an expert debate coach analyzing argument structure, "
        "not yet arguing against it."
    )
    user = f"""Topic: {topic}
Argument: \"\"\"{argument_text}\"\"\"
Extracted claims: {claims}

Return JSON with keys:
"logical_structure" (short assessment),
"strongest_point" (string),
"weakest_point" (string),
"unsupported_assumptions" (list of strings)"""
    return llm.call_json(system, user)


def generate_counterarguments(llm: LLMClient, topic: str, argument_text: str, analysis: dict) -> list[dict]:
    """
    Produces counterarguments targeted at the weakest points / assumptions
    found during analysis, each tagged with the rebuttal strategy used.
    """
    system = (
        "You are a skilled debate opponent. Generate strong, fair "
        "counterarguments — not strawmen. Target real weaknesses."
    )
    user = f"""Topic: {topic}
Original argument: \"\"\"{argument_text}\"\"\"
Argument analysis: {analysis}

Return JSON: {{"counterarguments": [
  {{"point": "...", "strategy": "e.g. undercut assumption / counter-example / alternative framing", "targets": "which weakness this attacks"}}
]}}"""
    result = llm.call_json(system, user)
    return result.get("counterarguments", [])


def run_counterargument_stage(llm: LLMClient, topic: str, argument_text: str) -> dict:
    """Runs the full Stage 1 pipeline and returns a combined package."""
    claims = extract_claims(llm, argument_text)
    analysis = analyze_argument(llm, topic, argument_text, claims)
    counterarguments = generate_counterarguments(llm, topic, argument_text, analysis)
    return {
        "claims": claims,
        "analysis": analysis,
        "counterarguments": counterarguments,
    }