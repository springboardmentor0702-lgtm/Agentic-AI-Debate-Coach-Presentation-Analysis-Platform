import os
import csv
from datetime import datetime
from typing import Dict, Any, List
import pandas as pd
from ..config import settings

class ExportReportingEngine:
    """
    Export & Reporting Engine.
    Generates downloadable PDF dossiers and CSV/Excel spreadsheets
    for Debates, Presentations, Performance Audits, and Cohort Progress.
    """

    def generate_pdf_report(self, report_type: str, data: Dict[str, Any], output_filename: str) -> str:
        filepath = os.path.join(settings.EXPORTS_DIR, output_filename)
        
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors

            doc = SimpleDocTemplate(filepath, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
            styles = getSampleStyleSheet()
            
            title_style = ParagraphStyle(
                'DocTitle',
                parent=styles['Heading1'],
                fontSize=22,
                leading=26,
                textColor=colors.HexColor('#1E293B'),
                spaceAfter=6
            )
            subtitle_style = ParagraphStyle(
                'DocSubtitle',
                parent=styles['Normal'],
                fontSize=11,
                leading=14,
                textColor=colors.HexColor('#64748B'),
                spaceAfter=15
            )
            section_style = ParagraphStyle(
                'DocSection',
                parent=styles['Heading2'],
                fontSize=14,
                leading=18,
                textColor=colors.HexColor('#0F172A'),
                spaceBefore=12,
                spaceAfter=6
            )
            body_style = ParagraphStyle(
                'DocBody',
                parent=styles['Normal'],
                fontSize=10,
                leading=14,
                textColor=colors.HexColor('#334155')
            )
            meta_key_style = ParagraphStyle(
                'MetaKey',
                parent=styles['Normal'],
                fontSize=9,
                leading=12,
                fontName='Helvetica-Bold',
                textColor=colors.HexColor('#475569')
            )

            story = []

            # Header
            story.append(Paragraph("AGENTIC AI DEBATE COACH & PRESENTATION ANALYSIS", subtitle_style))
            story.append(Paragraph(f"Official Performance Dossier: {report_type.upper()}", title_style))
            story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Platform Version 1.0.0", subtitle_style))
            story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3B82F6'), spaceAfter=15))

            # Metadata Table
            meta_rows = [
                [Paragraph("Session/Record Title", meta_key_style), Paragraph(str(data.get("title", "N/A")), body_style)],
                [Paragraph("User / Debater", meta_key_style), Paragraph(str(data.get("user_name", "N/A")), body_style)],
                [Paragraph("Format / Category", meta_key_style), Paragraph(str(data.get("format", data.get("category", "Debate"))), body_style)],
                [Paragraph("Date Completed", meta_key_style), Paragraph(str(data.get("date", datetime.utcnow().strftime('%Y-%m-%d'))), body_style)],
            ]
            meta_table = Table(meta_rows, colWidths=[150, 380])
            meta_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(meta_table)
            story.append(Spacer(1, 15))

            # Performance Scores (if available)
            if "scores" in data:
                story.append(Paragraph("Weighted Performance Evaluation", section_style))
                score_data = data["scores"]
                score_rows = [
                    [Paragraph("Evaluation Dimension", meta_key_style), Paragraph("Weight", meta_key_style), Paragraph("Score", meta_key_style)]
                ]
                metrics = [
                    ("Argument Quality", "30%", score_data.get("argument_quality", 0)),
                    ("Evidence Usage", "20%", score_data.get("evidence_usage", 0)),
                    ("Logical Consistency", "20%", score_data.get("logical_consistency", 0)),
                    ("Rebuttal Effectiveness", "15%", score_data.get("rebuttal_effectiveness", 0)),
                    ("Communication Skills", "15%", score_data.get("communication_skills", 0)),
                ]
                for name, weight, val in metrics:
                    score_rows.append([Paragraph(name, body_style), Paragraph(weight, body_style), Paragraph(f"{val:.1f} / 100", body_style)])

                overall_val = score_data.get("overall_score", 0)
                grade_val = score_data.get("grade", "N/A")
                score_rows.append([Paragraph("FINAL WEIGHTED COMPOSITE", meta_key_style), Paragraph("100%", meta_key_style), Paragraph(f"<b>{overall_val:.1f}% ({grade_val})</b>", body_style)])

                score_table = Table(score_rows, colWidths=[240, 100, 190])
                score_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EEF2F6')),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#FAFAFA')]),
                    ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#EFF6FF')),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ]))
                story.append(score_table)
                story.append(Spacer(1, 15))

            # Speech metrics (if presentation)
            if "speech_metrics" in data:
                story.append(Paragraph("Speech & Delivery Metrics", section_style))
                sm = data["speech_metrics"]
                speech_rows = [
                    [Paragraph("Metric", meta_key_style), Paragraph("Value", meta_key_style), Paragraph("Benchmark Status", meta_key_style)],
                    [Paragraph("Speaking Pace (WPM)", body_style), Paragraph(f"{sm.get('wpm', 0)} WPM", body_style), Paragraph(sm.get("pace_status", "Optimal"), body_style)],
                    [Paragraph("Filler Words Count", body_style), Paragraph(str(sm.get("filler_count", 0)), body_style), Paragraph("Vocal bridge penalty", body_style)],
                    [Paragraph("Confidence Score", body_style), Paragraph(f"{sm.get('confidence', 0):.1f}%", body_style), Paragraph("Lexical certainty", body_style)],
                    [Paragraph("Clarity Score", body_style), Paragraph(f"{sm.get('clarity', 0):.1f}%", body_style), Paragraph("Syntactic coherence", body_style)],
                    [Paragraph("Audience Engagement", body_style), Paragraph(f"{sm.get('engagement', 0):.1f}%", body_style), Paragraph("Rhetorical markers", body_style)],
                ]
                sp_table = Table(speech_rows, colWidths=[180, 140, 210])
                sp_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ]))
                story.append(sp_table)
                story.append(Spacer(1, 15))

            # Feedback & Recommendations
            if "feedback" in data:
                story.append(Paragraph("Adjudication Feedback & Coaching Recommendations", section_style))
                story.append(Paragraph(data["feedback"], body_style))
                story.append(Spacer(1, 10))

            doc.build(story)
            return filepath

        except Exception as e:
            # Simple text fallback if PDF generator encounters missing font or library issue
            with open(filepath.replace(".pdf", ".txt"), "w", encoding="utf-8") as f:
                f.write(f"AGENTIC AI DEBATE COACH REPORT: {report_type}\n")
                f.write(f"Date: {datetime.utcnow()}\n")
                f.write(f"Data: {data}\n")
            return filepath.replace(".pdf", ".txt")

    def generate_csv_report(self, records: List[Dict[str, Any]], output_filename: str) -> str:
        filepath = os.path.join(settings.EXPORTS_DIR, output_filename)
        df = pd.DataFrame(records)
        df.to_csv(filepath, index=False)
        return filepath

    def generate_excel_report(self, records: List[Dict[str, Any]], output_filename: str) -> str:
        filepath = os.path.join(settings.EXPORTS_DIR, output_filename)
        df = pd.DataFrame(records)
        df.to_excel(filepath, index=False, engine="openpyxl")
        return filepath

export_engine = ExportReportingEngine()
