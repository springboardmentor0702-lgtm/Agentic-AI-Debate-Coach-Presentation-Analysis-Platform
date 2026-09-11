import os
import uuid

os.environ["POSTGRES_URL"] = "sqlite:///./test_api.db"
os.environ["SECRET_KEY"] = "test-secret"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)
EMAIL = f"test_{uuid.uuid4().hex[:8]}@example.com"
PASS = "pass1234"


def _register_and_login():
    client.post("/api/auth/register",
                json={"email": EMAIL, "password": PASS, "full_name": "Tester"})
    r = client.post("/api/auth/login", data={"username": EMAIL, "password": PASS})
    assert r.status_code == 200
    return r.json()["access_token"]


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_register_login_me():
    token = _register_and_login()
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == EMAIL


def test_full_debate_flow_with_notifications_and_exports():
    token = _register_and_login()
    h = {"Authorization": f"Bearer {token}"}
    s = client.post("/api/sessions", headers=h,
                    json={"topic_title": "Testing beats documentation",
                          "format": "ai_simulation", "position": "pro"}).json()
    assert "id" in s
    sid = s["id"]
    r = client.post(f"/api/sessions/{sid}/turns", headers=h,
                    json={"content": "Therefore, studies show that testing data reduces bugs. "
                                      "According to research, teams ship faster."})
    assert r.status_code == 200
    assert r.json()["ai_response"]
    ev = client.post(f"/api/analysis/sessions/{sid}/evaluate", headers=h)
    assert ev.status_code == 200
    assert ev.json()["scores"]["overall_score"] >= 0
    rep = client.get(f"/api/analysis/reports/{sid}", headers=h)
    assert rep.status_code == 200
    pdf = client.get(f"/api/analysis/reports/{sid}/export/pdf", headers=h)
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    xls = client.get(f"/api/analysis/reports/{sid}/export/xlsx", headers=h)
    assert xls.status_code == 200
    notifs = client.get("/api/notifications", headers=h)
    assert notifs.status_code == 200
    assert notifs.json()["unread_count"] >= 1


def test_role_guard_blocks_learner_from_admin():
    token = _register_and_login()
    r = client.get("/api/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403
