def compute_performance_score(user_analyses: list, presentation: dict) -> dict:
    if not user_analyses:
        user_analyses = [{"scores": {"clarity": 50, "relevance": 50, "evidence_strength": 50,
                                     "logical_consistency": 50, "persuasiveness": 50}}]

    def avg(key):
        vals = [a.get("scores", {}).get(key, 50) for a in user_analyses if a.get("scores")]
        return sum(vals) / len(vals) if vals else 50

    argument_quality = (avg("clarity") + avg("relevance") + avg("persuasiveness")) / 3
    evidence_usage = avg("evidence_strength")
    logical_consistency = avg("logical_consistency")
    rebuttal_effectiveness = avg("persuasiveness")
    m = presentation.get("metrics", {})
    communication = (m.get("confidence_score", 60) + m.get("clarity_score", 60) +
                     m.get("audience_engagement_score", 60)) / 3
    overall = (argument_quality * 0.30 + evidence_usage * 0.20 + logical_consistency * 0.20 +
               rebuttal_effectiveness * 0.15 + communication * 0.15)
    return {"argument_quality": round(argument_quality, 1),
            "evidence_usage": round(evidence_usage, 1),
            "logical_consistency": round(logical_consistency, 1),
            "rebuttal_effectiveness": round(rebuttal_effectiveness, 1),
            "communication_skills": round(communication, 1),
            "overall_score": round(overall, 1)}
