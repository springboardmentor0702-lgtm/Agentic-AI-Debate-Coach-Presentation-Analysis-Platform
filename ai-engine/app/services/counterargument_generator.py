from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings
from app.schemas.counterargument import CounterargumentSchema

_counter_llm = ChatGoogleGenerativeAI(
    model=settings.OPPONENT_MODEL,
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.6
)
_counter_agent = _counter_llm.with_structured_output(CounterargumentSchema)

_SYSTEM_PROMPT = """You generate strong counterarguments/rebuttals for a debate
topic or argument the user provides. Cover these counterargument types where
genuinely applicable — do not force a type that doesn't fit:
- Logical Rebuttal: points out a reasoning gap.
- Evidence-Based Rebuttal: cites the kind of data/evidence that would undercut the claim.
- Ethical Counterargument: raises a moral/values-based objection.
- Practical Counterargument: raises a real-world feasibility/implementation concern.
- Policy Counterargument: raises a policy-level consequence or alternative.

Produce 3-5 counterarguments total, each concise (1-2 sentences).

Also produce:
- challenge_questions: 2-3 genuinely hard, specific probing questions a
  skilled opponent would ask to pressure-test this exact position — not
  generic questions, ones that target the specific weak points of THIS topic.
- debate_strategy: 2-3 concrete strategic suggestions for arguing against
  this position — e.g. which angle to focus attack on, what's worth
  conceding vs. contesting, how to sequence the rebuttals."""

_counter_prompt = ChatPromptTemplate.from_messages([
    ("system", _SYSTEM_PROMPT),
    ("user", "{text}")
])
_counter_chain = _counter_prompt | _counter_agent


async def generate_counterarguments(text: str) -> CounterargumentSchema:
    return await _counter_chain.ainvoke({"text": text})
