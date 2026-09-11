from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.database import get_db
from ..core.security import get_current_user
from ..models import User, DebateSession, DebateTurn, SessionScore, DebateTopic, Report
from ..services.argument_analysis import analyze_argument
from ..services.fallacy_detection import detect_fallacies
from ..services.counterargument import generate_counterarguments
from ..services.presentation_analysis import analyze_presentation
from ..services.scoring import compute_performance_score
from ..services.coaching import coaching_recommendations
from ..services.notifications_service import notify, send_email
from ..services.export_service import build_pdf, build_excel
from .deps import owned_session

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


class TextInput(BaseModel):
    text: str
    topic: str = ""


@router.post("/arguments")
def analyze_arguments(body: TextInput):
    return analyze_argument(body.text, body.topic)


@router.post("/fallacies")
def check_fallacies(body: TextInput):
    return detect_fallacies(body.text)


@router.post("/counterarguments")
def counterarguments(body: TextInput, ctype: str = "logical"):
    return generate_counterarguments(body.text, body.topic, ctype)


@router.post("/presentation")
def presentation(body: TextInput, duration_seconds: Optional[float] = None):
    return analyze_presentation(body.text, duration_seconds)


@router.post("/presentation/audio")
async def presentation_audio(file: UploadFile = File(...)):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(400, "Audio transcription requires OPENAI_API_KEY (Whisper). "
                                 "Use the microphone button (browser speech) or /presentation with a transcript.")
    from openai import OpenAI
    data = await file.read()
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    tr = client.audio.transcriptions.create(model="whisper-1", file=(file.filename, data))
    return analyze_presentation(tr.text)


@router.post("/sessions/{session_id}/evaluate")
def evaluate_session(s: DebateSession = Depends(owned_session),
                     user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    user_turns = db.query(DebateTurn).filter(
        DebateTurn.session_id == s.id, DebateTurn.speaker == "user").all()
    all_turns = db.query(DebateTurn).filter(DebateTurn.session_id == s.id) \
        .order_by(DebateTurn.turn_number).all()
    transcript = " ".join(t.content for t in user_turns)
    user_analyses = [t.analysis.get("argument", {}) for t in user_turns if t.analysis.get("argument")]
    fallacies_found = [f for t in user_turns
                       for f in t.analysis.get("fallacies", {}).get("fallacies", [])]
    presentation = analyze_presentation(transcript if transcript else "No speech recorded.", None)
    score = compute_performance_score(user_analyses, presentation)
    coaching = coaching_recommendations(score, fallacies_found, presentation)

    db.add(SessionScore(session_id=s.id, argument_quality=score["argument_quality"],
        evidence_usage=score["evidence_usage"], logical_consistency=score["logical_consistency"],
        rebuttal_effectiveness=score["rebuttal_effectiveness"],
        communication_skills=score["communication_skills"], overall_score=score["overall_score"],
        breakdown={"coaching": coaching, "presentation": presentation, "fallacies": fallacies_found}))
    s.status, s.ended_at = "completed", datetime.utcnow()

    topic = db.get(DebateTopic, s.topic_id)
    topic_title = topic.title if topic else ""
    report = {"session_id": s.id, "topic": topic_title,
              "generated_at": str(datetime.utcnow()),
              "transcript": [{"speaker": t.speaker, "content": t.content} for t in all_turns],
              "scores": score, "presentation_metrics": presentation.get("metrics", {}),
              "presentation_feedback": presentation.get("feedback", []),
              "fallacies_found": fallacies_found, "coaching": coaching}
    db.add(Report(session_id=s.id, content=report))

    # Module 12: notifications
    notify(db, user.id, "feedback", "Feedback ready",
           f'Your debate "{topic_title}" was evaluated. Score: {score["overall_score"]}/100')
    if score["overall_score"] >= 85:
        notify(db, user.id, "milestone", "Milestone achieved!",
               "You scored 85+ in a debate session. Outstanding work!",
               dedupe_key=f"milestone85:{user.id}")
    db.commit()

    send_email(user.email, "Your debate feedback is ready",
               f"Overall score {score['overall_score']}/100 on '{topic_title}'. "
               f"Weakest area: {min(score, key=lambda k: score[k] if k != 'overall_score' else 999)}.")
    return report


@router.get("/reports/{session_id}")
def get_report(session_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(Report).filter(Report.session_id == session_id).first()
    if not row:
        raise HTTPException(404, "Report not found - evaluate the session first")
    return row.content


# ---------------- Module 13: PDF / Excel export ----------------
@router.get("/reports/{session_id}/export/pdf")
def export_pdf(session_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(Report).filter(Report.session_id == session_id).first()
    if not row:
        raise HTTPException(404, "Report not found")
    pdf = build_pdf(row.content)
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=debate-report-{session_id}.pdf"})


@router.get("/reports/{session_id}/export/xlsx")
def export_xlsx(session_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(Report).filter(Report.session_id == session_id).first()
    if not row:
        raise HTTPException(404, "Report not found")
    xls = build_excel(row.content)
    return Response(xls,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=debate-report-{session_id}.xlsx"})
