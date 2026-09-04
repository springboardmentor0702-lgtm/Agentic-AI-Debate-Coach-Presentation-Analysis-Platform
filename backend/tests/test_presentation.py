def test_presentation_analysis(client, test_user):
    transcript = (
        "Good morning ladies and gentlemen. Today I will present three compelling reasons why "
        "sustainable technology drives economic growth. First, data indicates that green energy "
        "reduces operational expenditures by over 20 percent. Um, basically, we also observe higher "
        "job creation in clean tech manufacturing. Therefore, we should accelerate investments now."
    )
    payload = {
        "transcript": transcript,
        "duration_seconds": 60.0
    }
    response = client.post(
        "/api/presentation/analyze",
        json=payload,
        headers=test_user["headers"]
    )
    assert response.status_code == 200
    data = response.json()
    assert "overall_score" in data
    assert "speech_pace" in data
    assert "filler_words" in data
    assert "confidence" in data
    assert "clarity" in data
    assert "engagement" in data
    assert "feedback" in data


def test_presentation_history(client, test_user):
    response = client.get(
        "/api/presentation/history",
        headers=test_user["headers"]
    )
    assert response.status_code == 200
    data = response.json()
    assert "count" in data
    assert "results" in data
