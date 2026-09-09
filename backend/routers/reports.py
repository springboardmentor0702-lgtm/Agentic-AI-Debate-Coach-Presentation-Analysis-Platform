from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import get_current_user
import models
import io
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

router = APIRouter(prefix="/api/v1/reports", tags=["Reports & Export System"])

def _score(session_id, db):
    return db.query(models.PerformanceScore).filter(models.PerformanceScore.session_id == session_id).order_by(models.PerformanceScore.id.desc()).first()

def _metric(session_id, db):
    return db.query(models.PresentationMetric).filter(models.PresentationMetric.session_id == session_id).order_by(models.PresentationMetric.id.desc()).first()

def _session(session_id, user_id, db):
    s = db.query(models.DebateSession).filter(models.DebateSession.id == session_id, models.DebateSession.user_id == user_id).first()
    if not s: raise HTTPException(status_code=404, detail="Debate session not found.")
    return s

def _data(session_id, user_id, db):
    session = _session(session_id, user_id, db)
    score = _score(session_id, db)
    metric = _metric(session_id, db)
    analyses = db.query(models.ArgumentAnalysis).filter(models.ArgumentAnalysis.session_id == session_id).all()
    turns = db.query(models.SimulationTurn).filter(models.SimulationTurn.session_id == session_id).all()
    return session, score, metric, analyses, turns

@router.get("/summary/{session_id}")
def report_summary(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session, score, metric, analyses, turns = _data(session_id, current_user.id, db)
    return {
        "platform": "LOGOS.AI", "session_id": session.id, "title": session.title, "topic": session.topic,
        "format": session.format, "position": session.assigned_position, "status": session.status,
        "score": score.overall_weighted_score if score else None,
        "weights": {"argument_quality": 30, "evidence_use": 20, "logical_consistency": 20, "rebuttal_effectiveness": 15, "communication_skills": 15},
        "presentation": {
            "speech_pace_wpm": metric.speech_pace_wpm if metric else None,
            "filler_words_count": metric.filler_words_count if metric else None,
            "confidence_score": metric.confidence_score if metric else None,
            "clarity_score": metric.clarity_score if metric else None,
            "engagement_score": metric.engagement_score if metric else None,
        },
        "turn_count": len(turns), "analysis_count": len(analyses),
    }

@router.get("/export/pdf/{session_id}")
def export_pdf_report(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session, score, metric, analyses, turns = _data(session_id, current_user.id, db)
    if not score: raise HTTPException(status_code=404, detail="Complete the session before exporting a report.")
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=A4); y = 800
    lines = [
        "LOGOS.AI — DEBATE & PRESENTATION REPORT", f"Session: {session.title}", f"Topic: {session.topic}",
        f"Format: {session.format} | Position: {session.assigned_position}", "",
        f"Overall Score: {score.overall_weighted_score:.1f}%",
        f"Argument Quality (30%): {score.argument_quality:.1f}%", f"Evidence Usage (20%): {score.evidence_use:.1f}%",
        f"Logical Consistency (20%): {score.logical_consistency:.1f}%", f"Rebuttal Effectiveness (15%): {score.rebuttal_effectiveness:.1f}%",
        f"Communication Skills (15%): {score.communication_skills:.1f}%", "",
        f"Speech Pace: {metric.speech_pace_wpm:.1f} WPM" if metric else "Speech Pace: N/A",
        f"Filler Words: {metric.filler_words_count}" if metric else "Filler Words: N/A",
        f"Confidence: {metric.confidence_score:.1f}%" if metric else "Confidence: N/A",
        f"Clarity: {metric.clarity_score:.1f}%" if metric else "Clarity: N/A",
        f"Engagement: {metric.engagement_score:.1f}%" if metric else "Engagement: N/A",
        "", "Coaching: Review fallacies, strengthen evidence, answer challenge questions, and practice pacing."
    ]
    for line in lines:
        c.drawString(50, y, line[:110]); y -= 20
        if y < 50: c.showPage(); y = 800
    c.save(); return Response(buf.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="logos_report_{session_id}.pdf"'})

@router.get("/export/xlsx/{session_id}")
def export_xlsx_report(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session, score, metric, analyses, turns = _data(session_id, current_user.id, db)
    if not score: raise HTTPException(status_code=404, detail="Complete the session before exporting a report.")
    wb = Workbook(); ws = wb.active; ws.title = "Performance"
    rows = [["Metric", "Value", "Weight"], ["Overall", score.overall_weighted_score, "100%"], ["Argument Quality", score.argument_quality, "30%"], ["Evidence Usage", score.evidence_use, "20%"], ["Logical Consistency", score.logical_consistency, "20%"], ["Rebuttal Effectiveness", score.rebuttal_effectiveness, "15%"], ["Communication Skills", score.communication_skills, "15%"]]
    for row in rows: ws.append(row)
    if metric:
        sp = wb.create_sheet("Presentation"); sp.append(["Metric", "Value"])
        for row in [["Speech Pace WPM", metric.speech_pace_wpm], ["Filler Words", metric.filler_words_count], ["Confidence", metric.confidence_score], ["Clarity", metric.clarity_score], ["Engagement", metric.engagement_score]]: sp.append(row)
    buf = io.BytesIO(); wb.save(buf); return Response(buf.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f'attachment; filename="logos_report_{session_id}.xlsx"'})
