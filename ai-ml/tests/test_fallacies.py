"""
Test cases for Argument Analysis Agent + Fallacy Detection Agent.
Each sample below deliberately contains ONE specific fallacy (or none), so you can
verify your agents are actually catching what they're supposed to.

Run with: python tests/test_fallacies.py
"""
import sys
import os
import time

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.agents.argument_analysis_agent import argument_analysis_agent
from app.agents.fallacy_detection_agent import fallacy_detection_agent

# Free tier allows only ~5 requests/minute - pause between calls to avoid hitting it.
DELAY_BETWEEN_CALLS_SECONDS = 13

# One deliberate example per fallacy type from the project spec, plus edge cases.
TEST_CASES = [
    ("Ad Hominem", "You can't trust her opinion on climate policy, she didn't even finish college."),
    ("Straw Man", "My opponent wants better school funding, which means they want to bankrupt every taxpayer in this city."),
    ("False Dilemma", "Either we ban all cars immediately, or we just accept that the planet is doomed."),
    ("Slippery Slope", "If we allow students to redo one exam, soon nobody will ever study and the whole education system will collapse."),
    ("Appeal to Authority", "This diet must be healthy because a famous actor said he uses it."),
    ("Circular Reasoning", "The Bible is true because it says so in the Bible, and the Bible is never wrong."),
    ("Hasty Generalization", "My neighbor's dog bit someone once, so all dogs of that breed must be dangerous."),
    ("Red Herring", "Why worry about the company's pollution record when we should really be discussing how successful their new phone launch was?"),
    ("Clean argument (no fallacy expected)",
     "Renewable energy adoption has increased 40% over the past five years according to national grid data, "
     "and this trend correlates with a measurable drop in average electricity costs in those regions."),
]

EDGE_CASES = [
    ("Empty string", ""),
    ("Too short", "Yes."),
    ("Whitespace only", "   "),
]


def run_fallacy_tests():
    print("\n" + "=" * 60)
    print("FALLACY DETECTION AGENT TESTS (one per type)")
    print("=" * 60)
    for expected_fallacy, text in TEST_CASES:
        result = fallacy_detection_agent.run(text)
        found_types = [f["type"] for f in result["fallacies_found"]]
        status = "PASS" if (
            expected_fallacy in found_types
            or (expected_fallacy.startswith("Clean") and not found_types)
        ) else "CHECK MANUALLY"
        print(f"\n[{status}] Expected: {expected_fallacy}")
        print(f"  Text: {text[:80]}...")
        print(f"  Found: {found_types if found_types else 'none'}")
        time.sleep(DELAY_BETWEEN_CALLS_SECONDS)


def run_argument_analysis_tests():
    print("\n" + "=" * 60)
    print("ARGUMENT ANALYSIS AGENT TESTS")
    print("=" * 60)
    for label, text in TEST_CASES[:3] + EDGE_CASES:
        result = argument_analysis_agent.run(text)
        print(f"\n[{label}]")
        print(f"  strength_score: {result.get('strength_score')}, notes: {result.get('notes')}")
        time.sleep(DELAY_BETWEEN_CALLS_SECONDS)


if __name__ == "__main__":
    run_fallacy_tests()
    run_argument_analysis_tests()
    print("\nDone. Review any 'CHECK MANUALLY' lines above - the AI is occasionally")
    print("stricter/looser than expected on borderline cases. Adjust the SYSTEM_PROMPT")
    print("in fallacy_detection_agent.py if a particular fallacy type is consistently missed.")