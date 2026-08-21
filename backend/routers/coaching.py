from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/coaching", tags=["Recommendation & Coaching Engine"])


def build_coaching_plan(user_id: int, db: Session) -> dict:
    metrics = (
        db.query(models.PresentationMetric)
        .filter(models.PresentationMetric.user_id == user_id)
        .order_by(models.PresentationMetric.created_at.desc())
        .limit(10)
        .all()
    )
    scores = (
        db.query(models.PerformanceScore)
        .filter(models.PerformanceScore.user_id == user_id)
        .order_by(models.PerformanceScore.created_at.desc())
        .limit(10)
        .all()
    )
    fallacy_rows = (
        db.query(models.FallacyLog.fallacy_type)
        .filter(models.FallacyLog.user_id == user_id)
        .all()
    )
    fallacies = [row[0] for row in fallacy_rows]
    recommendations: list[str] = []
    path: list[str] = []

    if metrics:
        average_wpm = sum(item.speech_pace_wpm for item in metrics) / len(metrics)
        average_fillers = sum(item.filler_words_count for item in metrics) / len(metrics)
        average_clarity = sum(item.clarity_score for item in metrics) / len(metrics)
        if average_wpm > 160:
            recommendations.append(f"Slow your average pace from {average_wpm:.0f} WPM toward a 130–160 WPM target.")
            path.append("Cadence and pacing control")
        elif average_wpm < 110:
            recommendations.append(f"Increase your average pace from {average_wpm:.0f} WPM to create more dynamic delivery.")
            path.append("Conversational flow control")
        else:
            recommendations.append(f"Maintain your controlled speaking pace of {average_wpm:.0f} WPM and vary emphasis on key claims.")
            path.append("Speech cadence maintenance")
        if average_fillers >= 3:
            recommendations.append(f"Reduce filler words from an average of {average_fillers:.1f} per analysis by using deliberate pauses.")
            path.append("Filler-word mitigation")
        else:
            recommendations.append("Your filler-word rate is controlled; practice pauses before complex rebuttals.")
            path.append("Speech clarity")
        if average_clarity < 70:
            recommendations.append(f"Improve articulation and sentence structure; recent clarity averaged {average_clarity:.1f}%.")
            path.append("Clarity and structure")
    else:
        recommendations.append("Complete a presentation analysis to establish your speaking baseline.")
        path.append("Speech pacing and delivery baseline")

    if scores:
        average_score = sum(item.overall_weighted_score for item in scores) / len(scores)
        average_logic = sum(item.logical_consistency for item in scores) / len(scores)
        if average_logic < 70:
            recommendations.append(f"Strengthen claim-to-evidence reasoning; logical consistency currently averages {average_logic:.1f}%.")
            path.append("Fallacy shielding and logic auditing")
        else:
            recommendations.append("Maintain strong logical consistency by explicitly linking every claim to evidence.")
            path.append("Evidence-backed reasoning")
        if average_score >= 85:
            level = "Level 3 - Master Orator"
        elif average_score >= 70:
            level = "Level 2 - Competent Debater"
        else:
            level = "Level 1 - Developing Rhetorician"
    else:
        level = "Level 0 - Not Yet Assessed"
        recommendations.append("Complete a debate simulation and finish the session to receive a weighted performance score.")

    if fallacies:
        common = max(set(fallacies), key=fallacies.count)
        recommendations.append(f"Review examples of {common} and rewrite one recent claim without the same pattern.")
        path.append("Targeted fallacy correction")

    path.extend(["Counterargument structure", "Socratic cross-examination"])
    recommendations = list(dict.fromkeys(recommendations))[:6]
    path = list(dict.fromkeys(path))[:6]
    summary = (
        "Your coaching plan is based on your persisted debate scores, presentation metrics, and detected fallacies."
        if metrics or scores or fallacies
        else "No practice data is available yet. Complete a debate and presentation analysis to generate a personalized plan."
    )
    return {
        "user_id": user_id,
        "skill_gap_summary": summary,
        "targeted_recommendations": recommendations,
        "learning_path_steps": path,
        "progress_status": level,
    }


@router.get("/plan/{user_id}", response_model=schemas.CoachingPlanResponse)
def get_coaching_plan(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own coaching plan.")
    return build_coaching_plan(user_id, db)
