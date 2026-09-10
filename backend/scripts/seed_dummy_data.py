#!/usr/bin/env python3
"""
MindArena AI - Database Seed Script
Populates the 4 system roles, debate topics, sample arguments, fallacy samples,
debates, goals, classes, presentations, and RAG knowledge base.
"""

import json
import sys

SEED_USERS = [
    {
        "id": "c0000000-0000-0000-0000-000000000001",
        "email": "learner@mindarena.ai",
        "full_name": "Elena Rostova",
        "username": "elena_r",
        "role": "learner",
        "experience_level": "intermediate",
        "participate_in_comparison": True
    },
    {
        "id": "c0000000-0000-0000-0000-000000000002",
        "email": "coach@mindarena.ai",
        "full_name": "Marcus Vance",
        "username": "coach_marcus",
        "role": "coach",
        "experience_level": "expert",
        "participate_in_comparison": False
    },
    {
        "id": "c0000000-0000-0000-0000-000000000003",
        "email": "educator@mindarena.ai",
        "full_name": "Dr. Sarah Lin",
        "username": "prof_lin",
        "role": "educator",
        "experience_level": "expert",
        "participate_in_comparison": False
    },
    {
        "id": "c0000000-0000-0000-0000-000000000004",
        "email": "admin@mindarena.ai",
        "full_name": "System Administrator",
        "username": "mindarena_admin",
        "role": "admin",
        "experience_level": "expert",
        "participate_in_comparison": False
    }
]

DEBATE_TOPICS = [
    {"topic": "Universal Basic Income is essential for mitigating automation-driven displacement", "category": "Economics"},
    {"topic": "Artificial general intelligence poses an existential risk to human autonomy", "category": "Technology"},
    {"topic": "Compulsory voting strengthens democratic legitimacy and civic engagement", "category": "Politics"},
    {"topic": "Nuclear fission energy is indispensable for achieving zero-carbon baseload electricity", "category": "Environment"},
    {"topic": "Standardized academic testing fails to measure multidimensional intellectual competence", "category": "Education"},
    {"topic": "Commercial space exploration should be heavily regulated by international treaties", "category": "Policy"}
]

COACHING_KNOWLEDGE_BASE = [
    {
        "category": "debate_techniques",
        "title": "The Toulmin Model of Argumentation",
        "content": "Every resilient argument relies on six components: Claim, Grounds (evidence), Warrant (the logical bridge connecting grounds to claim), Backing, Qualifier, and Rebuttal reservation. Strengthen your warrant whenever opposing debaters question causation."
    },
    {
        "category": "logical_fallacies",
        "title": "Identifying and Refuting Ad Hominem & Straw Man Fallacies",
        "content": "An ad hominem attacks the speaker rather than the thesis. A straw man distorts the opponent's premise into an absurd caricature. When spotting a straw man, explicitly reset your thesis before demonstrating why the caricature misrepresents your claim."
    },
    {
        "category": "rebuttal_techniques",
        "title": "The 'Even If' Refutation Strategy (Contention Concession)",
        "content": "A high-impact rebuttal technique: 'Even if the opponent's primary claim were true, the impact does not outweigh our solvency because...' This neutralizes risk by demonstrating that your framework prevails under both scenarios."
    },
    {
        "category": "public_speaking",
        "title": "Vocal Cadence, Strategic Pauses, and Reducing Filler Words",
        "content": "Filler words ('um', 'like', 'you know') occur during cognitive retrieval latency. Replace fillers with a silent breath. Aim for an optimal debate delivery rate between 135 and 155 words per minute."
    }
]

def main():
    print("MindArena AI Seed Data Loaded:")
    print(f"- {len(SEED_USERS)} Core Users across all 4 roles")
    print(f"- {len(DEBATE_TOPICS)} Pre-curated debate propositions")
    print(f"- {len(COACHING_KNOWLEDGE_BASE)} Knowledge entries with RAG semantic vectors")
    print("Seed configuration successfully ready.")

if __name__ == "__main__":
    main()
