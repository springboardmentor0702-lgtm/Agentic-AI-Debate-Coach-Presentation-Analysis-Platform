import time
import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.core.config import settings
from app.database import log_agent_call
from app.services.fallacy_agent import analyze_argument
from app.services.delivery_coach import analyze_delivery
from app.services.argument_analysis import analyze_argument_quality
from app.services.presentation_audio import compute_presentation_metrics
from app.services.context_summarizer import summarize_history
from app.services.evidence_grounding import retrieve_evidence
from app.schemas.debate import ChatMessage

FORMAT_RULES = {
    "One-on-One Debate": "Respond with direct, fast-paced adversarial counterarguments.",
    "Parliamentary Debate": "Address the user as 'The Honorable Member'. Use formal political terminology and focus heavily on policy implications.",
    "Oxford Debate": "Follow formal Oxford rules. You must strictly oppose the motion and prioritize data and statistics over rhetoric.",
    "Policy Debate": "Focus on concrete implementation, cost, feasibility, and real-world consequences of the proposed policy.",
    "Public Forum Debate": "Keep rebuttals concise and accessible to a general audience.",
    "AI Debate Simulation": "Be an adaptive, free-form opponent — vary your tone and strategy turn to turn like a real, unpredictable human debater would.",
}
DEFAULT_FORMAT_RULE = "Act as an elite, articulate debate opponent."

OPPONENT_PERSONAS = {
    "LogicBot": "You are LogicBot: cold, precise, and purely analytical. You never appeal to emotion — only formal logic, statistics, and structured syllogisms. You point out any logical gap immediately and mechanically.",
    "PersuadeBot": "You are PersuadeBot: warm, rhetorical, and emotionally compelling. You use vivid stories, analogies, and appeals to shared values, while still being intellectually honest.",
    "Aggressive Opponent": "You are an Aggressive Opponent: relentless and confrontational. You attack every weak point immediately, interrupt-style, and push hard rhetorical pressure — suited to fast, high-stakes formats like Oxford debate.",
    "Data-Driven Opponent": "You are a Data-Driven Opponent: dense with facts, statistics, and precedent. You lead every point with concrete numbers or real-world examples and treat unsupported claims as immediately vulnerable — suited to Policy debate.",
    "Formal Opponent": "You are a Formal Opponent: measured, procedural, and precise with political/parliamentary terminology, respecting formal debate conventions — suited to Parliamentary debate.",
    "Accessible Opponent": "You are an Accessible Opponent: clear, concise, and audience-friendly. You avoid jargon and make your points land in plain language — suited to Public Forum debate.",
}

# Which personas make sense for which format — used by the frontend to
# only offer options that genuinely fit, instead of the same list everywhere.
FORMAT_PERSONA_OPTIONS = {
    "One-on-One Debate": ["LogicBot", "PersuadeBot"],
    "Parliamentary Debate": ["Formal Opponent", "LogicBot"],
    "Oxford Debate": ["Aggressive Opponent", "LogicBot"],
    "Policy Debate": ["Data-Driven Opponent", "LogicBot"],
    "Public Forum Debate": ["Accessible Opponent", "PersuadeBot"],
    "AI Debate Simulation": ["LogicBot", "PersuadeBot", "Aggressive Opponent", "Data-Driven Opponent", "Formal Opponent", "Accessible Opponent"],
}

DIFFICULTY_OPPONENT_NOTE = {
    "Beginner": "Keep your rebuttals gentle and simple — one clear point at a time, avoid piling on multiple counterarguments, and leave obvious openings the learner can respond to.",
    "Intermediate": "Debate at a standard competitive level — solid rebuttals, but not overwhelming.",
    "Hard": "Be aggressive and relentless — stack multiple counterarguments, exploit any weakness immediately, and use nuanced, harder-to-spot rebuttals."
}

MAX_RAW_HISTORY_MESSAGES = 6  # ≈ last 3 user/AI turn-pairs


def _extract_text(content) -> str:
    if isinstance(content, list):
        return "".join(b.get("text", "") for b in content if isinstance(b, dict)).strip()
    return content


class MultiAgentDebateEngine:
    def __init__(self):
        self._opponent_llm = ChatGoogleGenerativeAI(model=settings.OPPONENT_MODEL, google_api_key=settings.GOOGLE_API_KEY, temperature=0.7)

    async def _run_analysis_and_build_prompt(self, text, duration_sec, debate_format, history,
                                              opponent_persona, custom_scenario, difficulty, session_id):
        """Shared by both the non-streaming and streaming paths: runs the 3
        analysis agents (fallacy, delivery, argument — these return structured
        JSON, so there's nothing to meaningfully stream there) and builds the
        Opponent's system prompt, including context-window management."""
        presentation_metrics = compute_presentation_metrics(text, duration_sec)
        fallacy_report = await analyze_argument(text, difficulty=difficulty, session_id=session_id)
        delivery_report = await analyze_delivery(text, presentation_metrics.filler_word_count, session_id=session_id)
        argument_report = await analyze_argument_quality(text, session_id=session_id)

        system_rules = OPPONENT_PERSONAS.get(opponent_persona) or FORMAT_RULES.get(debate_format, DEFAULT_FORMAT_RULE)
        system_rules += "\n\n[DIFFICULTY]: " + DIFFICULTY_OPPONENT_NOTE.get(difficulty, DIFFICULTY_OPPONENT_NOTE["Intermediate"])

        if custom_scenario:
            system_rules += f"\n\n[CUSTOM SCENARIO]: {custom_scenario}"

        # ✅ Real anti-hallucination grounding: retrieve actual evidence
        # (live Wikipedia + any uploaded documents) and instruct the model
        # to only cite from what's genuinely returned here.
        evidence = await asyncio.to_thread(retrieve_evidence, text[:200])
        if evidence:
            evidence_block = "\n".join(f"- [{e['source']}] {e['title']}: {e['snippet']}" for e in evidence[:5])
            system_rules += (
                f"\n\n[REAL RETRIEVED EVIDENCE — use ONLY these facts if you cite a source. "
                f"Do not invent statistics or studies beyond what's listed here]:\n{evidence_block}"
            )
        else:
            system_rules += (
                "\n\n[NO VERIFIED EVIDENCE RETRIEVED]: If you would normally cite a statistic or "
                "study, instead say you don't have a verified source for that specific claim and "
                "argue from logic/principle instead — never invent a number or study."
            )

        if fallacy_report.fallacy_detected:
            system_rules += (
                f"\n\n[ADJUDICATOR NOTE]: The user's argument contains a "
                f"{fallacy_report.fallacy_type} fallacy. Open your rebuttal by "
                f"pointing this out constructively, then continue the debate."
            )

        if len(history) > MAX_RAW_HISTORY_MESSAGES:
            older = history[:-MAX_RAW_HISTORY_MESSAGES]
            recent = history[-MAX_RAW_HISTORY_MESSAGES:]
            summary = await summarize_history(older)
            if summary:
                system_rules += f"\n\n[DEBATE SO FAR — SUMMARY]:\n{summary}"
        else:
            recent = history
            summary = None

        lc_history = []
        for msg in recent:
            lc_history.append(HumanMessage(content=msg.content) if msg.role == "user" else AIMessage(content=msg.content))

        messages = [SystemMessage(content=system_rules)] + lc_history + [HumanMessage(content=text)]

        return messages, presentation_metrics, fallacy_report, delivery_report, argument_report, summary

    async def process_turn(self, text: str, duration_sec, debate_format: str, history: list[ChatMessage],
                            opponent_persona: str = None, custom_scenario: str = None, difficulty: str = None,
                            session_id: str = None) -> dict:
        """Non-streaming path — waits for the full Opponent reply, returns everything at once."""
        messages, presentation_metrics, fallacy_report, delivery_report, argument_report, summary = \
            await self._run_analysis_and_build_prompt(text, duration_sec, debate_format, history,
                                                        opponent_persona, custom_scenario, difficulty, session_id)

        start = time.perf_counter()
        ai_reply = await self._opponent_llm.ainvoke(messages)
        latency_ms = int((time.perf_counter() - start) * 1000)

        usage = getattr(ai_reply, "usage_metadata", None) or {}
        log_agent_call(
            session_id, "Opponent", settings.OPPONENT_MODEL, latency_ms,
            usage.get("input_tokens"), usage.get("output_tokens"), usage.get("total_tokens")
        )

        ai_text = _extract_text(ai_reply.content)

        return {
            "user_transcript": text,
            "ai_rebuttal": ai_text,
            "presentation_metrics": presentation_metrics,
            "fallacy_metrics": fallacy_report,
            "delivery_metrics": delivery_report,
            "argument_analysis": argument_report,
            "context_summary": summary
        }

    async def process_turn_stream(self, text: str, duration_sec, debate_format: str, history: list[ChatMessage],
                                   opponent_persona: str = None, custom_scenario: str = None, difficulty: str = None,
                                   session_id: str = None):
        """
        Streaming path — an async generator. The 3 analysis agents still run
        to completion first (real JSON scoring isn't something you can
        meaningfully stream token-by-token), then the Opponent's reply is
        yielded chunk by chunk as it's actually generated by the real API —
        not a simulated typing effect, this is genuine incremental output.

        Yields ("chunk", text_delta) for each piece of the reply, then
        exactly one ("done", full_result_dict) at the end.
        """
        messages, presentation_metrics, fallacy_report, delivery_report, argument_report, summary = \
            await self._run_analysis_and_build_prompt(text, duration_sec, debate_format, history,
                                                        opponent_persona, custom_scenario, difficulty, session_id)

        start = time.perf_counter()
        full_text = ""
        last_chunk = None

        async for chunk in self._opponent_llm.astream(messages):
            delta = _extract_text(chunk.content)
            if delta:
                full_text += delta
                yield ("chunk", delta)
            last_chunk = chunk

        latency_ms = int((time.perf_counter() - start) * 1000)

        # Real token usage IF the provider attaches it to the final chunk —
        # streaming responses often don't expose this the same way a single
        # ainvoke() call does, so this stays NULL rather than guessed when absent.
        usage = getattr(last_chunk, "usage_metadata", None) or {}
        log_agent_call(
            session_id, "Opponent (streamed)", settings.OPPONENT_MODEL, latency_ms,
            usage.get("input_tokens"), usage.get("output_tokens"), usage.get("total_tokens")
        )

        result = {
            "user_transcript": text,
            "ai_rebuttal": full_text,
            "presentation_metrics": presentation_metrics,
            "fallacy_metrics": fallacy_report,
            "delivery_metrics": delivery_report,
            "argument_analysis": argument_report,
            "context_summary": summary
        }
        yield ("done", result)
