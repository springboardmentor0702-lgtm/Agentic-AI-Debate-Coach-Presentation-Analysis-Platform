def test_weighted_scoring_model(client, test_user):
    payload = {
        "argument_quality": 80.0,
        "evidence_usage": 70.0,
        "logical_consistency": 90.0,
        "rebuttal_effectiveness": 60.0,
        "communication_skills": 80.0
    }
    # Expected calculation:
    # 80 * 0.30 = 24.0
    # 70 * 0.20 = 14.0
    # 90 * 0.20 = 18.0
    # 60 * 0.15 = 9.0
    # 80 * 0.15 = 12.0
    # Total = 24 + 14 + 18 + 9 + 12 = 77.0

    response = client.post(
        "/api/scoring",
        json=payload,
        headers=test_user["headers"]
    )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_score"] == 77.0
    assert "breakdown" in data
    assert data["weights"]["argument_quality"] == 30
    assert data["weights"]["evidence_usage"] == 20
    assert data["weights"]["logical_consistency"] == 20
    assert data["weights"]["rebuttal_effectiveness"] == 15
    assert data["weights"]["communication_skills"] == 15
    assert "Proficient" in data["performance_level"] or "Strong" in data["performance_level"]


def test_scoring_clamping(client, test_user):
    payload = {
        "argument_quality": 150.0,  # Clamped to 100
        "evidence_usage": -20.0,    # Clamped to 0
        "logical_consistency": 100.0,
        "rebuttal_effectiveness": 100.0,
        "communication_skills": 100.0
    }
    # 100*0.30 + 0*0.20 + 100*0.20 + 100*0.15 + 100*0.15 = 30 + 0 + 20 + 15 + 15 = 80.0
    response = client.post(
        "/api/scoring",
        json=payload,
        headers=test_user["headers"]
    )
    assert response.status_code == 200
    data = response.json()
    assert data["overall_score"] == 80.0
