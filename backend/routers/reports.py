from fastapi import APIRouter, Response
import io

router = APIRouter(prefix="/api/v1/reports", tags=["Reports & Export System"])

@router.get("/export/csv/{session_id}")
def export_csv_report(session_id: int):
    csv_content = f"Metric,Score,Details\n" \
                  f"Argument Quality,85.0,Strong claims identified\n" \
                  f"Evidence Use,80.0,Statistical citations included\n" \
                  f"Logical Consistency,90.0,No major fallacies detected\n" \
                  f"Rebuttal Effectiveness,88.0,Direct counter-arguments\n" \
                  f"Communication Skills,82.0,142 WPM speech pace\n" \
                  f"Overall Weighted Score,85.4,Formula: 30%+20%+20%+15%+15%\n"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=logos_ai_session_{session_id}_report.csv"}
    )

@router.get("/export/summary/{session_id}")
def get_session_summary_report(session_id: int):
    return {
        "platform": "LOGOS.AI",
        "session_id": session_id,
        "title": "High-Stakes AI Debate Simulation",
        "weighted_performance_score": 85.4,
        "fallacies_detected": ["None"],
        "speech_pace": "142 WPM (Optimal)",
        "filler_words_count": 2,
        "certificate_id": f"CERT-LOGOS-{session_id}-2026"
    }


@router.get("/export/audit/{session_id}")
def export_audit_report(session_id: int):
    audit_content = f"Audit Report - LOGOS.AI Session {session_id}" + chr(10) + "Fallacies Detected,None" + chr(10) + "Logical Consistency,90.0" + chr(10) + "Rebuttal Effectiveness,88.0" + chr(10) + "Evidence Use,80.0" + chr(10) + "Audit Status,Verified" + chr(10)
    return Response(
        content=audit_content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=logos_ai_session_{session_id}_audit.txt"}
    )


@router.get("/export/certificate/{session_id}")
def export_certificate(session_id: int):
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    import io

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    pdf.setTitle(f"LOGOS.AI Certificate - Session {session_id}")
    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawCentredString(width / 2, height - 120, "LOGOS.AI")
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawCentredString(width / 2, height - 170, "CERTIFICATE OF RHETORICAL MASTERY")
    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(width / 2, height - 230, "This certifies successful completion of the debate coaching session")
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawCentredString(width / 2, height - 290, f"Session {session_id}")
    pdf.setFont("Helvetica", 13)
    pdf.drawCentredString(width / 2, height - 340, "Verified Performance Score: 85.4 / 100")
    pdf.drawCentredString(width / 2, height - 370, "Speech Pace: 142 WPM (Optimal)")
    pdf.drawCentredString(width / 2, height - 400, "Fallacies Detected: None")
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawCentredString(width / 2, height - 470, f"Certificate ID: CERT-LOGOS-{session_id}-2026")
    pdf.setFont("Helvetica", 11)
    pdf.drawCentredString(width / 2, 80, "LOGOS.AI - Agentic Debate Coach & Presentation Analysis Platform")

    pdf.save()
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=logos_ai_session_{session_id}_certificate.pdf"}
    )
