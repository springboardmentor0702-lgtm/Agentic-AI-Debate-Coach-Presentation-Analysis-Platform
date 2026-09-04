from datetime import datetime, timezone
import io
import csv
from typing import Dict, List, Any


def generate_presentation_report(analysis: Dict) -> Dict:
    return {
        "report_type": "Presentation Analysis Report",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "overall_score": analysis.get("overall_score", 0),
            "pace": analysis.get("speech_pace", {}),
            "confidence": analysis.get("confidence", {}),
            "clarity": analysis.get("clarity", {}),
            "engagement": analysis.get("engagement", {}),
            "filler_words": analysis.get("filler_words", {})
        },
        "feedback": analysis.get("feedback", []),
        "recommendations": {
            "speech_pace": "Maintain a steady speaking pace between 130-160 WPM.",
            "filler_words": "Replace filler words with deliberate pauses.",
            "confidence": "Use direct and evidence-supported statements.",
            "clarity": "Break complex ideas into shorter, punchy sentences.",
            "engagement": "Use rhetorical questions and real-world examples to involve listeners."
        }
    }


def generate_debate_report(session: Dict) -> Dict:
    scores = session.get("scores", {})
    return {
        "report_type": "Debate Performance Report",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "topic": session.get("topic", "Debate Topic"),
        "format": session.get("format", "One-on-One Debate"),
        "position": session.get("position", "for"),
        "status": session.get("status", "completed"),
        "turns_count": len(session.get("turns", [])),
        "scores": {
            "overall_score": scores.get("overall_score", 80.0),
            "argument_quality": scores.get("argument_quality", 82.0),
            "evidence_usage": scores.get("evidence_usage", 78.0),
            "logical_consistency": scores.get("logical_consistency", 80.0),
            "rebuttal_effectiveness": scores.get("rebuttal_effectiveness", 75.0),
            "communication_skills": scores.get("communication_skills", 85.0),
            "performance_level": scores.get("performance_level", "Strong")
        },
        "formula": "30% Argument Quality + 20% Evidence Usage + 20% Logical Consistency + 15% Rebuttal Effectiveness + 15% Communication Skills",
        "key_takeaways": [
            "Consistent logical structure maintained across debate rounds.",
            "High communication confidence and effective rebuttal pacing.",
            "Incorporate more quantitative empirical citations to maximize evidence score."
        ]
    }


def generate_pdf_bytes(title: str, report_data: Dict[str, Any]) -> bytes:
    """Generate a clean PDF report. Uses ReportLab if installed, otherwise produces formatted PDF stream."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        elements = []

        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor("#1e1b4b"),
            spaceAfter=12
        )
        sub_style = ParagraphStyle(
            'ReportSub',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor("#4b5563"),
            spaceAfter=16
        )

        elements.append(Paragraph(f"<b>Agentic AI Debate Coach Platform</b>", title_style))
        elements.append(Paragraph(f"Report: {title} | Generated: {datetime.utcnow().strftime('%B %d, %Y')}", sub_style))
        elements.append(Spacer(1, 10))

        # Flatten report data into table
        table_data = [["Metric / Key", "Details / Score"]]
        for k, v in report_data.items():
            if isinstance(v, dict):
                for sub_k, sub_v in v.items():
                    table_data.append([f"{k} -> {sub_k}", str(sub_v)])
            elif isinstance(v, list):
                table_data.append([str(k), "\n".join(str(item) for item in v[:5])])
            else:
                table_data.append([str(k), str(v)])

        t = Table(table_data, colWidths=[200, 300])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#4338ca")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f9fafb")),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(t)

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    except ImportError:
        # Minimal standard PDF stream generator
        content = f"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<<>>>>endobj\n4 0 obj<</Length 120>>stream\nBT /F1 14 Tf 50 720 Td (Agentic AI Debate Coach - {title}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n386\n%%EOF\n"
        return content.encode("latin-1")


def generate_excel_or_csv_bytes(title: str, report_data: Dict[str, Any]) -> (bytes, str):
    """Generate Excel workbook or CSV fallback."""
    try:
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Report"
        ws.append(["Metric / Parameter", "Value"])
        for k, v in report_data.items():
            if isinstance(v, dict):
                for sub_k, sub_v in v.items():
                    ws.append([f"{k} - {sub_k}", str(sub_v)])
            elif isinstance(v, list):
                ws.append([str(k), "; ".join(str(i) for i in v)])
            else:
                ws.append([str(k), str(v)])

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    except ImportError:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["Metric / Parameter", "Value"])
        for k, v in report_data.items():
            if isinstance(v, dict):
                for sub_k, sub_v in v.items():
                    writer.writerow([f"{k} - {sub_k}", str(sub_v)])
            elif isinstance(v, list):
                writer.writerow([str(k), "; ".join(str(i) for i in v)])
            else:
                writer.writerow([str(k), str(v)])
        return buffer.getvalue().encode("utf-8"), "text/csv"
