def test_list_reports(client, test_user):
    response = client.get("/api/reports", headers=test_user["headers"])
    assert response.status_code == 200
    reports = response.json()
    assert isinstance(reports, list)
    assert len(reports) > 0


def test_export_pdf_and_excel(client, test_user):
    # PDF export
    pdf_res = client.get("/api/reports/debate/1/export/pdf", headers=test_user["headers"])
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 0

    # Excel/CSV export
    excel_res = client.get("/api/reports/debate/1/export/excel", headers=test_user["headers"])
    assert excel_res.status_code == 200
    assert "spreadsheet" in excel_res.headers["content-type"] or "csv" in excel_res.headers["content-type"]
    assert len(excel_res.content) > 0


def test_notifications_flow(client, test_user):
    response = client.get("/api/notifications", headers=test_user["headers"])
    assert response.status_code == 200
    notifications = response.json()
    assert len(notifications) > 0

    notif_id = notifications[0]["id"]
    read_res = client.post(f"/api/notifications/{notif_id}/read", headers=test_user["headers"])
    assert read_res.status_code == 200
    assert read_res.json()["message"] == "Notification marked as read"
