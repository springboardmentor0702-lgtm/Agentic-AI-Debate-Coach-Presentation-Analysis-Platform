from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings

# Uses the cheaper/faster model — summarization doesn't need the Opponent's
# creative temperature, just accuracy.
_summarizer_llm = ChatGoogleGenerativeAI(
    model=settings.REFEREE_MODEL,
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.0
)

_SUMMARY_PROMPT = ChatPromptTemplate.from_messages([
    ("system", (
        "Summarize this earlier portion of a debate into a short bulleted list "
        "of: (1) key claims made by the user, (2) key points made by the AI "
        "opponent, (3) anything explicitly agreed on, (4) anything left "
        "unresolved. Be concise — this is a running memory aid, not a transcript."
    )),
    ("user", "{transcript}")
])
_summary_chain = _SUMMARY_PROMPT | _summarizer_llm


async def summarize_history(older_messages: list) -> str:
    """
    older_messages: list of ChatMessage-like objects with .role and .content.
    Returns a short bullet-point summary string.
    """
    if not older_messages:
        return ""

    transcript = "\n".join(
        f"{'User' if m.role == 'user' else 'AI Opponent'}: {m.content}"
        for m in older_messages
    )

    result = await _summary_chain.ainvoke({"transcript": transcript})
    content = result.content
    if isinstance(content, list):
        content = "".join(b.get("text", "") for b in content if isinstance(b, dict))
    return content.strip()
