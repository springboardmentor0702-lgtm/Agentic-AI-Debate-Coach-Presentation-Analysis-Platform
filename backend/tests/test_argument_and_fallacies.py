from services.ai_engine import analyze_argument, FALLACIES


def test_argument_analysis_criteria(client, test_user):
    text = (
        "We should invest in solar energy because a 2024 university study shows "
        "that solar panel efficiency increased by 35 percent. Therefore, adopting "
        "solar infrastructure reduces long-term operational costs."
    )
    response = client.post(
        "/api/analysis/argument",
        json={"text": text, "topic": "Solar Energy"},
        headers=test_user["headers"]
    )
    assert response.status_code == 200
    data = response.json()

    # Verify 5 evaluation criteria
    evaluation = data["evaluation"]
    assert "clarity" in evaluation
    assert "relevance" in evaluation
    assert "evidence_strength" in evaluation
    assert "logical_consistency" in evaluation
    assert "persuasiveness" in evaluation
    assert data["argument_score"] > 0
    assert len(data["claims"]) > 0


def test_fallacy_ad_hominem(client, test_user):
    text = "You are an ignorant idiot who knows nothing about economics."
    response = client.post(
        "/api/analysis/argument",
        json={"text": text, "topic": "Economics"},
        headers=test_user["headers"]
    )
    assert response.status_code == 200
    fallacies = [f["name"] for f in response.json()["fallacies"]]
    assert "Ad Hominem" in fallacies


def test_fallacy_straw_man(client, test_user):
    text = "So you are saying we should let all criminals roam free on the streets."
    response = client.post(
        "/api/analysis/argument",
        json={"text": text, "topic": "Justice"},
        headers=test_user["headers"]
    )
    assert response.status_code == 200
    fallacies = [f["name"] for f in response.json()["fallacies"]]
    assert "Straw Man" in fallacies


def test_fallacy_false_dilemma(client, test_user):
    text = "Either we ban all social media or our youth will have no future."
    response = client.post(
        "/api/analysis/argument",
        json={"text": text, "topic": "Social Media"},
        headers=test_user["headers"]
    )
    assert response.status_code == 200
    fallacies = [f["name"] for f in response.json()["fallacies"]]
    assert "False Dilemma" in fallacies


def test_all_eight_fallacies_supported():
    expected = {
        "ad_hominem",
        "straw_man",
        "false_dilemma",
        "slippery_slope",
        "appeal_to_authority",
        "circular_reasoning",
        "hasty_generalization",
        "red_herring"
    }
    assert set(FALLACIES.keys()) == expected
    for key, val in FALLACIES.items():
        assert "name" in val
        assert "explanation" in val
        assert "correction" in val
