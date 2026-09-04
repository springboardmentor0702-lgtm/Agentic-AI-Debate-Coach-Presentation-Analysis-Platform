"""
Reports & Export endpoints (spec section 13).
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response

from app.core import supabase_client
from app.core.security import get_current_user, require_role
from app.services.report_service import (
    build_class_report_pdf,
    build_item_pdf,
    build_progress_excel,
    build_progress_pdf,
    build_roster_report_pdf,
)

router = APIRouter(prefix="/reports", tags=["reports"])

# tool (matches the frontend route names) -> (table, human label)
ITEM_REPORT_SOURCES = {
    "arguments": ("argument_analyses", "Argument Analysis"),
    "fallacies": ("fallacy_detections", "Fallacy Detection"),
    "counterarguments": ("counterarguments", "Counterarguments"),
    "case-review": ("case_reviews", "Full Case Review"),
    "presentation": ("presentation_analyses", "Presentation Analysis"),
    "coaching": ("coaching_plans", "Coaching Plan"),
}


@router.get("/progress/pdf")
def progress_pdf(user: dict = Depends(get_current_user)):
    try:
        pdf_bytes = build_progress_pdf(user["profile"]["id"], user["profile"]["full_name"])
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Could not generate the PDF report: {e}")

    filename = f"progress-report-{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/progress/excel")
def progress_excel(user: dict = Depends(get_current_user)):
    try:
        excel_bytes = build_progress_excel(user["profile"]["id"], user["profile"]["full_name"])
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Could not generate the Excel report: {e}")

    filename = f"progress-report-{datetime.now(timezone.utc).strftime('%Y%m%d')}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/class/pdf")
async def class_pdf(user: dict = Depends(require_role("debate_coach", "educator", "admin"))):
    """
    Segment 20: every learner on the platform, ranked, in one export -
    the coach/educator-level counterpart to /progress/pdf.
    """
    try:
        pdf_bytes = await build_class_report_pdf(user["profile"]["full_name"])
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Could not generate the class report: {e}")

    filename = f"class-report-{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/classes/{class_id}/pdf")
async def specific_class_pdf(
    class_id: str, user: dict = Depends(require_role("debate_coach", "educator", "admin"))
):
    """
    Segment 21: the same report, scoped to one specific class's roster
    instead of every learner on the platform.
    """
    params = {"id": f"eq.{class_id}"}
    if user["profile"]["role"] != "admin":
        params["created_by"] = f"eq.{user['profile']['id']}"
    matches = supabase_client.db_select("classes", params=params)
    if not matches:
        raise HTTPException(status_code=404, detail="Class not found.")

    from app.services.class_service import get_class_roster

    try:
        roster = await get_class_roster(class_id)
        pdf_bytes = build_roster_report_pdf(
            user["profile"]["full_name"], roster, f"Class Report — {matches[0]['name']}"
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Could not generate the class report: {e}")

    filename = f"class-report-{class_id[:8]}-{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/item/{tool}/{item_id}/pdf")
def item_pdf(tool: str, item_id: str, user: dict = Depends(get_current_user)):
    """
    A report for exactly ONE past analysis or session - the
    "Session Summaries" / "Feedback and Learning Reports" spec items,
    as opposed to /progress which aggregates everything.
    """
    user_id = user["profile"]["id"]

    if tool == "debates":
        sessions = supabase_client.db_select(
            "debate_sessions",
            params={"id": f"eq.{item_id}", "user_id": f"eq.{user_id}", "select": "*"},
        )
        if not sessions:
            raise HTTPException(status_code=404, detail="Debate session not found.")
        rounds = supabase_client.db_select(
            "debate_rounds",
            params={
                "session_id": f"eq.{item_id}",
                "select": "*",
                "order": "round_number.asc",
            },
        )
        item = {**sessions[0], "rounds": rounds}
        tool_label = "Debate Session"

    elif tool in ITEM_REPORT_SOURCES:
        table, tool_label = ITEM_REPORT_SOURCES[tool]
        rows = supabase_client.db_select(
            table,
            params={"id": f"eq.{item_id}", "user_id": f"eq.{user_id}", "select": "*"},
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Item not found.")
        item = rows[0]

    else:
        raise HTTPException(status_code=404, detail="Unknown report type.")

    try:
        pdf_bytes = build_item_pdf(tool_label, item, user["profile"]["full_name"])
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Could not generate the report: {e}")

    filename = f"{tool_label.lower().replace(' ', '-')}-{item_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
