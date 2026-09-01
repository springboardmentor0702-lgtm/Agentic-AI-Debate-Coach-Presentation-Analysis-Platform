from typing import Dict, List


def generate_recommendations(
    scores: Dict
) -> List[Dict]:

    recommendations = []

    checks = [
        (
            "argument_quality",
            "Improve argument structure",
            "State a clear claim and support it with relevant reasons."
        ),

        (
            "reasoning_quality",
            "Strengthen logical reasoning",
            "Explain how each premise leads to your conclusion."
        ),

        (
            "evidence_strength",
            "Use stronger evidence",
            "Support important claims with reliable data, research or examples."
        ),

        (
            "clarity_relevance",
            "Improve clarity and relevance",
            "Use concise language and keep each point connected to the topic."
        ),

        (
            "persuasiveness",
            "Improve persuasive impact",
            "Combine evidence, reasoning and audience awareness."
        )
    ]

    for key, title, advice in checks:

        score = float(
            scores.get(key, 0)
        )

        if score < 60:

            priority = "high"

        elif score < 75:

            priority = "medium"

        else:

            priority = "low"

        recommendations.append({

            "skill": key,

            "title": title,

            "priority": priority,

            "score": score,

            "recommendation": advice
        })

    recommendations.sort(
        key=lambda item: item["score"]
    )

    return recommendations


def create_learning_plan(
    recommendations: List[Dict]
) -> List[Dict]:

    plan = []

    for index, recommendation in enumerate(
        recommendations[:5],
        start=1
    ):

        plan.append({

            "week": index,

            "focus":
                recommendation["title"],

            "priority":
                recommendation["priority"],

            "activity":
                recommendation["recommendation"],

            "success_metric":
                "Improve the selected skill in the next debate."
        })

    return plan


def generate_coaching_report(
    scores: Dict
) -> Dict:

    recommendations = generate_recommendations(
        scores
    )

    learning_plan = create_learning_plan(
        recommendations
    )

    strongest_skill = max(
        scores,
        key=scores.get
    )

    weakest_skill = min(
        scores,
        key=scores.get
    )

    return {

        "strongest_skill":
            strongest_skill,

        "weakest_skill":
            weakest_skill,

        "recommendations":
            recommendations,

        "personalized_learning_plan":
            learning_plan
    }
