"""
Demonstrates the agent pattern: each agent is self-contained, has a clear role,
and can be called the same way regardless of what it does internally.

This is also a template for teammates: the Speech Agent, Opponent Agent, Scoring Agent,
and Coaching Agent should all follow this exact shape (BaseAgent subclass + .run() method)
so the whole AI/ML system feels like one coordinated set of agents, not 7 unrelated scripts.

Run with: python tests/test_agents_demo.py
"""
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.agents.argument_analysis_agent import argument_analysis_agent
from app.agents.fallacy_detection_agent import fallacy_detection_agent

SAMPLE_ARGUMENT = (
    "You can't trust her opinion on the budget, she didn't even study economics. "
    "Also, if we cut spending at all, soon the entire city will go bankrupt."
)


def main():
    print(f"Agents loaded: {argument_analysis_agent}, {fallacy_detection_agent}\n")

    print("--- ArgumentAnalysisAgent.run() ---")
    analysis = argument_analysis_agent.run(SAMPLE_ARGUMENT)
    print(analysis)

    print("\n--- FallacyDetectionAgent.run() ---")
    fallacies = fallacy_detection_agent.run(SAMPLE_ARGUMENT)
    print(fallacies)

    print("\nBoth agents ran independently on the same input, in the same shape.")
    print("This is the pattern the rest of the group should copy for their agents.")


if __name__ == "__main__":
    main()
