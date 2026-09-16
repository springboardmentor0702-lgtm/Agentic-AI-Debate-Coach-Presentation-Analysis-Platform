from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings
from app.schemas.argument_analysis import ArgumentAnalysisSchema
from app.services.timing import timed_invoke

_analyst_llm = ChatGoogleGenerativeAI(model=settings.REFEREE_MODEL, google_api_key=settings.GOOGLE_API_KEY, temperature=0.0)
_analyst_agent = _analyst_llm.with_structured_output(ArgumentAnalysisSchema)

_ANALYST_SYSTEM_PROMPT = """You are an expert argument analyst (Module 4: Argument
Analysis Engine). Score 5 criteria: clarity_score, relevance_score,
evidence_strength_score, logical_consistency_score, persuasiveness_score
(each 0-100). Also extract claims_found (the distinct claims made) and
evidence_found (the distinct pieces of evidence/support cited) as short
strings — these should be genuinely extracted from the text, not invented.

For weaknesses, this is critical: for EACH weakness, don't just name the
problem — write a "stronger_version": an actual rewritten example sentence
or two, drawn from the user's real argument, that fixes that specific
issue. Never give generic advice like "add more evidence" — instead show
exactly what a stronger sentence would look like, using the same topic and
stance the user argued. Provide 2-4 such weakness+fix pairs.

Provide 2-4 strengths too. Do not check for fallacies — a separate system
handles that."""

_analyst_prompt = ChatPromptTemplate.from_messages([("system", _ANALYST_SYSTEM_PROMPT), ("user", "{text}")])
_analyst_chain = _analyst_prompt | _analyst_agent

async def analyze_argument_quality(text: str, session_id: str = None) -> ArgumentAnalysisSchema:
    return await timed_invoke(
        _analyst_chain, {"text": text},
        agent_name="Analyst (Argument Quality)", model=settings.REFEREE_MODEL, session_id=session_id
    )
