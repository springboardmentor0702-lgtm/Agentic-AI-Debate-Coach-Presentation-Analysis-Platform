def test_debate_formats(client):
    response = client.get("/api/sessions/formats")
    assert response.status_code == 200
    formats = [f["name"] for f in response.json()["formats"]]
    assert "One-on-One Debate" in formats
    assert "Parliamentary Debate" in formats
    assert "Oxford Debate" in formats
    assert "Policy Debate" in formats
    assert "Public Forum Debate" in formats
    assert "AI Debate Simulation" in formats


def test_simulation_flow(client, test_user):
    # 1. Get personas
    response = client.get("/api/simulation/personas", headers=test_user["headers"])
    assert response.status_code == 200
    assert "personas" in response.json()

    # 2. Start simulation
    start_payload = {
        "topic": "Universal Basic Income",
        "position": "for",
        "persona": "skeptical"
    }
    response = client.post("/api/simulation/start", json=start_payload, headers=test_user["headers"])
    assert response.status_code == 200
    start_data = response.json()
    assert start_data["simulation_started"] is True
    assert "opening_statement" in start_data

    # 3. Next turn
    turn_payload = {
        "topic": "Universal Basic Income",
        "user_argument": "UBI guarantees that displaced workers have a safety net while they reskill.",
        "persona": "skeptical",
        "turn_number": 1
    }
    response = client.post("/api/simulation/turn", json=turn_payload, headers=test_user["headers"])
    assert response.status_code == 200
    turn_data = response.json()
    assert "ai_response" in turn_data
    assert "coach_feedback" in turn_data

    # 4. Summary
    summary_payload = {
        "messages": [
            {"role": "user", "content": "UBI guarantees financial security."},
            {"role": "ai", "content": "How would the government fund such a massive trillion dollar initiative?"}
        ]
    }
    response = client.post("/api/simulation/summary", json=summary_payload, headers=test_user["headers"])
    assert response.status_code == 200
    summary_data = response.json()
    assert "overview" in summary_data
    assert "strengths" in summary_data
    assert "improvements" in summary_data
