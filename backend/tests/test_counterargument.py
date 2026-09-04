import pytest


@pytest.mark.parametrize("counter_type", [
    "logical",
    "evidence",
    "ethical",
    "practical",
    "policy"
])
def test_counterargument_generation_types(client, test_user, counter_type):
    payload = {
        "argument": "Autonomous vehicles must be mandatory on all public highways immediately.",
        "topic": "Autonomous Vehicles",
        "counter_type": counter_type
    }
    response = client.post(
        "/api/counterargument/generate",
        json=payload,
        headers=test_user["headers"]
    )
    assert response.status_code == 200
    data = response.json()
    assert "counterargument" in data
    assert "strategy" in data
    assert "challenge_question" in data
    assert data["counter_type"] == counter_type
