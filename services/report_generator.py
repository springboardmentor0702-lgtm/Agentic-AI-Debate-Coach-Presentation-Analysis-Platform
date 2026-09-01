from datetime import datetime
from typing import Dict


def generate_presentation_report(
    analysis: Dict
) -> Dict:

    return {

        "report_type":
            "Presentation Analysis Report",

        "generated_at":
            datetime.utcnow().isoformat(),

        "summary": {

            "overall_score":
                analysis.get(
                    "overall_score",
                    0
                ),

            "pace":
                analysis.get(
                    "speech_pace",
                    {}
                ),

            "confidence":
                analysis.get(
                    "confidence",
                    {}
                ),

            "clarity":
                analysis.get(
                    "clarity",
                    {}
                ),

            "engagement":
                analysis.get(
                    "engagement",
                    {}
                ),

            "filler_words":
                analysis.get(
                    "filler_words",
                    {}
                )
        },

        "feedback":
            analysis.get(
                "feedback",
                []
            ),

        "recommendations": {

            "speech_pace":
                "Maintain a steady speaking pace.",

            "filler_words":
                "Replace filler words with deliberate pauses.",

            "confidence":
                "Use direct and evidence-supported statements.",

            "clarity":
                "Break complex ideas into shorter sentences.",

            "engagement":
                "Use examples and questions to involve the audience."
        }
    }


def generate_dashboard_data(
    analyses
):

    if not analyses:

        return {

            "total_presentations":
                0,

            "average_score":
                0,

            "trend":
                [],

            "latest":
                None
        }

    scores = [
        item.get(
            "overall_score",
            0
        )
        for item in analyses
    ]

    average = sum(scores) / len(scores)

    trend = []

    for index, score in enumerate(
        scores,
        start=1
    ):

        trend.append({

            "presentation":
                index,

            "score":
                score
        })

    return {

        "total_presentations":
            len(analyses),

        "average_score":
            round(
                average,
                2
            ),

        "trend":
            trend,

        "latest":
            analyses[-1]
    }
