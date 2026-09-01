from services.report_generator import (
    generate_presentation_report
)


def test_report_generation():

    analysis = {

        "overall_score": 80,

        "speech_pace": {
            "pace_score": 85
        },

        "confidence": {
            "confidence_score": 80
        },

        "clarity": {
            "clarity_score": 82
        },

        "engagement": {
            "engagement_score": 75
        },

        "filler_words": {
            "filler_control_score": 90
        },

        "feedback": [
            "Good presentation."
        ]
    }

    report = generate_presentation_report(
        analysis
    )

    assert (
        report["summary"][
            "overall_score"
        ] == 80
    )

    assert (
        "recommendations"
        in report
    )
