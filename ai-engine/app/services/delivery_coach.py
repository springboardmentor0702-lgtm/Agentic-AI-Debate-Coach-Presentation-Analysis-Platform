from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings
from app.schemas.delivery import DeliveryAssessmentSchema
from app.services.timing import timed_invoke

_coach_llm = ChatGoogleGenerativeAI(model=settings.REFEREE_MODEL, google_api_key=settings.GOOGLE_API_KEY, temperature=0.2)
_coach_agent = _coach_llm.with_structured_output(DeliveryAssessmentSchema)

_COACH_SYSTEM_PROMPT = """You are a supportive speech and writing coach. Judge
HOW something was said (not the logic): grammar_issues (real errors only),
confidence_score (0-100, hedging lowers it, assertive phrasing raises it,
factor in the given filler count), clarity_score (0-100, sentence structure
and wording ease), and engagement_score (0-100, how dynamic and vivid the
delivery is — varied rhythm, concrete imagery, rhetorical devices vs flat
monotone phrasing). Be constructive and encouraging."""

_coach_prompt = ChatPromptTemplate.from_messages([
    ("system", _COACH_SYSTEM_PROMPT),
    ("user", "Filler word count: {filler_count}\n\nTranscript:\n{text}")
])
_coach_chain = _coach_prompt | _coach_agent


async def analyze_delivery(text: str, filler_count: int = 0, session_id: str = None) -> DeliveryAssessmentSchema:
    return await timed_invoke(
        _coach_chain, {"text": text, "filler_count": filler_count},
        agent_name="Delivery Coach", model=settings.REFEREE_MODEL, session_id=session_id
    )
