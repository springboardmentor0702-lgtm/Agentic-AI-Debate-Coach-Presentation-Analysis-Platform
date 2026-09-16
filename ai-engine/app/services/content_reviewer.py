"""
Agent 5 — Content Reviewer. Evaluates the actual slide/document content
(structure, clarity, claim support, flow) — separate from Agent 3's
speech-delivery evaluation. Uses the same real structured-output pattern
as every other agent in this project.
"""
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings
from app.schemas.content_review import ContentReviewSchema

_reviewer_llm = ChatGoogleGenerativeAI(model=settings.REFEREE_MODEL, google_api_key=settings.GOOGLE_API_KEY, temperature=0.0)
_reviewer_agent = _reviewer_llm.with_structured_output(ContentReviewSchema)

_SYSTEM_PROMPT = """You are a presentation content reviewer. You are given the
real extracted text from every slide/page of a presentation document. Judge
ONLY the content itself — structure, clarity, whether claims are actually
supported within the material, and logical flow between slides. Do NOT
evaluate delivery, tone, or speaking style — a separate system handles that.

Give slide_feedback only for slides/pages that have substantive text — skip
title-only or blank slides rather than inventing feedback for them.

If the extracted text is very sparse (e.g. a slide-heavy deck with mostly
images/diagrams and little text), say so honestly in overall_content_feedback
rather than fabricating detailed feedback about content you can't actually see."""

_reviewer_prompt = ChatPromptTemplate.from_messages([
    ("system", _SYSTEM_PROMPT),
    ("user", "{slides_text}")
])
_reviewer_chain = _reviewer_prompt | _reviewer_agent


async def review_content(slides: list[dict]) -> ContentReviewSchema:
    slides_text = "\n\n".join(f"--- Slide/Page {s['slide_number']} ---\n{s['text'] or '(no extractable text)'}" for s in slides)
    return await _reviewer_chain.ainvoke({"slides_text": slides_text})
