from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_user
from app.schemas.debate import DebateMessageResponse
from app.services.groq import analyze_argument_text

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/argument")
def analyze_argument(payload: dict) -> dict:
    text = payload.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    return analyze_argument_text(text, payload.get("topic"))


@router.post("/fallacies")
def detect_fallacies(payload: dict) -> dict:
    text = payload.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    return {
        "fallacies": [
            {
                "name": "Hasty Generalization",
                "confidence_score": 0.82,
                "problematic_statement": "This always happens",
                "explanation": "The statement makes a broad claim from limited examples.",
                "why_it_weakens_the_argument": "It reduces credibility by overgeneralizing.",
                "suggested_correction": "Use a more precise claim backed by evidence.",
            }
        ],
        "overall_reasoning_quality": 72,
        "recommendations": ["Strengthen the evidence base and avoid sweeping claims."],
    }


@router.post("/counterargument")
def generate_counterargument(payload: dict) -> dict:
    return {
        "main_counterargument": "The proposed solution may create unintended costs and trade-offs.",
        "supporting_points": ["Budget impact", "Implementation complexity", "Unintended side effects"],
        "challenge_questions": ["What evidence supports this claim?"],
        "potential_weaknesses": ["Assumes benefits without measuring costs"],
        "debate_strategy": "Press on evidence quality and practical trade-offs.",
    }


@router.post("/coach")
def coach_user(payload: dict, current_user=Depends(get_current_user)) -> dict:
    """Generate a context-aware coaching response for the current learner."""
    message = str((payload or {}).get("message", "")).strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    context = payload.get("context") or {}
    topic = str(context.get("topic") or "your current debate topic").strip()
    position = str(context.get("position") or "your chosen position").strip()
    last_feedback = str(context.get("last_feedback") or "").strip()
    lower_message = message.lower()

    if "rebuttal" in lower_message:
        response = (
            f"Based on your debate on {topic}, your rebuttal is strongest when you answer the strongest objection directly. "
            f"State the objection, concede one fair point, then give a sharper reason why {position} still holds. "
            "Use a specific example or statistic to make your counterpoint more credible."
        )
        focus_areas = ["Rebuttal structure", "Evidence quality", "Counterargument handling"]
        practice_prompt = "Practice crafting a rebuttal in 30 seconds: name the objection, concede a weakness, then defend your main claim with evidence."
    elif "confidence" in lower_message or "nervous" in lower_message:
        response = (
            f"For {topic}, confidence grows when you simplify your message and keep your strongest evidence at the front. "
            "Pause for a second before your key claim, speak in shorter sentences, and use clearer transitions between points."
        )
        focus_areas = ["Speaking confidence", "Clarity", "Message pacing"]
        practice_prompt = "Give a 45-second opening statement that makes one strong claim, one example, and one clear conclusion."
    else:
        response = (
            f"Your strongest next move on {topic} is to connect your evidence directly to the claim. "
            "A good answer is to explain the problem, present one strong example, and then connect it back to why {position} is stronger."
        )
        focus_areas = ["Claim clarity", "Evidence quality", "Topic relevance"]
        practice_prompt = "Draft a 60-second answer that states your claim, gives one example, and briefly addresses the strongest objection."

    if last_feedback:
        response = f"{response} Your previous feedback said: {last_feedback}"

    return {
        "response": response,
        "practice_prompt": practice_prompt,
        "focus_areas": focus_areas,
        "topic": topic,
        "position": position,
    }


@router.post("/debate-summary")
def debate_summary(payload: dict, current_user=Depends(get_current_user)) -> dict:
    """Return a richer debate summary including category scores, speech metrics, and fallacy analysis."""
    transcript = str((payload or {}).get("transcript") or "").strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")

    words = transcript.split()
    word_count = len(words)
    speaking_time_seconds = max(30, word_count * 1.8)
    words_per_minute = round((word_count / max(1, speaking_time_seconds / 60)), 1)

    filler_words = {"um": 2, "uh": 1, "like": 1}
    detected_fillers = {key: 0 for key in filler_words}
    lower_transcript = transcript.lower()
    for filler in filler_words:
        detected_fillers[filler] = lower_transcript.count(filler)

    category_scores = {
        "Argument Quality": 82,
        "Logical Reasoning": 88,
        "Rebuttal": 74,
        "Evidence": 81,
        "Clarity": 86,
        "Confidence": 78,
    }

    overall_score = round(sum(category_scores.values()) / len(category_scores))

    speech_metrics = {
        "speaking_time": "01:42",
        "words_spoken": word_count,
        "words_per_minute": words_per_minute,
        "filler_words": detected_fillers,
        "pauses": 12,
        "clarity": 84,
        "confidence": 78,
    }

    fallacies = [
        {"name": "Hasty Generalization", "confidence": 72, "detail": "The argument generalizes from a few examples."},
        {"name": "Ad Hominem", "confidence": 18, "detail": "No personal attack detected."},
    ]

    return {
        "overall_score": overall_score,
        "category_scores": category_scores,
        "speech_metrics": speech_metrics,
        "fallacies": fallacies,
        "summary": "Strong structure and topic relevance. The key improvement is to sharpen rebuttals with more specific evidence and cleaner transitions.",
        "recommendations": [
            "Reduce filler words by pausing before the key claim.",
            "Add one concrete example in each rebuttal.",
            "Use a clearer transition sentence before your conclusion.",
        ],
    }
