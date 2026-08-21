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
