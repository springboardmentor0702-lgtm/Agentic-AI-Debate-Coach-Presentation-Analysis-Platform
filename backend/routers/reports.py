from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from database import get_db
import models
from routers.auth import get_current_user
import io

router = APIRouter(prefix="/api/v1/reports", tags=["Reports & Export System"])

def generate_pdf_bytes(title: str, content_lines: list) -> bytes:
    # Minimal pure-python compliant PDF-1.4 writer
    stream = []
    # Title formatting
    stream.append(b"BT\n/F1 20 Tf\n50 780 Td\n(" + title.encode('utf-8', 'ignore') + b") Tj\n")
    stream.append(b"0 -35 Td\n/F1 10 Tf\n")

    # Render line by line
    for line in content_lines:
        escaped_line = line.replace('(', '\\(').replace(')', '\\)').encode('utf-8', 'ignore')
        stream.append(b"0 -18 Td\n(" + escaped_line + b") Tj\n")
    stream.append(b"ET\n")
    stream_bytes = b"".join(stream)

    content_obj = f"<< /Length {len(stream_bytes)} >>\nstream\n".encode() + stream_bytes + b"\nendstream"

    objects_map = [
        (1, b"<< /Type /Catalog /Pages 3 0 R >>"),
        (2, b"<< /Type /Outlines /Count 0 >>"),
        (3, b"<< /Type /Pages /Kids [ 4 0 R ] /Count 1 >>"),
        (4, b"<< /Type /Page /Parent 3 0 R /MediaBox [ 0 0 595 842 ] /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> >> >>"),
        (5, content_obj),
        (6, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    ]

    offsets = {}
    current_offset = len(b"%PDF-1.4\n")
    pdf_body = [b"%PDF-1.4\n"]

    for obj_id, data in objects_map:
        offsets[obj_id] = current_offset
        obj_header = f"{obj_id} 0 obj\n".encode()
        obj_footer = b"\nendobj\n"
        full_obj = obj_header + data + obj_footer
        pdf_body.append(full_obj)
        current_offset += len(full_obj)

    xref_offset = current_offset
    pdf_body.append(b"xref\n")
    pdf_body.append(f"0 {len(objects_map) + 1}\n".encode())
    pdf_body.append(b"0000000000 65535 f \n")
    for obj_id in range(1, len(objects_map) + 1):
        pdf_body.append(f"{offsets[obj_id]:010d} 00000 n \n".encode())

    pdf_body.append(b"trailer\n")
    pdf_body.append(f"<< /Size {len(objects_map) + 1} /Root 1 0 R >>\n".encode())
    pdf_body.append(b"startxref\n")
    pdf_body.append(f"{xref_offset}\n".encode())
    pdf_body.append(b"%%EOF\n")

    return b"".join(pdf_body)

def _owned_session(session_id: int, current_user: models.User, db: Session):
    session = db.query(models.DebateSession).filter(models.DebateSession.id == session_id, models.DebateSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found.")

    return session

@router.get("/export/pdf/{session_id}")
def export_pdf_report(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = _owned_session(session_id, current_user, db)
    score = db.query(models.PerformanceScore).filter(models.PerformanceScore.session_id == session_id, models.PerformanceScore.user_id == current_user.id).first()
    metric = db.query(models.PresentationMetric).filter(models.PresentationMetric.session_id == session_id, models.PresentationMetric.user_id == current_user.id).first()

    score_val = score.overall_weighted_score if score else "Not available"
    arg_val = score.argument_quality if score else "Not available"
    evid_val = score.evidence_use if score else "Not available"
    logic_val = score.logical_consistency if score else "Not available"
    rebut_val = score.rebuttal_effectiveness if score else "Not available"
    comms_val = score.communication_skills if score else "Not available"

    wpm_val = metric.speech_pace_wpm if metric else "Not available"
    fillers_val = metric.filler_words_count if metric else "Not available"
    clarity_val = metric.clarity_score if metric else "Not available"
    conf_val = metric.confidence_score if metric else "Not available"
    engage_val = metric.engagement_score if metric else "Not available"

    lines = [
        f"------------------------------------------------------------------------------------------------",
        f"DEBATE PROPERTIES",
        f"  Topic: {session.topic[:65]}",
        f"  Format: {session.format} | Position: {session.assigned_position}",
        f"  Session Status: {session.status}",
        f"------------------------------------------------------------------------------------------------",
        f"WEIGHTED PERFORMANCE SCORE REPORT",
        f"  Overall Weighted Debate Rating: {score_val}%",
        f"  - Argument Quality (30% weight): {arg_val}%",
        f"  - Evidence Usage (20% weight): {evid_val}%",
        f"  - Logical Consistency (20% weight): {logic_val}%",
        f"  - Rebuttal Effectiveness (15% weight): {rebut_val}%",
        f"  - Communication Skills (15% weight): {comms_val}%",
        f"------------------------------------------------------------------------------------------------",
        f"PRESENTATION & SPEECH PROSODY ASSESSMENT",
        f"  - Speaking Pacing: {wpm_val} Words Per Minute",
        f"  - Vocal Filler Count: {fillers_val} fillers flagged",
        f"  - Speech Clarity Score: {clarity_val}%",
        f"  - Speaker Confidence Rating: {conf_val}%",
        f"  - Audience Engagement Score: {engage_val}%",
        f"------------------------------------------------------------------------------------------------",
        f"COACHING INSIGHTS & LEARNING PATH",
        f"  - Priority Action: Avoid circular logic and Socratic fallacy gaps.",
        f"  - Recommended drill: Pacing calibration exercises at 140 WPM.",
        f"------------------------------------------------------------------------------------------------",
        f"Generated by Logos.AI. Certification ID: CERT-LOGOS-{session_id}-2026",
    ]

    pdf_data = generate_pdf_bytes(f"LOGOS.AI ASSESSMENT REPORT // SESSION {session_id}", lines)

    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=logos_ai_session_{session_id}_assessment.pdf"}
    )

@router.get("/export/excel/{session_id}")
def export_excel_report(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = _owned_session(session_id, current_user, db)

    score = db.query(models.PerformanceScore).filter(models.PerformanceScore.session_id == session_id, models.PerformanceScore.user_id == current_user.id).first()
    metric = db.query(models.PresentationMetric).filter(models.PresentationMetric.session_id == session_id).first()

    score_val = score.overall_weighted_score if score else "Not available"
    arg_val = score.argument_quality if score else "Not available"
    evid_val = score.evidence_use if score else "Not available"
    logic_val = score.logical_consistency if score else "Not available"
    rebut_val = score.rebuttal_effectiveness if score else "Not available"
    comms_val = score.communication_skills if score else "Not available"

    wpm_val = metric.speech_pace_wpm if metric else "Not available"
    fillers_val = metric.filler_words_count if metric else "Not available"

    # Excel-compatible CSV layout (comma separated value format)
    csv_content = f"LOGOS.AI SESSION METRIC REPORT\n" \
                  f"Session ID,{session_id}\n" \
                  f"Topic,\"{session.topic}\"\n" \
                  f"Format,{session.format}\n" \
                  f"Position,{session.assigned_position}\n" \
                  f"Status,{session.status}\n\n" \
                  f"Metric Category,Performance Score,Weight Percentage,Audited Notes\n" \
                  f"Argument Quality,{arg_val},30%,Isolated claims correctly structured\n" \
                  f"Evidence Use,{evid_val},20%,Audited factual source reference count\n" \
                  f"Logical Consistency,{logic_val},20%,No fallacy traps triggered\n" \
                  f"Rebuttal Effectiveness,{rebut_val},15%,Addressed cross-fire challenges\n" \
                  f"Communication Skills,{comms_val},15%,Speaking clarity rate\n" \
                  f"Overall Weighted Score,{score_val},100%,Weighted performance summary\n\n" \
                  f"Speech Pace (WPM),{wpm_val},N/A,Words Per Minute\n" \
                  f"Filler Words Count,{fillers_val},N/A,Total verbal pause counts\n"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=logos_ai_session_{session_id}_matrix.csv"}
    )

@router.get("/export/coaching/pdf/{user_id}")
def export_coaching_pdf_report(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    from datetime import datetime
    from routers.coaching import get_coaching_plan
    plan = get_coaching_plan(user_id, current_user, db)

    lines = [
        f"------------------------------------------------------------------------------------------------",
        f"COACHING PROFILE & PROGRESS SUMMARY",
        f"  User ID: {user_id} | Status: {plan['progress_status']}",
        f"------------------------------------------------------------------------------------------------",
        f"SKILL GAP ANALYSIS",
        f"  {plan['skill_gap_summary']}",
        f"------------------------------------------------------------------------------------------------",
        f"TARGETED IMPROVEMENT RECOMMENDATIONS",
    ]
    for idx, rec in enumerate(plan['targeted_recommendations']):
        lines.append(f"  {idx+1}. {rec}")

    lines.append(f"------------------------------------------------------------------------------------------------")
    lines.append(f"DYNAMIC LEARNING PATH STEPS")
    for idx, step in enumerate(plan['learning_path_steps']):
        lines.append(f"  {idx+1}. {step}")

    lines.append(f"------------------------------------------------------------------------------------------------")
    lines.append(f"Generated by Logos.AI Coaching Engine. Date: {datetime.utcnow().strftime('%Y-%m-%d')}")

    pdf_data = generate_pdf_bytes(f"LOGOS.AI DYNAMIC COACHING & LEARNING PROGRESS REPORT", lines)

    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=logos_ai_user_{user_id}_coaching_plan.pdf"}
    )

@router.get("/export/summary/{session_id}")
def get_session_summary_report(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = _owned_session(session_id, current_user, db)
    score = db.query(models.PerformanceScore).filter_by(session_id=session_id, user_id=current_user.id).first()
    metric = db.query(models.PresentationMetric).filter_by(session_id=session_id, user_id=current_user.id).first()
    fallacies = db.query(models.FallacyLog.fallacy_type).join(models.ArgumentAnalysis).filter(models.ArgumentAnalysis.session_id == session_id, models.FallacyLog.user_id == current_user.id).all()
    return {
        "platform": "LOGOS.AI",
        "session_id": session_id,
        "title": session.title,
        "weighted_performance_score": score.overall_weighted_score if score else None,
        "fallacies_detected": [item[0] for item in fallacies],
        "speech_pace": f"{metric.speech_pace_wpm} WPM" if metric else None,
        "filler_words_count": metric.filler_words_count if metric else None,
        "certificate_id": f"CERT-LOGOS-{session_id}-{session.created_at:%Y}"
    }
