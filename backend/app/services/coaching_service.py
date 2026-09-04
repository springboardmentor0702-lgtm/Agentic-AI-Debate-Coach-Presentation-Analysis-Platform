"""
Recommendation & Coaching Engine (spec section 10).

Identifies the user's weakest performance components (from Segment
8's scoring engine), retrieves relevant coaching technique content for
those specific weak areas via RAG (pgvector similarity search +
Gemini embeddings), and asks the LLM to turn that into a concrete,
prioritized learning path - grounded in real technique content instead
of generic advice.

RAG is treated as an enhancement, not a hard dependency: if the
embedding call or the similarity search fails for any reason,
retrieval quietly returns nothing and the coaching plan still
generates from the performance data alone.
"""
from app.core import supabase_client
from app.core.llm_client import embed_text, embedding_to_pg_literal, generate_json
from app.services.performance_scoring_service import compute_performance_score

COMPONENT_QUERY_MAP = {
    "argument_quality": "how to structure clear, persuasive, well-reasoned arguments",
    "evidence_usage": "how to use strong, credible evidence to support a claim",
    "logical_consistency": "how to avoid logical fallacies and maintain sound reasoning",
    "rebuttal_effectiveness": "how to rebut an opponent's argument effectively",
    "communication_skills": "how to improve confidence, clarity, and engagement when speaking",
}

MAX_WEAK_AREAS = 3
MATCHES_PER_AREA = 2
WEAK_THRESHOLD = 7.0

SYSTEM_PROMPT = """You are an expert debate and public speaking coach \
building a personalized improvement plan for a student, grounded in \
real coaching technique excerpts provided to you - don't give generic \
advice unrelated to what's provided. If no performance history is \
available yet, give solid general-purpose beginner debate coaching \
advice instead.

Respond with ONLY valid JSON in this exact shape - no markdown fences, \
no commentary:

{
  "recommendations": ["specific, actionable recommendation grounded in the provided technique content"],
  "skill_development_plan": ["a concrete skill-building exercise, in priority order"],
  "learning_path": ["ordered step-by-step path, starting with the most urgent weak area"],
  "summary_feedback": "2-4 sentences, direct and encouraging, naming the single highest-priority focus area"
}"""


def _retrieve_knowledge(query: str, match_count: int = MATCHES_PER_AREA) -> list:
    try:
        embedding = embed_text(query)
    except Exception:  # noqa: BLE001 - RAG is an enhancement, never a hard failure
        return []

    try:
        return supabase_client.call_rpc(
            "match_coaching_knowledge",
            {
                "query_embedding": embedding_to_pg_literal(embedding),
                "match_count": match_count,
            },
        )
    except Exception:  # noqa: BLE001
        return []


def generate_coaching_plan(user_id: str) -> dict:
    performance = compute_performance_score(user_id)

    scored_components = [c for c in performance["components"] if c["has_data"]]

    # Only components genuinely below the "solid" threshold count as
    # weak areas worth coaching on. Taking the bottom N unconditionally
    # would pull in an already-strong 8/10 score just because fewer
    # than N components have data yet.
    weak_components = sorted(
        [c for c in scored_components if c["score"] < WEAK_THRESHOLD],
        key=lambda c: c["score"],
    )[:MAX_WEAK_AREAS]

    if not weak_components and scored_components:
        # Everything's already solid - still give a next-focus area
        # rather than an empty coaching plan.
        weak_components = sorted(scored_components, key=lambda c: c["score"])[:1]

    retrieved = []
    for component in weak_components:
        query = COMPONENT_QUERY_MAP.get(component["key"], component["label"])
        retrieved.extend(_retrieve_knowledge(query))

    # De-duplicate by title (the same technique can be relevant to more
    # than one weak area), keeping the highest-similarity match.
    seen = {}
    for item in retrieved:
        title = item.get("title")
        if title not in seen or item.get("similarity", 0) > seen[title].get("similarity", 0):
            seen[title] = item
    knowledge_snippets = list(seen.values())

    performance_summary = (
        "\n".join(f"- {c['label']}: {c['score']}/10" for c in scored_components)
        or "No performance history yet."
    )
    knowledge_text = (
        "\n\n".join(
            f"[{k['category']}] {k['title']}: {k['content']}" for k in knowledge_snippets
        )
        or "No specific technique content retrieved - base recommendations on the performance data alone."
    )

    prompt = (
        f"Performance breakdown:\n{performance_summary}\n\n"
        f"Relevant coaching technique content:\n{knowledge_text}\n\n"
        f"Build this student's personalized coaching plan."
    )

    result = generate_json(prompt, system=SYSTEM_PROMPT)
    result.setdefault("recommendations", [])
    result.setdefault("skill_development_plan", [])
    result.setdefault("learning_path", [])
    result.setdefault("summary_feedback", "")
    result["performance_snapshot"] = performance
    result["knowledge_used"] = [
        {"title": k["title"], "category": k["category"]} for k in knowledge_snippets
    ]
    return result
