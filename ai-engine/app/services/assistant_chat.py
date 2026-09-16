from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.core.config import settings

_chat_llm = ChatGoogleGenerativeAI(
    model=settings.ASSISTANT_MODEL,
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.5
)

# Page-aware briefing — this is what makes the ONE assistant "specialize"
# per page, matching the spec's page/agent table without literally routing
# to separate agent processes for a plain chat message.
PAGE_CONTEXTS = {
    "/dashboard": (
        "The learner is on their Dashboard. Help with personalized learning "
        "guidance, explaining their progress, streaks, badges, and "
        "recommending what to practice next."
    ),
    "/topics": (
        "The learner is browsing Debate Topics. Help them pick a topic and "
        "difficulty suited to their skill level, and suggest how to approach it."
    ),
    "/debate-room": (
        "The learner is in the Debate Room, live. Act like a real-time debate "
        "coach: help with argument structure, suggest counterarguments, and "
        "explain logical fallacies conversationally. You do not have a tool to "
        "auto-analyze their text in this chat — for the automated score, point "
        "them to the Report Card that appears after they submit."
    ),
    "/skill-tracking": (
        "The learner is viewing their Skill Tracking chart. Help them "
        "interpret their score trends over time and what to focus on."
    ),
    "/reports": (
        "This user (Coach/Educator/Admin) is viewing Reports/analytics. Help "
        "them interpret learner performance data and suggest coaching actions."
    ),
    "/profile": (
        "The learner is on their Profile page. Help with account questions "
        "and choosing a coach."
    ),
}
DEFAULT_CONTEXT = "Help the user with anything related to debate skills, argumentation, or using this platform."


def _extract_text(content) -> str:
    if isinstance(content, list):
        return "".join(b.get("text", "") for b in content if isinstance(b, dict)).strip()
    return content


SYSTEM_PREFIX = """You are the AI Debate Coach assistant — a friendly, encouraging
guide embedded across a debate-training platform. Keep replies conversational
and concise (a few sentences, not an essay) unless the user asks for detail.
You give guidance and explanations only in this chat — you do not run formal
scoring here (that happens automatically elsewhere in the app when the user
submits an argument).

Current page context: {page_context}"""


async def get_assistant_reply(page: str, message: str, history: list[dict]) -> str:
    page_context = PAGE_CONTEXTS.get(page, DEFAULT_CONTEXT)

    lc_history = []
    for msg in history:
        lc_history.append(
            HumanMessage(content=msg["content"]) if msg["role"] == "user"
            else AIMessage(content=msg["content"])
        )

    messages = [
        SystemMessage(content=SYSTEM_PREFIX.format(page_context=page_context))
    ] + lc_history + [HumanMessage(content=message)]

    reply = await _chat_llm.ainvoke(messages)
    return _extract_text(reply.content)
