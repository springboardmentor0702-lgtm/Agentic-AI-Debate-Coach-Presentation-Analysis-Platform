from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user

import models
import schemas


router = APIRouter(
    prefix="/api/v1/coaching",
    tags=["Recommendation & Coaching Engine"]
)


@router.get(
    "/plan/{user_id}",
    response_model=schemas.CoachingPlanResponse
)
def get_coaching_plan(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # --------------------------------------------------------
    # Security: users can only access their own coaching plan
    # --------------------------------------------------------
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own coaching plan."
        )

    # --------------------------------------------------------
    # Fetch recent presentation metrics
    # --------------------------------------------------------
    p_metrics = (
        db.query(models.PresentationMetric)
        .filter(
            models.PresentationMetric.user_id == user_id
        )
        .order_by(
            models.PresentationMetric.id.desc()
        )
        .limit(5)
        .all()
    )

    # --------------------------------------------------------
    # Fetch recent debate performance scores
    # --------------------------------------------------------
    scores = (
        db.query(models.PerformanceScore)
        .filter(
            models.PerformanceScore.user_id == user_id
        )
        .order_by(
            models.PerformanceScore.id.desc()
        )
        .limit(5)
        .all()
    )

    # --------------------------------------------------------
    # Default values for a new learner
    # --------------------------------------------------------
    summary = (
        "No recorded practice sessions found yet. "
        "Get started by initializing an AI simulation debate "
        "or voice prosody audit."
    )

    recommendations = [
        "Initialize your first live AI debate simulation.",
        "Perform a vocal metrics speech analysis to check speaking speed (WPM).",
        "Select your experience level and goals in dashboard Profile Settings."
    ]

    path_steps = [
        "Step 1: Speech Pacing & Tone Audit (Upcoming)",
        "Step 2: Fallacy Shielding Exercises (Upcoming)",
        "Step 3: Advanced Refutation Drills (Upcoming)"
    ]

    progress_status = "Level 0 - Novice"

    # --------------------------------------------------------
    # Generate dynamic recommendations when data exists
    # --------------------------------------------------------
    if p_metrics or scores:

        rec_list = []
        path_list = []

        # ----------------------------------------------------
        # Presentation / speaking metrics
        # ----------------------------------------------------
        if p_metrics:

            avg_wpm = (
                sum(
                    m.speech_pace_wpm
                    for m in p_metrics
                )
                / len(p_metrics)
            )

            avg_fillers = (
                sum(
                    m.filler_words_count
                    for m in p_metrics
                )
                / len(p_metrics)
            )

            avg_clarity = (
                sum(
                    m.clarity_score
                    for m in p_metrics
                )
                / len(p_metrics)
            )

            # Speaking pace recommendation
            if avg_wpm > 160:

                rec_list.append(
                    f"Slow down speaking rate "
                    f"(average: {round(avg_wpm)} WPM). "
                    "Target an optimal range of 130-150 WPM."
                )

                path_list.append(
                    "Module: Cadence & Pacing Control (Active)"
                )

            elif avg_wpm < 110:

                rec_list.append(
                    f"Increase speaking rate "
                    f"(average: {round(avg_wpm)} WPM) "
                    "to build a more dynamic, persuasive rhythm."
                )

                path_list.append(
                    "Module: Conversational Flow Control (Active)"
                )

            else:

                rec_list.append(
                    f"Maintain your speaking pace "
                    f"(average: {round(avg_wpm)} WPM)."
                )

                path_list.append(
                    "Module: Speech Cadence (Completed)"
                )

            # Filler word recommendation
            if avg_fillers > 3:

                rec_list.append(
                    f"Use deliberate pauses to reduce filler words "
                    f"(average: {round(avg_fillers, 1)} fillers per speech)."
                )

                path_list.append(
                    "Module: Filler Word Mitigation (Active)"
                )

            else:

                rec_list.append(
                    "Excellent filler word control "
                    "(less than 3 fillers per speech)."
                )

                path_list.append(
                    "Module: Speech Clarity (Completed)"
                )

            # Clarity recommendation
            if avg_clarity < 70:

                rec_list.append(
                    f"Focus on improving speech clarity "
                    f"(average clarity: {round(avg_clarity, 1)}%)."
                )

                path_list.append(
                    "Module: Vocal Clarity Improvement (Active)"
                )

        # ----------------------------------------------------
        # Debate performance metrics
        # ----------------------------------------------------
        if scores:

            avg_overall = (
                sum(
                    s.overall_weighted_score
                    for s in scores
                )
                / len(scores)
            )

            avg_logic = (
                sum(
                    s.logical_consistency
                    for s in scores
                )
                / len(scores)
            )

            avg_evidence = (
                sum(
                    s.evidence_use
                    for s in scores
                )
                / len(scores)
            )

            avg_rebuttal = (
                sum(
                    s.rebuttal_effectiveness
                    for s in scores
                )
                / len(scores)
            )

            # Logic recommendation
            if avg_logic < 80:

                rec_list.append(
                    f"Identify and remove logical fallacies "
                    f"(average logic rating: {round(avg_logic, 1)}%)."
                )

                path_list.append(
                    "Module: Fallacy Shielding & Logic Auditing (Active)"
                )

            else:

                rec_list.append(
                    "Strong logical reasoning. "
                    "Practice building more structured claims."
                )

                path_list.append(
                    "Module: Fallacy Shielding (Completed)"
                )

            # Evidence recommendation
            if avg_evidence < 70:

                rec_list.append(
                    f"Strengthen evidence usage "
                    f"(average evidence rating: {round(avg_evidence, 1)}%)."
                )

                path_list.append(
                    "Module: Evidence & Citation Strength (Active)"
                )

            # Rebuttal recommendation
            if avg_rebuttal < 70:

                rec_list.append(
                    f"Practice stronger rebuttals "
                    f"(average rebuttal rating: {round(avg_rebuttal, 1)}%)."
                )

                path_list.append(
                    "Module: Rebuttal Effectiveness (Active)"
                )

            # ------------------------------------------------
            # Determine learner level
            # ------------------------------------------------
            if avg_overall >= 85:

                progress_status = (
                    "Level 3 - Master Orator"
                )

            elif avg_overall >= 70:

                progress_status = (
                    "Level 2 - Competent Debater"
                )

            elif avg_overall > 0:

                progress_status = (
                    "Level 1 - Novice Rhetorician"
                )

            else:

                progress_status = (
                    "Level 0 - Novice"
                )

        # ----------------------------------------------------
        # Dynamic summary
        # ----------------------------------------------------
        summary = (
            "Your coaching plan is based on your recent "
            "debate and presentation performance."
        )

        # ----------------------------------------------------
        # Use generated recommendations
        # ----------------------------------------------------
        recommendations = (
            rec_list
            if rec_list
            else [
                "Keep practicing consistently.",
                "Try another AI debate simulation.",
                "Complete a presentation analysis."
            ]
        )

        # ----------------------------------------------------
        # Remove duplicate learning-path modules
        # ----------------------------------------------------
        path_steps = list(
            dict.fromkeys(path_list)
        )

        # Ensure the learning path has upcoming content
        if len(path_steps) < 3:

            path_steps.append(
                "Module: Advanced Parliamentary Refutation (Upcoming)"
            )

            path_steps.append(
                "Module: Socratic Cross-examination (Upcoming)"
            )

        # Keep only the first three path steps
        path_steps = path_steps[:3]

    # --------------------------------------------------------
    # Return the ACTUAL calculated values
    # --------------------------------------------------------
    return {
        "user_id": user_id,
        "skill_gap_summary": summary,
        "targeted_recommendations": recommendations,
        "learning_path_steps": path_steps,
        "progress_status": progress_status
    }