import os

from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"

from app.main import create_app


def test_health_check_uses_database_dependency_override():
    app = create_app()

    def fake_get_db():
        class FakeDb:
            def execute(self, _statement):
                return None

        yield FakeDb()

    from app.api.v1.health import get_db

    app.dependency_overrides[get_db] = fake_get_db
    client = TestClient(app)

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
