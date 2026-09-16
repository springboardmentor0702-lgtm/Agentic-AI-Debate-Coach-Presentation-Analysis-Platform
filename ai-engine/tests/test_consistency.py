"""
Real consistency test — runs the same argument through Agent 4 (Argument
Analysis) 5 times against the actual Gemini API and checks that scores
don't swing wildly run to run. This makes REAL API calls (uses real
quota) — that's intentional, a mocked test would tell us nothing about
whether the actual scoring prompt is stable.

Run from the ai-engine/ directory:
    python -m pytest tests/ -v
"""
import statistics
import pytest

from app.services.argument_analysis import analyze_argument_quality
from app.services.fallacy_agent import analyze_argument

RUNS = 5

# A real, moderately complex argument — long enough that scoring has
# genuine room to vary, short enough to keep the test fast/cheap.
SAMPLE_ARGUMENT = (
    "Schools should make financial literacy a mandatory subject. Studies show "
    "most adults struggle with budgeting and debt, and this stems from a lack "
    "of early education on the topic. If students learned about compound "
    "interest, credit scores, and basic budgeting in high school, they would "
    "be far better prepared for real financial decisions as adults. Critics "
    "argue the curriculum is already full, but financial literacy could "
    "easily replace a semester of an elective without harming core academics."
)

# Score variance threshold — a swing larger than this on the SAME input
# would mean the scoring prompt isn't reliable enough to trust for grading.
MAX_ALLOWED_STDEV = 15


@pytest.mark.asyncio
async def test_argument_analysis_score_consistency():
    scores_per_run = []
    for _ in range(RUNS):
        result = await analyze_argument_quality(SAMPLE_ARGUMENT)
        scores_per_run.append([
            result.clarity_score,
            result.relevance_score,
            result.evidence_strength_score,
            result.logical_consistency_score,
            result.persuasiveness_score,
        ])

    # Check consistency per-criterion (5 runs of each of the 5 scores)
    for i, criterion in enumerate(["clarity", "relevance", "evidence_strength", "logical_consistency", "persuasiveness"]):
        values = [run[i] for run in scores_per_run]
        stdev = statistics.stdev(values)
        assert stdev <= MAX_ALLOWED_STDEV, (
            f"{criterion}_score varied too much across {RUNS} runs on the same "
            f"input: {values} (stdev={stdev:.1f}, allowed<={MAX_ALLOWED_STDEV})"
        )


@pytest.mark.asyncio
async def test_fallacy_detection_consistency():
    """A clean, fallacy-free argument should be judged fallacy-free consistently."""
    detections = []
    for _ in range(RUNS):
        result = await analyze_argument(SAMPLE_ARGUMENT, difficulty="Intermediate")
        detections.append(result.fallacy_detected)

    flagged_count = sum(detections)
    assert flagged_count <= 1, (
        f"Fallacy-free argument was flagged as containing a fallacy in "
        f"{flagged_count}/{RUNS} runs — detection isn't consistent enough."
    )
