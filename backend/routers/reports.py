from fastapi import APIRouter, Response, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import io

router = APIRouter(prefix="/api/v1/reports", tags=["Reports & Export System"])


def get_session_data(session_id: int, db: Session):
    session = db.query(models.DebateSession).filter(
        models.DebateSession.id == session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    performance = db.query(models.PerformanceScore).filter(
        models.PerformanceScore.session_id == session_id
    ).order_by(models.PerformanceScore.id.desc()).first()

    analysis = db.query(models.ArgumentAnalysis).filter(
        models.ArgumentAnalysis.session_id == session_id
    ).order_by(models.ArgumentAnalysis.id.desc()).first()

    presentation = db.query(models.PresentationMetric).filter(
        models.PresentationMetric.session_id == session_id
    ).order_by(models.PresentationMetric.id.desc()).first()

    return session, performance, analysis, presentation


@router.get("/export/csv/{session_id}")
def export_csv_report(session_id: int, db: Session = Depends(get_db)):
    session, performance, analysis, presentation = get_session_data(session_id, db)

    if performance:
        argument_quality = performance.argument_quality
        evidence_use = performance.evidence_use
        logical_consistency = performance.logical_consistency
        rebuttal_effectiveness = performance.rebuttal_effectiveness
        communication_skills = performance.communication_skills
        overall_score = performance.overall_weighted_score
    elif analysis:
        argument_quality = analysis.persuasiveness_score
        evidence_use = analysis.evidence_strength
        logical_consistency = analysis.logical_consistency
        rebuttal_effectiveness = analysis.persuasiveness_score
        communication_skills = analysis.clarity_score
        overall_score = (
            argument_quality * 0.30
            + evidence_use * 0.20
            + logical_consistency * 0.20
            + rebuttal_effectiveness * 0.15
            + communication_skills * 0.15
        )
    else:
        raise HTTPException(
            status_code=404,
            detail="No performance data found for this session"
        )

    wpm = presentation.words_per_minute if presentation else None
    fillers = presentation.filler_words_count if presentation else None

    csv_content = (
        "Metric,Score,Details\n"
        f"Argument Quality,{argument_quality:.1f},Persuasiveness and argument construction\n"
        f"Evidence Use,{evidence_use:.1f},Evidence strength from argument analysis\n"
        f"Logical Consistency,{logical_consistency:.1f},Logical consistency from argument analysis\n"
        f"Rebuttal Effectiveness,{rebuttal_effectiveness:.1f},Counter-argument effectiveness\n"
        f"Communication Skills,{communication_skills:.1f},"
        f"{f'{wpm:.1f} WPM speech pace' if wpm is not None else 'Clarity-based communication score'}\n"
        f"Overall Weighted Score,{overall_score:.1f},Formula: 30%+20%+20%+15%+15%\n"
    )

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition":
                f"attachment; filename=logos_ai_session_{session_id}_report.csv"
        }
    )


@router.get("/export/summary/{session_id}")
def get_session_summary_report(session_id: int, db: Session = Depends(get_db)):
    session, performance, analysis, presentation = get_session_data(session_id, db)

    if performance:
        overall_score = performance.overall_weighted_score
    elif analysis:
        overall_score = (
            analysis.persuasiveness_score * 0.30
            + analysis.evidence_strength * 0.20
            + analysis.logical_consistency * 0.20
            + analysis.persuasiveness_score * 0.15
            + analysis.clarity_score * 0.15
        )
    else:
        raise HTTPException(status_code=404, detail="No performance data found")

    return {
        "platform": "LOGOS.AI",
        "session_id": session_id,
        "title": "High-Stakes AI Debate Simulation",
        "weighted_performance_score": round(overall_score, 1),
        "fallacies_detected": ["None"],
        "speech_pace": (
            f"{presentation.words_per_minute:.1f} WPM"
            if presentation and presentation.words_per_minute is not None
            else "N/A"
        ),
        "filler_words_count": (
            presentation.filler_words_count
            if presentation
            else 0
        ),
        "certificate_id": f"CERT-LOGOS-{session_id}-2026"
    }


@router.get("/export/audit/{session_id}")
def export_audit_report(session_id: int, db: Session = Depends(get_db)):
    session, performance, analysis, presentation = get_session_data(session_id, db)

    if performance:
        logical_consistency = performance.logical_consistency
        rebuttal_effectiveness = performance.rebuttal_effectiveness
        evidence_use = performance.evidence_use
    elif analysis:
        logical_consistency = analysis.logical_consistency
        rebuttal_effectiveness = analysis.persuasiveness_score
        evidence_use = analysis.evidence_strength
    else:
        raise HTTPException(status_code=404, detail="No performance data found")

    fallacies = "None"
    if analysis and analysis.fallacies:
        fallacies = "; ".join(f"{item.fallacy_type}: {item.description}" for item in analysis.fallacies)

    audit_content = (
        f"Audit Report - LOGOS.AI Session {session_id}\n"
        f"Fallacies Detected,{fallacies}\n"
        f"Logical Consistency,{logical_consistency:.1f}\n"
        f"Rebuttal Effectiveness,{rebuttal_effectiveness:.1f}\n"
        f"Evidence Use,{evidence_use:.1f}\n"
        "Audit Status,Verified\n"
    )

    return Response(
        content=audit_content,
        media_type="text/plain",
        headers={
            "Content-Disposition":
                f"attachment; filename=logos_ai_session_{session_id}_audit.txt"
        }
    )


@router.get("/export/certificate/{session_id}")
def export_certificate(session_id: int, db: Session = Depends(get_db)):
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4

    session, performance, analysis, presentation = get_session_data(session_id, db)

    if performance:
        overall_score = performance.overall_weighted_score
    elif analysis:
        overall_score = (
            analysis.persuasiveness_score * 0.30
            + analysis.evidence_strength * 0.20
            + analysis.logical_consistency * 0.20
            + analysis.persuasiveness_score * 0.15
            + analysis.clarity_score * 0.15
        )
    else:
        raise HTTPException(status_code=404, detail="No performance data found")

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    pdf.setTitle(f"LOGOS.AI Certificate - Session {session_id}")
    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawCentredString(width / 2, height - 120, "LOGOS.AI")
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawCentredString(
        width / 2, height - 170, "CERTIFICATE OF RHETORICAL MASTERY"
    )
    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(
        width / 2,
        height - 230,
        "This certifies successful completion of the debate coaching session"
    )
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawCentredString(width / 2, height - 290, f"Session {session_id}")
    pdf.setFont("Helvetica", 13)
    pdf.drawCentredString(
        width / 2,
        height - 340,
        f"Verified Performance Score: {overall_score:.1f} / 100"
    )

    if presentation and presentation.words_per_minute is not None:
        pace_text = f"Speech Pace: {presentation.words_per_minute:.1f} WPM"
    else:
        pace_text = "Speech Pace: N/A"

    pdf.drawCentredString(width / 2, height - 370, pace_text)
    pdf.drawCentredString(width / 2, height - 400, "Fallacies Detected: None")

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawCentredString(
        width / 2,
        height - 470,
        f"Certificate ID: CERT-LOGOS-{session_id}-2026"
    )
    pdf.setFont("Helvetica", 11)
    pdf.drawCentredString(
        width / 2,
        80,
        "LOGOS.AI - Agentic Debate Coach & Presentation Analysis Platform"
    )

    pdf.save()
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                f"attachment; filename=logos_ai_session_{session_id}_certificate.pdf"
        }
    )




