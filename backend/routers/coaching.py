from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from routers.auth import get_current_user
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models, schemas
import json

router = APIRouter(prefix="/api/v1/coaching", tags=["Recommendation & Coaching Engine"])


class CoachFeedbackRequest(BaseModel):
    student_id: int
    feedback: str


@router.get("/plan/{user_id}", response_model=schemas.CoachingPlanResponse)
def get_coaching_plan(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != current_user.id and current_user.role not in ["Debate Coach", "Educator", "Administrator"]:
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
    status_str = "Level 0 - Novice"

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
                status_str = "Level 3 - Master Orator"
            elif avg_overall >= 70:
                status_str = "Level 2 - Competent Debater"
            else:
                status_str = "Level 1 - Novice Rhetorician"
        
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
        "progress_status": status_str
    }


@router.get("/coach/overview")
def get_coach_overview(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Total student count (learners / non-coaches)
    students = db.query(models.User).filter(
        models.User.id != current_user.id,
        models.User.role != "Debate Coach",
        models.User.role != "Administrator"
    ).all()
    if not students:
        students = db.query(models.User).filter(models.User.id != current_user.id).all()
    total_students = len(students)
    
    # 2. Average class score from all PerformanceScores in database
    all_scores = db.query(models.PerformanceScore.overall_weighted_score).all()
    if all_scores:
        avg_score = round(sum(s[0] for s in all_scores) / len(all_scores), 1)
    else:
        avg_score = 85.0
        
    # 3. Pending / Active evaluations
    pending_count = db.query(models.DebateSession).filter(models.DebateSession.status == "Active").count()
    
    # 4. Compute top class pain points from actual database records
    pain_points = []
    
    # Fallacy frequency check
    fallacy_counts = {}
    turns = db.query(models.SimulationTurn.fallacies_json).all()
    for t in turns:
        try:
            f_list = json.loads(t[0]) if isinstance(t[0], str) else t[0]
            if isinstance(f_list, list):
                for f_item in f_list:
                    name = f_item if isinstance(f_item, str) else f_item.get("fallacy_type", "Fallacy")
                    fallacy_counts[name] = fallacy_counts.get(name, 0) + 1
        except Exception:
            pass
            
    if fallacy_counts:
        top_fallacy = max(fallacy_counts, key=fallacy_counts.get)
        pain_points.append(f"{top_fallacy} fallacies flagged in {fallacy_counts[top_fallacy]} debate turns across student transcripts.")
    else:
        pain_points.append("Logical consistency remains steady across recent debate transcripts.")
        
    # WPM / Cadence check
    p_metrics = db.query(models.PresentationMetric.speech_pace_wpm, models.PresentationMetric.filler_words_count).all()
    if p_metrics:
        avg_wpm = round(sum(m[0] for m in p_metrics) / len(p_metrics), 1)
        avg_fill = round(sum(m[1] for m in p_metrics) / len(p_metrics), 1)
        if avg_wpm > 155:
            pain_points.append(f"Average speaking pace is high ({avg_wpm} WPM). Students need cadence moderation exercises.")
        elif avg_wpm < 120:
            pain_points.append(f"Speaking pace is cautious ({avg_wpm} WPM). Students can increase assertiveness and rhythm.")
        else:
            pain_points.append(f"Classroom speaking cadence is well-balanced at an average of {avg_wpm} WPM.")
            
        if avg_fill > 2:
            pain_points.append(f"Average vocal pause filler density: {avg_fill} filler words per speech turn.")
    else:
        pain_points.append("Students are encouraged to record speeches in the Vocal Matrix studio to evaluate speaking cadence.")

    return {
        "assigned_students": total_students,
        "class_performance_average": avg_score,
        "pending_evaluations": pending_count,
        "system_status": "100% ONLINE",
        "top_class_pain_points": pain_points
    }


@router.get("/coach/students")
def get_coach_students(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Query all students / learners
    users = db.query(models.User).filter(
        models.User.id != current_user.id,
        models.User.role != "Debate Coach",
        models.User.role != "Administrator"
    ).order_by(models.User.id.desc()).all()
    if not users:
        users = db.query(models.User).filter(models.User.id != current_user.id).order_by(models.User.id.desc()).all()
    
    student_roster = []
    for u in users:
        # Find latest session
        latest_session = db.query(models.DebateSession).filter(models.DebateSession.user_id == u.id).order_by(models.DebateSession.id.desc()).first()
        total_sessions = db.query(models.DebateSession).filter(models.DebateSession.user_id == u.id).count()
        
        # Calculate real average score
        scores = db.query(models.PerformanceScore.overall_weighted_score).filter(models.PerformanceScore.user_id == u.id).all()
        if scores:
            avg_score = round(sum(s[0] for s in scores) / len(scores), 1)
        else:
            # Check presentation metrics
            p_metrics = db.query(models.PresentationMetric).filter(models.PresentationMetric.user_id == u.id).all()
            if p_metrics:
                avg_score = round(sum((m.confidence_score + m.clarity_score) / 2 for m in p_metrics) / len(p_metrics), 1)
            else:
                avg_score = 85.0 if total_sessions > 0 else 0.0
                
        # Calculate letter grade
        if avg_score >= 90:
            grade = "A+"
        elif avg_score >= 85:
            grade = "A"
        elif avg_score >= 80:
            grade = "A-"
        elif avg_score >= 75:
            grade = "B+"
        elif avg_score >= 70:
            grade = "B"
        elif avg_score >= 60:
            grade = "C"
        elif avg_score > 0:
            grade = "D"
        else:
            grade = "Pending"
            
        # Detect top logic gap
        top_gap = "None Detected"
        user_turn = db.query(models.SimulationTurn).filter(models.SimulationTurn.user_id == u.id).order_by(models.SimulationTurn.id.desc()).first()
        if user_turn and user_turn.fallacies_json:
            try:
                f_list = json.loads(user_turn.fallacies_json)
                if isinstance(f_list, list) and len(f_list) > 0:
                    top_gap = f_list[0] if isinstance(f_list[0], str) else f_list[0].get("fallacy_type", "Straw Man")
            except Exception:
                pass
                
        if top_gap == "None Detected":
            latest_metric = db.query(models.PresentationMetric).filter(models.PresentationMetric.user_id == u.id).order_by(models.PresentationMetric.id.desc()).first()
            if latest_metric:
                if latest_metric.speech_pace_wpm > 165:
                    top_gap = "Fast Pacing (>165 WPM)"
                elif latest_metric.filler_words_count > 3:
                    top_gap = "Filler Pauses"
                else:
                    top_gap = "Solid Consistency"
            else:
                top_gap = "No Sessions Yet"
                
        student_roster.append({
            "id": u.id,
            "name": u.full_name or u.email.split("@")[0],
            "email": u.email,
            "topic": latest_session.topic if latest_session else "No Active Debate",
            "format": latest_session.format if latest_session else "N/A",
            "total_sessions": total_sessions,
            "grade": grade,
            "score": avg_score,
            "gap": top_gap,
            "experience": u.experience_level,
            "last_active": latest_session.created_at.strftime("%Y-%m-%d %H:%M") if latest_session else u.created_at.strftime("%Y-%m-%d")
        })
        
    return student_roster


@router.post("/coach/feedback")
def send_coach_feedback(payload: CoachFeedbackRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(models.User).filter(models.User.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    # 1. Create a persistent notification for the student
    coach_name = current_user.full_name or "Debate Coach"
    notification = models.Notification(
        user_id=payload.student_id,
        category="Coach Feedback",
        title=f"Coaching Recommendation from Coach {coach_name}",
        message=payload.feedback,
        read=False
    )
    db.add(notification)
    
    # 2. Update student's coaching plan
    plan = db.query(models.CoachingPlan).filter(models.CoachingPlan.user_id == payload.student_id).first()
    if plan:
        existing_recs = plan.targeted_recommendations or ""
        plan.targeted_recommendations = f"{payload.feedback}\n{existing_recs}"
    else:
        new_plan = models.CoachingPlan(
            user_id=payload.student_id,
            skill_gap_summary=f"Feedback from Coach {coach_name}: {payload.feedback}",
            targeted_recommendations=payload.feedback,
            learning_path_steps="Coach Directed Drill (Active)",
            progress_status="Under Active Mentorship"
        )
        db.add(new_plan)
        
    db.commit()
    
    return {
        "status": "success",
        "message": f"Coaching recommendation successfully dispatched to {student.full_name or student.email}!"
    }

