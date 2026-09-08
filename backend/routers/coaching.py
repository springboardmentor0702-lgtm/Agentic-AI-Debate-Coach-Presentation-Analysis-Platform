from fastapi import APIRouter, Depends, HTTPException, status
from routers.auth import get_current_user
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/v1/coaching", tags=["Recommendation & Coaching Engine"])

@router.get("/plan/{user_id}", response_model=schemas.CoachingPlanResponse)
def get_coaching_plan(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own coaching plan.")
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
    status = "Level 0 - Novice"

    # 3. Dynamic Calculation if data exists
    if p_metrics or scores:
        rec_list = []
        path_list = []
        
        # Speaking pace WPM audit
        if p_metrics:
            avg_wpm = sum(m.speech_pace_wpm for m in p_metrics) / len(p_metrics)
            avg_fillers = sum(m.filler_words_count for m in p_metrics) / len(p_metrics)
            avg_clarity = sum(m.clarity_score for m in p_metrics) / len(p_metrics)
            
            if avg_wpm > 160:
                rec_list.append(f"Slow down speaking rate (average: {round(avg_wpm)} WPM). Target an optimal range of 130-150 WPM.")
                path_list.append("Module: Cadence & Pacing control (Active)")
            elif avg_wpm < 110:
                rec_list.append(f"Increase speaking rate (average: {round(avg_wpm)} WPM) to build a more dynamic, persuasive rhythm.")
                path_list.append("Module: Conversational Flow control (Active)")
            else:
                rec_list.append("Maintain your excellent speaking pace (130-160 WPM WPM).")
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
                status = "Level 3 - Master Orator"
            elif avg_overall >= 70:
                status = "Level 2 - Competent Debater"
            else:
                status = "Level 1 - Novice Rhetorician"
        
        # Deduplicate paths and structure output
        summary = "Your metrics indicate solid progress. Focus on reducing filler words and refining logical transitions."
        recommendations = rec_list if rec_list else ["Keep up the great work! Try more advanced debate formats."]
        
        # Assemble standard path steps
        path_steps = list(dict.fromkeys(path_list))
        if len(path_steps) < 3:
            path_steps.append("Module: Advanced Parliamentary Refutation (Upcoming)")
            path_steps.append("Module: Socratic Cross-examination (Upcoming)")
            
    return {
        "user_id": user_id,
        "skill_gap_summary": summary,
        "targeted_recommendations": recommendations,
        "learning_path_steps": path_steps,
        "progress_status": status
    }
