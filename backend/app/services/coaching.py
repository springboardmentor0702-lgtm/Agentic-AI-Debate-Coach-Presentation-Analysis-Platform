from .ai_client import llm_json


def coaching_recommendations(score: dict, fallacies_found: list, presentation: dict) -> dict:
    weakest = min({k: v for k, v in score.items() if k != "overall_score"}, key=lambda k: score[k])
    plans = {
        "argument_quality": ["Practice claim-evidence-reasoning structure with 3-part arguments.",
            "Do daily 2-minute impromptu drills on random topics."],
        "evidence_usage": ["Cite at least one statistic or study per argument.",
            "Build a personal evidence bank for your top 5 debate topics."],
        "logical_consistency": ["Map your argument chain - each claim must follow from the previous.",
            "Review detected fallacies before your next session."],
        "rebuttal_effectiveness": ["Practice the 'concede-and-overcome' rebuttal pattern.",
            "Debate the opposite side of your next topic to stress-test it."],
        "communication_skills": ["Record yourself and target filler-word reduction by 50%.",
            "Practice pacing: aim for 140 words per minute."]}
    fallback = {
        "improvement_recommendations": plans[weakest],
        "skill_development_plan": f"Focus area this week: {weakest.replace('_', ' ').title()} "
            f"(current score {score[weakest]}/100). Complete 3 practice sessions before re-evaluation.",
        "learning_path": ["Week A: targeted drills", "Week B: AI simulation practice",
                          "Week C: full timed debate + re-score"] if fallacies_found else
                         ["Maintain strengths", "Increase topic difficulty", "Join a live practice debate"],
        "coaching_feedback": f"Strongest area: {max(score, key=lambda k: score[k] if k != 'overall_score' else 0)}. "
                             f"Weakest: {weakest.replace('_', ' ')}. Keep practicing!"}
    return llm_json(
        'You are an expert debate coach. Return ONLY JSON: {"improvement_recommendations":[str],'
        '"skill_development_plan":str,"learning_path":[str],"coaching_feedback":str}',
        f"Scores: {score}\nFallacies found: {[f.get('fallacy') for f in fallacies_found]}\n"
        f"Presentation metrics: {presentation.get('metrics', {})}", fallback)
