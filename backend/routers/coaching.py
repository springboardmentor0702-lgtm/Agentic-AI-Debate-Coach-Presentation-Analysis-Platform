import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from routers.auth import get_current_user
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/v1/coaching", tags=["Recommendation & Coaching Engine"])

def _generate_plan(user_id: int, db: Session) -> dict:
    # 1. Fetch recent metrics to make recommendations dynamic
    p_metrics = db.query(models.PresentationMetric).filter(models.PresentationMetric.user_id == user_id).order_by(models.PresentationMetric.id.desc()).limit(5).all()
    scores = db.query(models.PerformanceScore).filter(models.PerformanceScore.user_id == user_id).order_by(models.PerformanceScore.id.desc()).limit(5).all()

    # 2. Defaults if database is empty
    summary = "No recorded practice sessions found yet. Get started by initializing an AI simulation debate or voice prosody audit."
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

    # 3. Dynamic Calculation if data exists
    if p_metrics or scores:
        rec_list = []
        path_list = []

        # Speaking pace WPM audit
        if p_metrics:
            avg_wpm = sum(m.speech_pace_wpm for m in p_metrics) / len(p_metrics)
            avg_fillers = sum(m.filler_words_count for m in p_metrics) / len(p_metrics)

            if avg_wpm > 160:
                rec_list.append(f"Slow down speaking rate (average: {round(avg_wpm)} WPM). Target an optimal range of 130-150 WPM.")
                path_list.append("Module: Cadence & Pacing control (Active)")
            elif avg_wpm < 110:
                rec_list.append(f"Increase speaking rate (average: {round(avg_wpm)} WPM) to build a more dynamic, persuasive rhythm.")
                path_list.append("Module: Conversational Flow control (Active)")
            else:
                rec_list.append("Maintain your excellent speaking pace (130-160 WPM).")
                path_list.append("Module: Speech Cadence (Completed)")

            if avg_fillers > 3:
                rec_list.append(f"Perform pauses to eliminate filler words (average: {round(avg_fillers, 1)} fillers/turn).")
                path_list.append("Module: Filler Word Mitigation (Active)")
            else:
                rec_list.append("Excellent filler word control (less than 3 fillers per speech).")
                path_list.append("Module: Speech Clarity (Completed)")

        # Debate logic / score audit
        if scores:
            avg_overall = sum(s.overall_weighted_score for s in scores) / len(scores)
            avg_logic = sum(s.logical_consistency for s in scores) / len(scores)

            if avg_logic < 80:
                rec_list.append(f"Identify and remove logical fallacies (average logic rating: {round(avg_logic, 1)}%).")
                path_list.append("Module: Fallacy Shielding & Logic Auditing (Active)")
            else:
                rec_list.append("Strong logical reasoning. Practice building more structured claims.")
                path_list.append("Module: Fallacy Shielding (Completed)")

            if avg_overall >= 85:
                progress_status = "Level 3 - Master Orator"
            elif avg_overall >= 70:
                progress_status = "Level 2 - Competent Debater"
            else:
                progress_status = "Level 1 - Novice Rhetorician"

        # Deduplicate paths and structure output
        summary = "Your metrics indicate solid progress. Focus on reducing filler words and refining logical transitions."
        recommendations = rec_list if rec_list else ["Keep up the great work! Try more advanced debate formats."]

        # Assemble standard path steps
        path_steps = list(dict.fromkeys(path_list))
        if len(path_steps) < 3:
            path_steps.append("Module: Advanced Parliamentary Refutation (Upcoming)")
            path_steps.append("Module: Socratic Cross-examination (Upcoming)")

    plan = {
        "user_id": user_id,
        "skill_gap_summary": summary,
        "targeted_recommendations": recommendations,
        "learning_path_steps": path_steps,
        "progress_status": progress_status,
        "coach_recommendations": [] # Placeholder to be populated
    }
    stored = db.query(models.CoachingPlan).filter(models.CoachingPlan.user_id == user_id).first()
    if stored is None:
        stored = models.CoachingPlan(user_id=user_id)
        db.add(stored)
        db.flush() # Ensure ID is assigned if needed for recommendations

    stored.skill_gap_summary = summary
    stored.targeted_recommendations = json.dumps(recommendations)
    stored.learning_path_steps = json.dumps(path_steps)
    stored.progress_status = progress_status
    stored.updated_at = datetime.utcnow()

    # Populate coach recommendations
    c_recs = db.query(models.CoachRecommendation).filter(models.CoachRecommendation.learner_id == user_id).all()
    plan["coach_recommendations"] = [
        {"id": r.id, "coach_id": r.coach_id, "learner_id": r.learner_id, "recommendation_text": r.recommendation_text, "created_at": r.created_at}
        for r in c_recs
    ]

    db.commit()
    return plan


@router.get("/plan/{user_id}", response_model=schemas.CoachingPlanResponse)
def get_coaching_plan(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != current_user.id:
        # NOTE: Allowing coaches to view user plans via this endpoint or separate endpoint?
        # Requirement says separate endpoint for coach view. Still keep this check.
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own coaching plan.")
    return _generate_plan(user_id, db)


@router.post("/plan/{user_id}/regenerate", response_model=schemas.CoachingPlanResponse)
def regenerate_coaching_plan(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only regenerate your own coaching plan.")
    return _generate_plan(user_id, db)


# ---------------------------------------------------------------------------
# Coach-only: send recommendation to learner
# ---------------------------------------------------------------------------
@router.post("/recommend/{user_id}", response_model=schemas.CoachRecommendationResponse)
def send_recommendation(
    user_id: int,
    payload: schemas.CoachRecommendationSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Coach pushes a text recommendation to a learner."""
    if current_user.role not in ("Debate Coach", "Administrator"):
        raise HTTPException(status_code=403, detail="Only Debate Coaches can send recommendations.")

    # Verify assignment
    if current_user.role == "Debate Coach":
        assignment = (
            db.query(models.CoachAssignment)
            .filter(models.CoachAssignment.coach_id == current_user.id, models.CoachAssignment.learner_id == user_id)
            .first()
        )
        if not assignment:
            raise HTTPException(status_code=403, detail="This learner is not assigned to you.")

    new_rec = models.CoachRecommendation(
        coach_id=current_user.id,
        learner_id=user_id,
        recommendation_text=payload.recommendation_text
    )
    db.add(new_rec)
    db.commit()
    db.refresh(new_rec)
    return new_rec


# ---------------------------------------------------------------------------
# Coach-only: view an assigned learner's coaching plan (read-only)
# ---------------------------------------------------------------------------
@router.get("/plan/{user_id}/coach-view", response_model=schemas.CoachingPlanResponse)
def get_coaching_plan_coach_view(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """A coach may view the coaching plan of any learner assigned to them."""
    if current_user.role not in ("Debate Coach", "Administrator"):
        raise HTTPException(status_code=403, detail="Only Debate Coaches can use this endpoint.")

    # Verify the learner is assigned to this coach (Admin bypasses)
    if current_user.role == "Debate Coach":
        assignment = (
            db.query(models.CoachAssignment)
            .filter(models.CoachAssignment.coach_id == current_user.id, models.CoachAssignment.learner_id == user_id)
            .first()
        )
        if not assignment:
            raise HTTPException(status_code=403, detail="This learner is not assigned to you.")

    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Learner not found.")

    return _generate_plan(user_id, db)


# ---------------------------------------------------------------------------
# Coach-only: assign a targeted drill to an assigned learner
# ---------------------------------------------------------------------------
@router.post("/assign-drill/{user_id}")
def assign_drill(
    user_id: int,
    payload: schemas.DrillAssignment,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign a practice drill to a specific learner (coach-only action)."""
    if current_user.role not in ("Debate Coach", "Administrator"):
        raise HTTPException(status_code=403, detail="Only Debate Coaches can assign drills.")

    # Verify assignment
    if current_user.role == "Debate Coach":
        assignment = (
            db.query(models.CoachAssignment)
            .filter(models.CoachAssignment.coach_id == current_user.id, models.CoachAssignment.learner_id == user_id)
            .first()
        )
        if not assignment:
            raise HTTPException(status_code=403, detail="This learner is not assigned to you.")

    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Learner not found.")

    # Append the drill as a coaching plan recommendation
    plan = db.query(models.CoachingPlan).filter(models.CoachingPlan.user_id == user_id).first()
    drill_entry = f"[DRILL] {payload.drill_type}: {payload.description}" if payload.description else f"[DRILL] {payload.drill_type}"

    if plan:
        existing_recs = []
        try:
            existing_recs = json.loads(plan.targeted_recommendations) if plan.targeted_recommendations else []
        except (json.JSONDecodeError, TypeError):
            existing_recs = [plan.targeted_recommendations] if plan.targeted_recommendations else []
        existing_recs.append(drill_entry)
        plan.targeted_recommendations = json.dumps(existing_recs)
        plan.updated_at = datetime.utcnow()
    else:
        plan = models.CoachingPlan(
            user_id=user_id,
            skill_gap_summary="Coach-assigned drill pending completion.",
            targeted_recommendations=json.dumps([drill_entry]),
            learning_path_steps=json.dumps([f"Complete: {payload.drill_type}"]),
            progress_status="Drill Assigned",
        )
        db.add(plan)

    db.commit()
    return {
        "detail": f"Drill '{payload.drill_type}' assigned to {target.full_name}.",
        "learner_id": user_id,
        "drill_type": payload.drill_type,
    }
