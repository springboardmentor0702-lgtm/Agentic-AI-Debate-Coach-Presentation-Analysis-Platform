import json
import tempfile
import os
import uuid
import asyncio
from datetime import datetime, timezone

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel

from app.core.config import settings
from app.database import db_mongo, get_postgres_connection, init_postgres
from app.agents.chatbot_engine import MultiAgentDebateEngine
from app.services.transcription import transcribe_audio
from app.services.assistant_chat import get_assistant_reply
from app.services.argument_analysis import analyze_argument_quality
from app.services.fallacy_agent import analyze_argument
from app.services.counterargument_generator import generate_counterarguments
from app.services.input_validation import validate_input
from app.schemas.argument_analysis import ArgumentAnalysisSchema
from app.schemas.fallacy import FallacyReportSchema
from app.schemas.counterargument import CounterargumentSchema
from app.schemas.debate import DebateTurnResponseSchema, ChatMessage
from app.services import debate_state_machine
from app.services.evidence_grounding import add_document, retrieve_evidence
from app.schemas.presentation import PresentationMetricsSchema
from app.schemas.delivery import DeliveryAssessmentSchema

# ✅ NEW — Phase A: Presentation file-upload + content review
from app.services.document_parser import parse_document
from app.services.content_reviewer import review_content
from app.schemas.presentation_full import PresentationFullAnalysisResponse

app = FastAPI(title="AI Debate Coach — Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = MultiAgentDebateEngine()


@app.on_event("startup")
def on_startup():
    init_postgres()


class PresentationAnalysisResponse(BaseModel):
    transcript: str
    clarity_score: int
    confidence_score: int
    engagement_score: int
    words_per_minute: int
    pace_status: str
    filler_word_count: int


@app.post("/api/v1/presentation/analyze", response_model=PresentationAnalysisResponse)
async def analyze_presentation(audio: UploadFile = File(...), duration_seconds: float = Form(...)):
    suffix = os.path.splitext(audio.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name
    try:
        transcript = transcribe_audio(tmp_path)
    finally:
        os.remove(tmp_path)

    from app.services.presentation_audio import compute_presentation_metrics
    from app.services.delivery_coach import analyze_delivery

    presentation_metrics = compute_presentation_metrics(transcript, duration_seconds)
    delivery = await analyze_delivery(transcript, presentation_metrics.filler_word_count)

    return PresentationAnalysisResponse(
        transcript=transcript,
        clarity_score=delivery.clarity_score,
        confidence_score=delivery.confidence_score,
        engagement_score=delivery.engagement_score,
        words_per_minute=presentation_metrics.words_per_minute or 0,
        pace_status=presentation_metrics.pace_status,
        filler_word_count=presentation_metrics.filler_word_count
    )


# ✅ NEW — Phase A: real combined analysis of an uploaded PPTX/PDF PLUS the
# actual recorded speech presenting it. Extracts real slide/page text (no
# invented content), runs it through the real Content Reviewer agent, and
# combines that with the existing real delivery analysis.
@app.post("/api/v1/presentation/analyze-full", response_model=PresentationFullAnalysisResponse)
async def analyze_presentation_full(
    document: UploadFile = File(...),
    audio: UploadFile = File(...),
    duration_seconds: float = Form(...)
):
    doc_suffix = os.path.splitext(document.filename or "file")[1] or ".pptx"
    with tempfile.NamedTemporaryFile(delete=False, suffix=doc_suffix) as doc_tmp:
        doc_tmp.write(await document.read())
        doc_path = doc_tmp.name

    audio_suffix = os.path.splitext(audio.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=audio_suffix) as audio_tmp:
        audio_tmp.write(await audio.read())
        audio_path = audio_tmp.name

    try:
        slides = parse_document(doc_path, document.filename)
        transcript = transcribe_audio(audio_path)
    finally:
        os.remove(doc_path)
        os.remove(audio_path)

    redirect = validate_input(transcript)
    if redirect:
        raise HTTPException(status_code=422, detail=redirect)

    from app.services.presentation_audio import compute_presentation_metrics
    from app.services.delivery_coach import analyze_delivery

    presentation_metrics = compute_presentation_metrics(transcript, duration_seconds)
    delivery_report = await analyze_delivery(transcript, presentation_metrics.filler_word_count)
    content_review = await review_content(slides)

    return PresentationFullAnalysisResponse(
        transcript=transcript,
        filename=document.filename,
        slide_count=len(slides),
        presentation_metrics=presentation_metrics,
        delivery_metrics=delivery_report,
        content_review=content_review
    )


# =========================================================================
# MULTI-TURN DEBATE STATE MACHINE (Milestone 3, Phase 5, item 12)
# Config-driven phases via app/config/debate_formats.py, real LangGraph
# state machine with interrupt/resume for human-in-the-loop turns.
# =========================================================================
class StartSessionRequest(BaseModel):
    session_id: str
    debate_format: str
    topic: str
    stance: str
    difficulty: Optional[str] = None
    opponent_persona: Optional[str] = None
    custom_scenario: Optional[str] = None


class SubmitTurnRequest(BaseModel):
    debate_format: str
    content: str
    timed_out: bool = False


class ContinueCheckRequest(BaseModel):
    debate_format: str
    action: str  # "continue" or "end"


def _aggregate_final_report(transcript: list) -> dict:
    """Averages the real per-phase analysis (from each user speech) into one
    final report — nothing here is invented, phases with no analysis
    (AI speeches, or a phase the user left empty) are simply excluded."""
    user_analyses = [t["analysis"] for t in transcript if t.get("analysis")]

    def avg(path):
        vals = [path(a) for a in user_analyses]
        vals = [v for v in vals if v is not None]
        return round(sum(vals) / len(vals)) if vals else 0

    argument_analysis = ArgumentAnalysisSchema(
        clarity_score=avg(lambda a: a["argument"]["clarity_score"]),
        relevance_score=avg(lambda a: a["argument"]["relevance_score"]),
        evidence_strength_score=avg(lambda a: a["argument"]["evidence_strength_score"]),
        logical_consistency_score=avg(lambda a: a["argument"]["logical_consistency_score"]),
        persuasiveness_score=avg(lambda a: a["argument"]["persuasiveness_score"]),
        claims_found=[c for a in user_analyses for c in a["argument"].get("claims_found", [])][:8],
        evidence_found=[e for a in user_analyses for e in a["argument"].get("evidence_found", [])][:8],
        strengths=[s for a in user_analyses for s in a["argument"].get("strengths", [])][:6],
        weaknesses=[w for a in user_analyses for w in a["argument"].get("weaknesses", [])][:6],
    )

    delivery_metrics = DeliveryAssessmentSchema(
        grammar_issues=[g for a in user_analyses for g in a["delivery"].get("grammar_issues", [])][:6],
        confidence_score=avg(lambda a: a["delivery"]["confidence_score"]),
        clarity_score=avg(lambda a: a["delivery"]["clarity_score"]),
        engagement_score=avg(lambda a: a["delivery"]["engagement_score"]),
        overall_feedback=f"Aggregated across {len(user_analyses)} of your speeches in this debate."
    )

    fallacy_detected_any = any(a["fallacy"]["fallacy_detected"] for a in user_analyses)
    first_fallacy = next((a["fallacy"] for a in user_analyses if a["fallacy"]["fallacy_detected"]), None)
    fallacy_metrics = FallacyReportSchema(**first_fallacy) if first_fallacy else FallacyReportSchema(
        fallacy_detected=False, fallacy_type="None", offending_text="", explanation="", correction_suggestion=""
    )

    return {
        "argument_analysis": argument_analysis,
        "delivery_metrics": delivery_metrics,
        "fallacy_metrics": fallacy_metrics,
        "presentation_metrics": PresentationMetricsSchema(words_per_minute=None, pace_status="N/A (multi-phase)", filler_word_count=0),
    }


@app.post("/api/v1/debate/session/start")
async def start_debate_session(body: StartSessionRequest):
    result = await debate_state_machine.start_session(
        session_id=body.session_id, debate_format=body.debate_format, topic=body.topic, stance=body.stance,
        difficulty=body.difficulty, opponent_persona=body.opponent_persona, custom_scenario=body.custom_scenario
    )
    return result


async def _finalize_if_completed(session_id: str, debate_format: str, result: dict) -> dict:
    """Shared by /submit and /continue — whichever one triggers the real
    'end' action gets the same aggregation + persistence."""
    if result["status"] != "completed":
        return result

    aggregated = _aggregate_final_report(result["transcript"])
    user_speeches = "\n\n".join(
        f"[{t['speech_type']}]: {t['content']}" for t in result["transcript"] if t["speaker"] == "user"
    )
    ai_speeches = "\n\n".join(
        f"[{t['speech_type']}]: {t['content']}" for t in result["transcript"] if t["speaker"] == "ai"
    )
    final_result = {"user_transcript": user_speeches, "ai_rebuttal": ai_speeches, **aggregated}
    await persist_turn_result(session_id, debate_format, final_result, mode="multiturn")

    result["final_report"] = DebateTurnResponseSchema(
        session_id=session_id,
        user_transcript=user_speeches,
        ai_rebuttal=ai_speeches,
        presentation_metrics=aggregated["presentation_metrics"],
        fallacy_metrics=aggregated["fallacy_metrics"],
        delivery_metrics=aggregated["delivery_metrics"],
        argument_analysis=aggregated["argument_analysis"],
    )
    return result


@app.post("/api/v1/debate/session/{session_id}/submit")
async def submit_debate_turn(session_id: str, body: SubmitTurnRequest):
    if body.content.strip():
        redirect = validate_input(body.content)
        if redirect and not body.timed_out:
            raise HTTPException(status_code=422, detail=redirect)

    result = await debate_state_machine.submit_turn(
        session_id=session_id, debate_format=body.debate_format, content=body.content, timed_out=body.timed_out
    )
    return await _finalize_if_completed(session_id, body.debate_format, result)


@app.post("/api/v1/debate/session/{session_id}/continue")
async def respond_continue_check(session_id: str, body: ContinueCheckRequest):
    """
    Called when the frontend receives a `continue_check` interrupt — the
    real answer to 'ask user whether to continue or end' rather than
    auto-closing. action='continue' adds one real extra round and pauses
    again for the user's speech; action='end' finalizes the debate now.
    """
    result = await debate_state_machine.respond_continue(
        session_id=session_id, debate_format=body.debate_format, action=body.action
    )
    return await _finalize_if_completed(session_id, body.debate_format, result)


# =========================================================================
# ✅ NEW — Phase D: real streaming versions of the 3 phased-debate
# endpoints above. Same SSE contract as the existing single-turn
# streaming (event: chunk / event: done) so the frontend can reuse the
# same consumeStream() logic.
# =========================================================================
async def _phased_event_stream(async_gen, session_id: str, debate_format: str):
    async for kind, payload in async_gen:
        if kind == "chunk":
            yield f"event: chunk\ndata: {json.dumps({'text': payload})}\n\n"
        else:  # "done" — the phase paused again, or the whole debate completed
            finalized = await _finalize_if_completed(session_id, debate_format, payload)
            # final_report (when present) is a Pydantic model — convert it
            # to a plain dict before JSON-encoding, same as everything else.
            if finalized.get("final_report") is not None:
                finalized = {**finalized, "final_report": finalized["final_report"].model_dump()}
            yield f"event: done\ndata: {json.dumps(finalized)}\n\n"


@app.post("/api/v1/debate/session/start-stream")
async def start_debate_session_stream(body: StartSessionRequest):
    gen = debate_state_machine.start_session_stream(
        session_id=body.session_id, debate_format=body.debate_format, topic=body.topic, stance=body.stance,
        difficulty=body.difficulty, opponent_persona=body.opponent_persona, custom_scenario=body.custom_scenario
    )
    return StreamingResponse(_phased_event_stream(gen, body.session_id, body.debate_format), media_type="text/event-stream")


@app.post("/api/v1/debate/session/{session_id}/submit-stream")
async def submit_debate_turn_stream(session_id: str, body: SubmitTurnRequest):
    if body.content.strip():
        redirect = validate_input(body.content)
        if redirect and not body.timed_out:
            raise HTTPException(status_code=422, detail=redirect)

    gen = debate_state_machine.submit_turn_stream(
        session_id=session_id, debate_format=body.debate_format, content=body.content, timed_out=body.timed_out
    )
    return StreamingResponse(_phased_event_stream(gen, session_id, body.debate_format), media_type="text/event-stream")


@app.post("/api/v1/debate/session/{session_id}/continue-stream")
async def respond_continue_check_stream(session_id: str, body: ContinueCheckRequest):
    gen = debate_state_machine.respond_continue_stream(
        session_id=session_id, debate_format=body.debate_format, action=body.action
    )
    return StreamingResponse(_phased_event_stream(gen, session_id, body.debate_format), media_type="text/event-stream")


@app.get("/api/v1/debate/persona-options")
async def get_persona_options():
    """Real per-format persona mapping — the frontend uses this instead of
    hardcoding its own copy, so there's one source of truth."""
    from app.agents.chatbot_engine import FORMAT_PERSONA_OPTIONS, OPPONENT_PERSONAS
    return {
        "personas": {name: desc for name, desc in OPPONENT_PERSONAS.items()},
        "formatOptions": FORMAT_PERSONA_OPTIONS
    }


class AddDocumentRequest(BaseModel):
    title: str
    content: str


@app.post("/api/v1/knowledge/documents")
async def add_knowledge_document(body: AddDocumentRequest):
    """
    Adds a REAL document to the local knowledge base — embedded for real
    with Gemini's embedding model, retrievable in future debates' evidence
    grounding. No auth check here, consistent with every other ai-engine
    endpoint (auth is a Node-layer concern in this project) — worth
    tightening before any public deployment.
    """
    if not body.title.strip() or not body.content.strip():
        raise HTTPException(status_code=400, detail="title and content are required")

    doc_id = str(uuid.uuid4())
    add_document(doc_id, body.title, body.content)

    await db_mongo.knowledge_documents.insert_one({
        "doc_id": doc_id, "title": body.title,
        "content_preview": body.content[:200], "created_at": datetime.utcnow()
    })
    return {"success": True, "doc_id": doc_id}


@app.get("/api/v1/knowledge/documents")
async def list_knowledge_documents():
    """Real list of what's actually in the knowledge base."""
    docs = [doc async for doc in db_mongo.knowledge_documents.find().sort("created_at", -1)]
    for d in docs:
        d["_id"] = str(d["_id"])
    return docs


@app.get("/api/v1/knowledge/search")
async def search_knowledge(query: str):
    """Test endpoint — see exactly what the Opponent would retrieve for a given topic."""
    results = await asyncio.to_thread(retrieve_evidence, query)
    return results


@app.get("/health")
def health_check():
    return {"status": "ok"}


# =========================================================================
# STANDALONE TOOLS
# =========================================================================
class ToolTextRequest(BaseModel):
    text: str


@app.post("/api/v1/tools/argument-analyzer", response_model=ArgumentAnalysisSchema)
async def tool_argument_analyzer(body: ToolTextRequest):
    redirect = validate_input(body.text)
    if redirect:
        raise HTTPException(status_code=422, detail=redirect)
    return await analyze_argument_quality(body.text)


@app.post("/api/v1/tools/fallacy-detector", response_model=FallacyReportSchema)
async def tool_fallacy_detector(body: ToolTextRequest):
    redirect = validate_input(body.text)
    if redirect:
        raise HTTPException(status_code=422, detail=redirect)
    return await analyze_argument(body.text)


@app.post("/api/v1/tools/counterargument-generator", response_model=CounterargumentSchema)
async def tool_counterargument_generator(body: ToolTextRequest):
    redirect = validate_input(body.text)
    if redirect:
        raise HTTPException(status_code=422, detail=redirect)
    return await generate_counterarguments(body.text)


# =========================================================================
# TRANSCRIBE
# =========================================================================
class TranscribeResponse(BaseModel):
    transcript: str


@app.post("/api/v1/debate/transcribe", response_model=TranscribeResponse)
async def transcribe_turn(audio: UploadFile = File(...)):
    suffix = os.path.splitext(audio.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name
    try:
        transcript = transcribe_audio(tmp_path)
    finally:
        os.remove(tmp_path)
    return TranscribeResponse(transcript=transcript)


# =========================================================================
# ANALYZE A DEBATE TURN
# =========================================================================
async def persist_turn_result(session_id: str, debate_format: str, result: dict, mode: str = "voice"):
    """Shared by every turn endpoint (streaming or not) — one place that
    writes the Mongo transcript + Postgres performance row, so all 4
    endpoints (typed, voice, typed-stream, voice-stream) stay consistent."""
    await db_mongo.session_transcripts.insert_one({
        "session_id": session_id,
        "debate_format": debate_format,
        "user_transcript": result["user_transcript"],
        "ai_rebuttal": result["ai_rebuttal"],
        "fallacy_metrics": result["fallacy_metrics"].model_dump(),
        "presentation_metrics": result["presentation_metrics"].model_dump(),
        "delivery_metrics": result["delivery_metrics"].model_dump(),
        "argument_analysis": result["argument_analysis"].model_dump(),
        "mode": mode,
    })

    pg_conn = get_postgres_connection()
    cursor = pg_conn.cursor()
    cursor.execute(
        """
        INSERT INTO debate_performance
            (session_id, debate_format, words_per_minute, pace_status,
             filler_word_count, fallacy_detected, fallacy_type,
             confidence_score, clarity_score, grammar_issue_count,
             arg_clarity_score, relevance_score, evidence_strength_score,
             logical_consistency_score, persuasiveness_score)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """,
        (
            session_id, debate_format,
            result["presentation_metrics"].words_per_minute,
            result["presentation_metrics"].pace_status,
            result["presentation_metrics"].filler_word_count,
            result["fallacy_metrics"].fallacy_detected,
            result["fallacy_metrics"].fallacy_type,
            result["delivery_metrics"].confidence_score,
            result["delivery_metrics"].clarity_score,
            len(result["delivery_metrics"].grammar_issues),
            result["argument_analysis"].clarity_score,
            result["argument_analysis"].relevance_score,
            result["argument_analysis"].evidence_strength_score,
            result["argument_analysis"].logical_consistency_score,
            result["argument_analysis"].persuasiveness_score,
        )
    )
    pg_conn.commit()
    cursor.close()
    pg_conn.close()


class TypedTurnRequest(BaseModel):
    session_id: str
    debate_format: str
    argument: str
    history: list[ChatMessage] = []
    opponent_persona: Optional[str] = None
    custom_scenario: Optional[str] = None
    difficulty: Optional[str] = None


@app.post("/api/v1/debate/turn-text", response_model=DebateTurnResponseSchema)
async def process_typed_turn(body: TypedTurnRequest):
    redirect = validate_input(body.argument)
    if redirect:
        raise HTTPException(status_code=422, detail=redirect)

    result = await engine.process_turn(
        text=body.argument, duration_sec=None, debate_format=body.debate_format, history=body.history,
        opponent_persona=body.opponent_persona, custom_scenario=body.custom_scenario, difficulty=body.difficulty,
        session_id=body.session_id
    )

    await persist_turn_result(body.session_id, body.debate_format, result, mode="typed")

    return DebateTurnResponseSchema(
        session_id=body.session_id,
        user_transcript=result["user_transcript"],
        ai_rebuttal=result["ai_rebuttal"],
        presentation_metrics=result["presentation_metrics"],
        fallacy_metrics=result["fallacy_metrics"],
        delivery_metrics=result["delivery_metrics"],
        argument_analysis=result["argument_analysis"],
        context_summary=result.get("context_summary")
    )


@app.post("/api/v1/debate/turn-text-stream")
async def process_typed_turn_stream(body: TypedTurnRequest):
    """
    Real word-by-word streaming version of /turn-text. Response is
    Server-Sent Events: repeated `event: chunk` frames with each piece of
    the Opponent's reply as it's actually generated, followed by one
    `event: done` frame with the full structured analysis (fallacy,
    delivery, argument scores) once everything is ready.
    """
    redirect = validate_input(body.argument)
    if redirect:
        raise HTTPException(status_code=422, detail=redirect)

    async def event_stream():
        async for kind, payload in engine.process_turn_stream(
            text=body.argument, duration_sec=None, debate_format=body.debate_format, history=body.history,
            opponent_persona=body.opponent_persona, custom_scenario=body.custom_scenario, difficulty=body.difficulty,
            session_id=body.session_id
        ):
            if kind == "chunk":
                yield f"event: chunk\ndata: {json.dumps({'text': payload})}\n\n"
            else:  # "done"
                await persist_turn_result(body.session_id, body.debate_format, payload, mode="typed")
                final = DebateTurnResponseSchema(
                    session_id=body.session_id,
                    user_transcript=payload["user_transcript"],
                    ai_rebuttal=payload["ai_rebuttal"],
                    presentation_metrics=payload["presentation_metrics"],
                    fallacy_metrics=payload["fallacy_metrics"],
                    delivery_metrics=payload["delivery_metrics"],
                    argument_analysis=payload["argument_analysis"],
                    context_summary=payload.get("context_summary")
                )
                yield f"event: done\ndata: {final.model_dump_json()}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/api/v1/debate/turn", response_model=DebateTurnResponseSchema)
async def process_debate_turn(
    session_id: str = Form(...),
    debate_format: str = Form(...),
    duration_seconds: float = Form(...),
    transcript: str = Form(...),
    history: str = Form("[]"),
    opponent_persona: Optional[str] = Form(None),
    custom_scenario: Optional[str] = Form(None),
    difficulty: Optional[str] = Form(None)
):
    try:
        history_raw = json.loads(history)
        chat_history = [ChatMessage(**m) for m in history_raw]
    except (json.JSONDecodeError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="`history` must be valid JSON.")

    redirect = validate_input(transcript)
    if redirect:
        raise HTTPException(status_code=422, detail=redirect)

    result = await engine.process_turn(
        text=transcript, duration_sec=duration_seconds, debate_format=debate_format, history=chat_history,
        opponent_persona=opponent_persona, custom_scenario=custom_scenario, difficulty=difficulty,
        session_id=session_id
    )

    await persist_turn_result(session_id, debate_format, result, mode="voice")

    return DebateTurnResponseSchema(
        session_id=session_id,
        user_transcript=result["user_transcript"],
        ai_rebuttal=result["ai_rebuttal"],
        presentation_metrics=result["presentation_metrics"],
        fallacy_metrics=result["fallacy_metrics"],
        delivery_metrics=result["delivery_metrics"],
        argument_analysis=result["argument_analysis"],
        context_summary=result.get("context_summary")
    )


@app.post("/api/v1/debate/turn-stream")
async def process_debate_turn_stream(
    session_id: str = Form(...),
    debate_format: str = Form(...),
    duration_seconds: float = Form(...),
    transcript: str = Form(...),
    history: str = Form("[]"),
    opponent_persona: Optional[str] = Form(None),
    custom_scenario: Optional[str] = Form(None),
    difficulty: Optional[str] = Form(None)
):
    """Real streaming version of /turn — same SSE contract as /turn-text-stream."""
    try:
        history_raw = json.loads(history)
        chat_history = [ChatMessage(**m) for m in history_raw]
    except (json.JSONDecodeError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="`history` must be valid JSON.")

    redirect = validate_input(transcript)
    if redirect:
        raise HTTPException(status_code=422, detail=redirect)

    async def event_stream():
        async for kind, payload in engine.process_turn_stream(
            text=transcript, duration_sec=duration_seconds, debate_format=debate_format, history=chat_history,
            opponent_persona=opponent_persona, custom_scenario=custom_scenario, difficulty=difficulty,
            session_id=session_id
        ):
            if kind == "chunk":
                yield f"event: chunk\ndata: {json.dumps({'text': payload})}\n\n"
            else:  # "done"
                await persist_turn_result(session_id, debate_format, payload, mode="voice")
                final = DebateTurnResponseSchema(
                    session_id=session_id,
                    user_transcript=payload["user_transcript"],
                    ai_rebuttal=payload["ai_rebuttal"],
                    presentation_metrics=payload["presentation_metrics"],
                    fallacy_metrics=payload["fallacy_metrics"],
                    delivery_metrics=payload["delivery_metrics"],
                    argument_analysis=payload["argument_analysis"],
                    context_summary=payload.get("context_summary")
                )
                yield f"event: done\ndata: {final.model_dump_json()}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# =========================================================================
# ADMIN — real token/latency stats, aggregated from agent_performance_log
# =========================================================================
@app.get("/api/v1/admin/agent-performance")
async def admin_agent_performance():
    conn = get_postgres_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            agent_name,
            COUNT(*) AS call_count,
            ROUND(AVG(latency_ms)) AS avg_latency_ms,
            ROUND(AVG(total_tokens)) AS avg_total_tokens
        FROM agent_performance_log
        GROUP BY agent_name
        ORDER BY agent_name;
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [
        {
            "agent": r[0],
            "callCount": r[1],
            "avgLatencyMs": r[2],
            "avgTotalTokens": r[3]  # may be null — not every agent's token usage is exposed by the library
        }
        for r in rows
    ]


# =========================================================================
# GLOBAL FLOATING AI CHATBOT
# =========================================================================
class AssistantChatRequest(BaseModel):
    user_id: str
    conversation_id: str
    page: str
    message: str


class AssistantChatResponse(BaseModel):
    reply: str


@app.post("/api/v1/assistant/chat", response_model=AssistantChatResponse)
async def assistant_chat(body: AssistantChatRequest):
    cursor = db_mongo.assistant_messages.find({
        "user_id": body.user_id,
        "conversation_id": body.conversation_id
    }).sort("created_at", 1)
    history = [{"role": m["role"], "content": m["content"]} async for m in cursor]

    reply = await get_assistant_reply(page=body.page, message=body.message, history=history)

    now = datetime.now(timezone.utc)
    await db_mongo.assistant_messages.insert_many([
        {
            "user_id": body.user_id, "conversation_id": body.conversation_id,
            "page": body.page, "role": "user", "content": body.message, "created_at": now
        },
        {
            "user_id": body.user_id, "conversation_id": body.conversation_id,
            "page": body.page, "role": "assistant", "content": reply, "created_at": now
        },
    ])

    return AssistantChatResponse(reply=reply)


@app.get("/api/v1/assistant/conversations")
async def list_conversations(user_id: str):
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$sort": {"created_at": 1}},
        {"$group": {
            "_id": "$conversation_id",
            "first_message": {"$first": "$content"},
            "last_updated": {"$last": "$created_at"},
            "message_count": {"$sum": 1},
        }},
        {"$sort": {"last_updated": -1}},
        {"$limit": 50},
    ]
    results = [doc async for doc in db_mongo.assistant_messages.aggregate(pipeline)]

    conv_ids = [r["_id"] for r in results]
    titled = {
        doc["conversation_id"]: doc["title"]
        async for doc in db_mongo.assistant_conversations.find({"user_id": user_id, "conversation_id": {"$in": conv_ids}})
    }

    return [
        {
            "conversation_id": r["_id"],
            "title": titled.get(r["_id"]),
            "preview": (r["first_message"][:60] + "…") if len(r["first_message"]) > 60 else r["first_message"],
            "last_updated": r["last_updated"].isoformat(),
            "message_count": r["message_count"],
        }
        for r in results
    ]


class RenameConversationRequest(BaseModel):
    user_id: str
    title: str


@app.put("/api/v1/assistant/conversation/{conversation_id}/title")
async def rename_conversation(conversation_id: str, body: RenameConversationRequest):
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="title cannot be empty")

    await db_mongo.assistant_conversations.update_one(
        {"user_id": body.user_id, "conversation_id": conversation_id},
        {"$set": {"title": body.title.strip()}},
        upsert=True
    )
    return {"success": True, "title": body.title.strip()}


@app.get("/api/v1/assistant/conversation/{conversation_id}")
async def get_conversation(conversation_id: str, user_id: str):
    cursor = db_mongo.assistant_messages.find({
        "user_id": user_id,
        "conversation_id": conversation_id
    }).sort("created_at", 1)
    docs = [doc async for doc in cursor]
    return [{"role": d["role"], "content": d["content"]} for d in docs]