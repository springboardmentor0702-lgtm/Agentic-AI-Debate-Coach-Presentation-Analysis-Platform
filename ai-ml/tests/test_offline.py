"""Offline regression tests for the standalone AI/ML agents."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["AI_ML_MODE"] = "local"

from app.agents.argument_analysis_agent import argument_analysis_agent
from app.agents.fallacy_detection_agent import fallacy_detection_agent


@pytest.mark.parametrize(
    ("expected", "text"),
    [
        ("Ad Hominem", "You cannot trust her climate opinion because she did not study economics."),
        ("Straw Man", "My opponent wants better school funding, which means they want to bankrupt every taxpayer."),
        ("False Dilemma", "Either we ban all cars immediately or the planet is doomed."),
        ("Slippery Slope", "If we allow one exam redo, soon nobody will study and the system will collapse."),
        ("Appeal to Authority", "This diet must be healthy because a famous actor said he uses it."),
        ("Circular Reasoning", "The policy is correct because it is right, and it is right because it is correct."),
        ("Hasty Generalization", "One dog bit someone, so all dogs of that breed must be dangerous."),
        ("Red Herring", "Why worry about pollution when we should discuss the success of the new phone launch?"),
    ],
)
def test_local_fallacy_detection(expected: str, text: str) -> None:
    result = fallacy_detection_agent.run(text)
    found = {item["type"] for item in result["fallacies_found"]}
    assert expected in found


def test_local_clean_argument_has_no_fallacy() -> None:
    result = fallacy_detection_agent.run(
        "Renewable energy adoption increased according to national grid data, and costs declined in those regions."
    )
    assert result["fallacies_found"] == []
    assert result["status"] == "no_clear_fallacies_detected"


@pytest.mark.parametrize("text", ["", "Yes.", "   "])
def test_agents_handle_short_input(text: str) -> None:
    analysis = argument_analysis_agent.run(text)
    fallacies = fallacy_detection_agent.run(text)
    assert set(analysis) == {
        "claim", "evidence", "strength_label", "strength_score", "clarity_score",
        "relevance_score", "logical_consistency_score", "notes",
    }
    assert fallacies["fallacies_found"] == []


def test_local_argument_analysis_contract() -> None:
    result = argument_analysis_agent.run(
        "Public transit should receive more funding because city data shows it reduces congestion and emissions."
    )
    assert result["claim"]
    assert result["evidence"]
    assert result["strength_label"] in {"weak", "moderate", "strong"}
    for field in ("strength_score", "clarity_score", "relevance_score", "logical_consistency_score"):
        assert 0 <= result[field] <= 100
