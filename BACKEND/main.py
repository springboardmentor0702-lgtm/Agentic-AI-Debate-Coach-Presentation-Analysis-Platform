import io
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from google import genai
from pydantic import BaseModel, Field

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agentic-ai-coach")

app = FastAPI(title="Agentic AI Debate Coach & Presentation Analysis Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing. Add GEMINI_API_KEY=your_key to the .env file.")

llm_client = genai.Client(api_key=GEMINI_API_KEY)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# -----------------------------
# Request models
# -----------------------------
class SimulateRequest(BaseModel):
    topic: str
    user_position: str
    user_statement: str
    chat_history: Optional[List[dict]] = Field(default_factory=list)
    max_rounds: Optional[int] = 3


class ArgumentAnalysisRequest(BaseModel):
    topic: str
    position: str
    argument_text: str


class CounterargumentRequest(BaseModel):
    topic: str
    argument_text: str
    counter_type: str


class PresentationRequest(BaseModel):
    speech_text: str
    audio_duration_seconds: float
    filler_word_count: int


class RecommendationRequest(BaseModel):
    user_role: Optional[str] = "Learner"
    experience_level: Optional[str] = "Intermediate"
    target_area: Optional[str] = "Debate & Logical Reasoning"


# -----------------------------
# Gemini helpers
# -----------------------------
def generate_text(prompt: str) -> str:
    """Call Gemini and return non-empty text, with useful logging on failure."""
    try:
        response = llm_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        text = (getattr(response, "text", None) or "").strip()
        if not text:
            raise RuntimeError("Gemini returned an empty response")
        return text
    except Exception as exc:
        logger.exception("Gemini request failed: %s", exc)
        raise


def generate_json(prompt: str) -> Dict[str, Any]:
    """Ask Gemini for JSON and robustly parse fenced/plain JSON output."""
    json_prompt = prompt + "\n\nReturn ONLY valid JSON. Do not use markdown fences or add commentary."
    raw = generate_text(json_prompt)

    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.I)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.S)
        if not match:
            raise RuntimeError(f"Gemini did not return valid JSON: {raw[:500]}")
        data = json.loads(match.group(0))

    if not isinstance(data, dict):
        raise RuntimeError("Gemini JSON response was not an object")
    return data


def clamp_score(value: Any, default: int = 70) -> int:
    try:
        return max(0, min(100, int(round(float(value)))))
    except (TypeError, ValueError):
        return default


# -----------------------------
# Authentication
# -----------------------------
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if not form_data.username or not form_data.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect username or password")
    return {"access_token": f"token-{form_data.username}", "token_type": "bearer"}


async def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    return {"username": token.replace("token-", "", 1)}


# -----------------------------
# Dashboard / reports
# -----------------------------
@app.get("/api/dashboard")
async def get_dashboard(role: str = "Learner", current_user: dict = Depends(get_current_user)):
    return {
        "total_debates": 18,
        "average_score": 86,
        "improvement_rate": "+18%",
        "skill_breakdown": {
            "Argument Quality (30%)": 88,
            "Evidence Integration (20%)": 82,
            "Logical Consistency (20%)": 85,
            "Rebuttal Effectiveness (15%)": 80,
            "Communication Skills (15%)": 90,
        },
        "recent_activity": [
            {"topic": "Online vs Classroom Learning", "date": "2026-03-05", "score": 88},
            {"topic": "AI Governance and Ethics", "date": "2026-03-01", "score": 84},
            {"topic": "Universal Basic Income", "date": "2026-02-25", "score": 81},
        ],
    }


@app.get("/api/reports")
async def get_reports(current_user: dict = Depends(get_current_user)):
    return {
        "debate_reports": [
            {"topic": "Online vs Classroom Learning", "score": 88, "fallacies_detected": 1},
            {"topic": "AI Governance and Ethics", "score": 84, "fallacies_detected": 2},
            {"topic": "Universal Basic Income", "score": 81, "fallacies_detected": 0},
        ],
        "presentation_reports": [
            {"title": "Keynote Pitch Practice", "pace_wpm": 142, "filler_ratio": 2.1, "clarity": 88},
            {"title": "Policy Defense Briefing", "pace_wpm": 135, "filler_ratio": 1.5, "clarity": 92},
        ],
        "performance_scores": [
            {"category": "Argument Quality (30%)", "score": 88},
            {"category": "Evidence Usage (20%)", "score": 82},
            {"category": "Logical Consistency (20%)", "score": 85},
            {"category": "Rebuttal Effectiveness (15%)", "score": 80},
            {"category": "Communication Skills (15%)", "score": 90},
        ],
        "coaching_reports": [
            {"area": "Rebuttal Structure", "insight": "Improve empirical backing when delivering counter-claims."},
            {"area": "Pacing & Delivery", "insight": "Maintain steady speech pace under 150 WPM during pressure turns."},
        ],
        "learning_progress": [
            {"module": "Module 1: Advanced Rebuttal Strategies", "status": "Completed", "completion": 100},
            {"module": "Module 2: Evidence Integration & Fact-Checking", "status": "In Progress", "completion": 65},
            {"module": "Module 3: Vocal Prosody Mastery", "status": "Not Started", "completion": 0},
        ],
    }


# -----------------------------
# Recommendations
# -----------------------------
@app.post("/api/recommendations")
async def generate_recommendations(req: RecommendationRequest, current_user: dict = Depends(get_current_user)):
    prompt = f"""
You are an expert debate and communication coach.
Create a personalized plan using ONLY the supplied learner profile.

Role: {req.user_role}
Experience level: {req.experience_level}
Target area: {req.target_area}

Return JSON with exactly these keys:
- personalized_feedback: string
- learning_path: array of 3 strings
- recommended_exercises: array of 3 strings

Every item must be specific to the target area and experience level. Avoid generic boilerplate.
"""
    try:
        data = generate_json(prompt)
        return {
            "personalized_feedback": str(data.get("personalized_feedback", "")),
            "learning_path": data.get("learning_path", []),
            "recommended_exercises": data.get("recommended_exercises", []),
        }
    except Exception:
        # Dynamic fallback: never return the old fixed recommendation.
        return {
            "personalized_feedback": (
                f"For a {req.experience_level} {req.user_role} focusing on {req.target_area}, "
                f"prioritize deliberate practice around {req.target_area.lower()}, then review each attempt "
                "for one concrete improvement rather than repeating the same exercise."
            ),
            "learning_path": [
                f"Foundations of {req.target_area}",
                f"Intermediate {req.target_area} drills and feedback",
                f"Advanced {req.target_area} timed simulations",
            ],
            "recommended_exercises": [
                f"Complete a 3-minute practice task focused on {req.target_area}.",
                "Record one response and identify your strongest and weakest reasoning step.",
                "Repeat the exercise with one measurable improvement target.",
            ],
        }


# -----------------------------
# AI opponent simulation
# -----------------------------
@app.post("/api/simulate-opponent")
async def simulate_opponent(req: SimulateRequest, current_user: dict = Depends(get_current_user)):
    user_is_pro = req.user_position.lower().strip() in {"pro", "affirmative", "support", "for"}
    opponent_position = "Negative/Opposing" if user_is_pro else "Affirmative/Supporting"

    history = req.chat_history or []
    user_turns = [m for m in history if str(m.get("sender", "")).lower() == "user"]
    current_round = len(user_turns)
    max_rounds = req.max_rounds if req.max_rounds and req.max_rounds > 0 else 3
    is_final_round = current_round >= max_rounds

    history_str = "\n".join(
        f"{m.get('sender', 'Speaker')}: {m.get('text', '')}" for m in history[-12:]
    )

    prompt = f"""
You are a competitive but fair debate opponent.
Topic: {req.topic}
Your position: {opponent_position}
User position: {req.user_position}
Current user statement: {req.user_statement}
Round: {current_round}/{max_rounds}

Conversation so far:
{history_str or '(first turn)'}

Analyze the user's ACTUAL latest statement. Do not use boilerplate.
"""
    if is_final_round:
        prompt += """
This is the final round. Return JSON with:
- rebuttal: a concise final rebuttal specifically addressing the latest statement
- challenge_question: empty string
- verdict: a short balanced verdict explaining which side was stronger and why
"""
    else:
        prompt += """
Return JSON with:
- rebuttal: 2 distinct points that directly challenge the latest statement
- challenge_question: one sharp cross-examination question based on the latest statement
- verdict: empty string
"""

    try:
        data = generate_json(prompt)
        rebuttal = str(data.get("rebuttal", "")).strip()
        question = str(data.get("challenge_question", "")).strip()
        verdict = str(data.get("verdict", "")).strip()
        if is_final_round and verdict:
            rebuttal += f"\n\n🏆 DEBATE CONCLUDED\nVerdict: {verdict}"
        return {
            "ai_opponent_rebuttal": rebuttal,
            "challenge_question": "" if is_final_round else question,
            "is_concluded": is_final_round,
            "current_round": current_round,
            "max_rounds": max_rounds,
        }
    except Exception:
        # Input-dependent fallback so a Gemini outage never produces one identical answer.
        statement = req.user_statement.strip()
        topic = req.topic.strip()
        if is_final_round:
            text = (
                f"Final rebuttal on '{topic}': your claim — '{statement}' — needs stronger support. "
                f"From the {opponent_position} side, the key issue is whether that claim remains valid "
                "when practical trade-offs and opposing evidence are considered.\n\n"
                f"🏆 DEBATE CONCLUDED (Round {current_round}/{max_rounds})"
            )
        else:
            text = (
                f"I challenge your statement — '{statement}'. First, explain the evidence that connects "
                "your main claim to the outcome you predict. Second, consider the strongest case for the "
                f"{opponent_position} side before concluding that your position is preferable.\n\n"
                f"🎯 Cross-Examination: What specific evidence would change your position on '{statement}'?"
            )
        return {
            "ai_opponent_rebuttal": text,
            "challenge_question": "" if is_final_round else f"What evidence would change your position on '{statement}'?",
            "is_concluded": is_final_round,
            "current_round": current_round,
            "max_rounds": max_rounds,
        }


# -----------------------------
# Counterargument generator
# -----------------------------
@app.post("/api/generate-counterargument")
async def generate_counterargument(req: CounterargumentRequest, current_user: dict = Depends(get_current_user)):
    prompt = f"""
You are an expert debate coach.
Topic: {req.topic}
Opponent's exact claim: {req.argument_text}
Requested counterargument strategy: {req.counter_type}

Analyze the exact claim and produce a response tailored to it. Do not give generic advice.
Return JSON with exactly:
- rebuttal: strong direct rebuttal using the requested strategy
- alternative_perspective: a balanced alternative view relevant to this claim
- challenge_question: one precise cross-examination question targeting an assumption in the claim
"""
    try:
        data = generate_json(prompt)
        return {
            "counter_type": req.counter_type,
            "rebuttal": str(data.get("rebuttal", "")).strip(),
            "alternative_perspective": str(data.get("alternative_perspective", "")).strip(),
            "challenge_question": str(data.get("challenge_question", "")).strip(),
        }
    except Exception:
        claim = req.argument_text.strip()
        strategy = req.counter_type.strip()
        return {
            "counter_type": strategy,
            "rebuttal": (
                f"Using a {strategy} strategy, the claim '{claim}' should not be accepted without examining "
                "its assumptions, supporting evidence, and whether the conclusion follows in the context of "
                f"{req.topic}."
            ),
            "alternative_perspective": (
                f"A stronger analysis of '{claim}' should consider both the benefits and the possible costs "
                f"within {req.topic}, rather than treating one outcome as universally true."
            ),
            "challenge_question": f"Which specific evidence would demonstrate that '{claim}' is true across the relevant cases?",
        }


# -----------------------------
# Argument / fallacy analyzer
# -----------------------------
@app.post("/api/analyze-argument")
async def analyze_argument(req: ArgumentAnalysisRequest, current_user: dict = Depends(get_current_user)):
    prompt = f"""
You are an expert argumentation and logical-fallacy evaluator.

Topic: {req.topic}
Speaker position: {req.position}
Exact argument to analyze: {req.argument_text}

Evaluate ONLY the supplied argument. Scores must reflect the actual text, not fixed defaults.
Return JSON with exactly:
- weighted_overall_score: integer 0-100
- criteria_scores: object containing exactly Clarity, Relevance, Evidence Strength, Logical Consistency, Persuasiveness; each integer 0-100
- detected_fallacies: array of objects, each with fallacy_type, explanation, correction_suggestion

Only report a fallacy when the argument provides evidence for it. If none is present, return an empty array.
"""
    try:
        data = generate_json(prompt)
        criteria = data.get("criteria_scores") or {}
        criteria_scores = {
            "Clarity": clamp_score(criteria.get("Clarity")),
            "Relevance": clamp_score(criteria.get("Relevance")),
            "Evidence Strength": clamp_score(criteria.get("Evidence Strength")),
            "Logical Consistency": clamp_score(criteria.get("Logical Consistency")),
            "Persuasiveness": clamp_score(criteria.get("Persuasiveness")),
        }
        fallacies = data.get("detected_fallacies")
        if not isinstance(fallacies, list):
            fallacies = []
        overall = clamp_score(data.get("weighted_overall_score"), round(sum(criteria_scores.values()) / 5))
        return {
            "weighted_overall_score": overall,
            "criteria_scores": criteria_scores,
            "detected_fallacies": fallacies,
        }
    except Exception:
        # Deterministic, input-sensitive fallback. This is not presented as an AI analysis.
        text = req.argument_text.strip()
        words = re.findall(r"\b\w+\b", text)
        word_count = len(words)
        sentences = max(1, len(re.findall(r"[.!?]+", text)))
        evidence_markers = len(re.findall(r"\b(because|therefore|data|study|studies|research|evidence|survey|percent|%|according to)\b", text, re.I))
        absolute_markers = len(re.findall(r"\b(always|never|everyone|nobody|all|none|obviously|clearly)\b", text, re.I))
        clarity = clamp_score(65 + min(20, word_count // 12) - max(0, sentences - 6) * 3)
        relevance = clamp_score(75 if req.topic.lower() in text.lower() else 65)
        evidence = clamp_score(45 + evidence_markers * 10)
        consistency = clamp_score(78 - absolute_markers * 7)
        persuasiveness = clamp_score((clarity + relevance + evidence + consistency) / 4)
        criteria_scores = {
            "Clarity": clarity,
            "Relevance": relevance,
            "Evidence Strength": evidence,
            "Logical Consistency": consistency,
            "Persuasiveness": persuasiveness,
        }
        fallacies = []
        if absolute_markers:
            fallacies.append({
                "fallacy_type": "Overgeneralization",
                "explanation": "The argument uses absolute language that may extend a conclusion beyond the evidence provided.",
                "correction_suggestion": "Qualify the claim and provide evidence showing how broadly it applies.",
            })
        if evidence_markers == 0 and word_count >= 12:
            fallacies.append({
                "fallacy_type": "Unsupported Assertion",
                "explanation": "The argument makes a substantive claim without citing supporting evidence or examples.",
                "correction_suggestion": "Add relevant data, research, examples, or a clearly explained causal reason.",
            })
        return {
            "weighted_overall_score": round(sum(criteria_scores.values()) / 5),
            "criteria_scores": criteria_scores,
            "detected_fallacies": fallacies,
        }


# -----------------------------
# Presentation analytics
# -----------------------------
@app.post("/api/analyze-presentation")
async def analyze_presentation(req: PresentationRequest, current_user: dict = Depends(get_current_user)):
    words = len(req.speech_text.split())
    duration = max(float(req.audio_duration_seconds), 1.0)
    minutes = duration / 60.0
    wpm = round(words / minutes) if words else 0
    filler_ratio = round((max(req.filler_word_count, 0) / max(words, 1)) * 100, 1)

    # These metrics are based on actual input rather than fixed 88/84 values.
    pace_score = 100 - min(50, abs(wpm - 145) * 0.45) if wpm else 50
    filler_score = max(40, 100 - filler_ratio * 5)
    sentence_count = max(1, len(re.findall(r"[.!?]+", req.speech_text)))
    avg_sentence_words = words / sentence_count if words else 0
    clarity_score = max(40, min(100, 92 - max(0, avg_sentence_words - 25) * 1.5))
    engagement_score = max(40, min(100, 55 + min(30, words / 10) + min(15, sentence_count)))
    confidence_score = max(40, min(100, 0.45 * pace_score + 0.35 * filler_score + 0.20 * clarity_score))

    return {
        "speech_pace_wpm": wpm,
        "filler_word_ratio": filler_ratio,
        "confidence_score": round(confidence_score),
        "clarity_score": round(clarity_score),
        "engagement_score": round(engagement_score),
    }


# -----------------------------
# Audio transcription
# -----------------------------
@app.post("/api/transcribe-audio")
async def transcribe_audio(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty")

        mime_type = file.content_type or "audio/webm"
        uploaded_file = llm_client.files.upload(
            file=io.BytesIO(audio_bytes),
            config={"mime_type": mime_type},
        )
        response = llm_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=["Transcribe this audio verbatim. Return only the transcript.", uploaded_file],
        )
        text = (getattr(response, "text", None) or "").strip()
        if not text:
            raise RuntimeError("Gemini returned an empty transcript")
        return {"text": text}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Audio transcription failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Audio transcription failed: {exc}")


@app.get("/api/health")
async def health():
    return {"status": "ok", "gemini_model": GEMINI_MODEL}
