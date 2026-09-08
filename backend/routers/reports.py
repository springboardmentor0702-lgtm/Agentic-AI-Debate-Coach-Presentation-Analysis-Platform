import io
import csv
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import get_current_user
import models

router = APIRouter(prefix="/api/v1/reports", tags=["Reports & Export System"])


def _session(session_id, current_user, db):
    obj = db.query(models.DebateSession).filter(models.DebateSession.id == session_id, models.DebateSession.user_id == current_user.id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Debate session not found for this user.")
    return obj


def _metrics(session_id, db):
    score = db.query(models.PerformanceScore).filter(models.PerformanceScore.session_id == session_id).order_by(models.PerformanceScore.id.desc()).first()
    metric = db.query(models.PresentationMetric).filter(models.PresentationMetric.session_id == session_id).order_by(models.PresentationMetric.id.desc()).first()
    return score, metric

@router.get("/export/pdf/{session_id}")
def export_pdf_report(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = _session(session_id, current_user, db)
    score, metric = _metrics(session_id, db)
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=A4)
    y = 800
    c.setFont("Helvetica-Bold", 18); c.drawString(45, y, f"LOGOS.AI — Session Report #{session_id}"); y -= 32
    c.setFont("Helvetica", 10)
    lines = [f"Topic: {session.topic}", f"Format: {session.format} | Position: {session.assigned_position}", f"Status: {session.status}", "", "DEBATE SCORE"]
    if score:
        lines += [f"Overall: {score.overall_weighted_score:.1f}%", f"Argument Quality (30%): {score.argument_quality:.1f}", f"Evidence Usage (20%): {score.evidence_use:.1f}", f"Logical Consistency (20%): {score.logical_consistency:.1f}", f"Rebuttal Effectiveness (15%): {score.rebuttal_effectiveness:.1f}", f"Communication Skills (15%): {score.communication_skills:.1f}"]
    else: lines.append("No completed performance score recorded yet.")
    lines += ["", "PRESENTATION / VOICE"]
    if metric: lines += [f"Speaking pace: {metric.speech_pace_wpm:.1f} WPM", f"Filler words: {metric.filler_words_count}", f"Confidence: {metric.confidence_score:.1f}", f"Clarity: {metric.clarity_score:.1f}", f"Engagement: {metric.engagement_score:.1f}"]
    else: lines.append("No voice analysis recorded for this session.")
    for line in lines:
        if y < 55: c.showPage(); y = 800; c.setFont("Helvetica", 10)
        c.drawString(45, y, line[:105]); y -= 18
    c.save(); data = buf.getvalue()
    return Response(data, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=logos_ai_session_{session_id}_report.pdf"})

@router.get("/export/excel/{session_id}")
def export_excel_report(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = _session(session_id, current_user, db); score, metric = _metrics(session_id, db)
    from openpyxl import Workbook
    from openpyxl.styles import Font
    wb = Workbook(); ws = wb.active; ws.title = "Session Report"
    rows = [("LOGOS.AI SESSION REPORT", ""), ("Session ID", session.id), ("Topic", session.topic), ("Format", session.format), ("Position", session.assigned_position), ("Status", session.status), ("", ""), ("Metric", "Score")]
    if score: rows += [("Argument Quality (30%)", score.argument_quality), ("Evidence Usage (20%)", score.evidence_use), ("Logical Consistency (20%)", score.logical_consistency), ("Rebuttal Effectiveness (15%)", score.rebuttal_effectiveness), ("Communication Skills (15%)", score.communication_skills), ("Overall Weighted Score", score.overall_weighted_score)]
    if metric: rows += [("Speech Pace WPM", metric.speech_pace_wpm), ("Filler Words", metric.filler_words_count), ("Confidence", metric.confidence_score), ("Clarity", metric.clarity_score), ("Engagement", metric.engagement_score)]
    for r in rows: ws.append(r)
    ws["A1"].font = Font(bold=True, size=16)
    ws.column_dimensions["A"].width = 34; ws.column_dimensions["B"].width = 70
    buf = io.BytesIO(); wb.save(buf)
    return Response(buf.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=logos_ai_session_{session_id}_report.xlsx"})

@router.get("/export/summary/{session_id}")
def get_session_summary_report(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = _session(session_id, current_user, db); score, metric = _metrics(session_id, db)
    fallacies = db.query(models.FallacyLog).filter(models.FallacyLog.user_id == current_user.id, models.FallacyLog.analysis_id.in_(db.query(models.ArgumentAnalysis.id).filter(models.ArgumentAnalysis.session_id == session_id))).all()
    return {"platform": "LOGOS.AI", "session_id": session_id, "title": session.title, "weighted_performance_score": score.overall_weighted_score if score else 0, "fallacies_detected": sorted({f.fallacy_type for f in fallacies}) or ["None"], "speech_pace": metric.speech_pace_wpm if metric else None, "filler_words_count": metric.filler_words_count if metric else None, "certificate_id": f"CERT-LOGOS-{session_id}-2026"}

@router.get("/export/coaching/pdf/{user_id}")
def export_coaching_pdf(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only export your own coaching report.")
    from routers.coaching import get_coaching_plan
    plan = get_coaching_plan(user_id, current_user, db) if False else None
    # Build the plan directly to avoid calling a dependency-injected route.
    scores = db.query(models.PerformanceScore).filter(models.PerformanceScore.user_id == user_id).order_by(models.PerformanceScore.id.desc()).limit(5).all()
    avg = sum(s.overall_weighted_score for s in scores) / len(scores) if scores else 0
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=A4); y=800
    c.setFont("Helvetica-Bold",18); c.drawString(45,y,"LOGOS.AI — Coaching & Learning Progress"); y-=30
    c.setFont("Helvetica",10)
    lines=[f"Learner: {current_user.full_name}",f"Current average score: {avg:.1f}%","","Recommended practice:","• Complete a live AI debate and review the logic audit.","• Record a 60-second voice argument and reduce filler words.","• Practice evidence-based rebuttals and challenge questions."]
    for line in lines: c.drawString(45,y,line); y-=18
    c.save()
    return Response(buf.getvalue(),media_type="application/pdf",headers={"Content-Disposition":f"attachment; filename=logos_ai_user_{user_id}_coaching_report.pdf"})
