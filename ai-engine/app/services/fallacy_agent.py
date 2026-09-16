from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
import re
from app.core.config import settings
from app.schemas.fallacy import FallacyReportSchema
from app.services.timing import timed_invoke


_referee_llm = ChatGoogleGenerativeAI(
    model=settings.REFEREE_MODEL,
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.0
)
_referee_agent = _referee_llm.with_structured_output(FallacyReportSchema)

_REFEREE_SYSTEM_PROMPT = """You are an elite, impartial debate adjudicator.
Analyze the user's argument for logical fallacies ONLY. Do not comment on
grammar, tone, or delivery.

Check specifically for these 10 fallacies:
- Ad Hominem: attacking the person or group instead of their argument.
- Straw Man: misrepresenting the opponent's position to make it easier to attack.
- False Dilemma: presenting only two options when more exist.
- Slippery Slope: claiming a small first step inevitably leads to an extreme chain of disastrous outcomes without justification.
- Appeal to Authority: treating a claim as true purely because an authority figure asserted it without supporting evidence.
- Appeal to Popularity: arguing that a claim is true or right simply because many people believe it, "everyone knows" it, or it is widely accepted (Bandwagon / ad populum).
- Circular Reasoning: using the conclusion itself as a premise ("X is true because X is true").
- Hasty Generalization: drawing a broad, universal conclusion from a small, isolated, or unrepresentative sample.
- False Cause: asserting that because one event followed another or is correlated, the first caused the second without causal proof (Post Hoc / False Causality).
- Red Herring: introducing an irrelevant point or topic to distract from the actual argument.

If the argument is logically sound, supported by valid reasoning, or merely presents a standard controversial position, set fallacy_detected to False, fallacy_type to "None", and offending_text/explanation to null.
Be conservative and rigorous — only flag a fallacy when it is clearly present in the user's actual text. Avoid false positives.

{difficulty_note}"""

DIFFICULTY_STRICTNESS = {
    "Beginner": "Only flag fallacies that are blatant and unambiguous — give the learner the benefit of the doubt on borderline cases.",
    "Intermediate": "Flag fallacies that a competent debate judge would reasonably catch, including moderately subtle ones.",
    "Hard": "Be strict — flag subtle, borderline, and easily-missed fallacies too, the way an expert competitive judge would."
}

_referee_prompt = ChatPromptTemplate.from_messages([
    ("system", _REFEREE_SYSTEM_PROMPT),
    ("user", "{text}")
])
_referee_chain = _referee_prompt | _referee_agent


def _deterministic_fallacy_check(text: str) -> FallacyReportSchema | None:
    """Catch unmistakable surface patterns when the model returns no finding."""
    checks = [
        (
            r"\b(everyone|everybody|most people|no one disagrees|widely believed|everyone knows)\b.*\b(therefore|so|must be| proves?)\b",
            "Appeal to Popularity",
            "The claim is treated as true because it is supposedly widely believed, rather than because evidence supports it.",
            "Support the claim with relevant evidence instead of the number of people who believe it."
        ),
        (
            r"\b(stupid|idiot| moron|ignorant|dumb|loser)\b",
            "Ad Hominem",
            "The argument attacks a person's character instead of addressing the truth or evidence of their position.",
            "Respond to the opposing claim and evidence, not the person presenting it."
        ),
        (
            r"\b(either|only two options|no other choice|you are either)\b.*\b(or|otherwise)\b",
            "False Dilemma",
            "The argument presents limited alternatives as if they were the only possibilities while ignoring other reasonable options.",
            "Identify additional options or explain why the alternatives are genuinely exhaustive."
        ),
        (
            r"\b(if we allow|once we allow|if we permit)\b.*\b(inevitably|eventually|will lead to|society will|everything will)\b",
            "Slippery Slope",
            "The argument claims that one step will inevitably lead to an extreme outcome without establishing the intermediate causal links.",
            "Explain and support each causal step instead of assuming the extreme result is inevitable."
        ),
        (
            r"\b(because it is true|true because| proves? itself|it is correct because it is correct)\b",
            "Circular Reasoning",
            "The conclusion is used as its own supporting premise instead of independent evidence being provided.",
            "Replace the repeated conclusion with an independent reason or verifiable evidence."
        ),
    ]
    lowered = text.lower()
    for pattern, fallacy_type, explanation, correction in checks:
        match = re.search(pattern, lowered, re.IGNORECASE)
        if match:
            return FallacyReportSchema(
                fallacy_detected=True,
                fallacy_type=fallacy_type,
                offending_text=text[max(0, match.start()):min(len(text), match.end())],
                explanation=explanation,
                severity="Moderate",
                confidence=98,
                correction_suggestion=correction,
            )
    return None


async def analyze_argument(text: str, difficulty: str = None, session_id: str = None) -> FallacyReportSchema:
    note = DIFFICULTY_STRICTNESS.get(difficulty, DIFFICULTY_STRICTNESS["Intermediate"])
    try:
        report = await timed_invoke(
            _referee_chain, {"text": text, "difficulty_note": note},
            agent_name="Auditor (Fallacy Detection)", model=settings.REFEREE_MODEL, session_id=session_id
        )
    except Exception:
        return _deterministic_fallacy_check(text) or FallacyReportSchema(
            fallacy_detected=False,
            fallacy_type="None",
            offending_text=None,
            explanation=None,
            correction_suggestion=None,
        )
    if not report.fallacy_detected:
        return _deterministic_fallacy_check(text) or report
    return report
