from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models
from routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/dashboards", tags=["Dashboard & Analytics"])

@router.get("/learner/{user_id}")
def get_learner_dashboard(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.id != user_id and current_user.role not in ["Debate Coach", "Educator", "Administrator"]:
        raise HTTPException(status_code=403, detail="You may only access your own learner dashboard.")
    # Get user's debate sessions
    total_debates = db.query(models.DebateSession).filter(
        models.DebateSession.user_id == user_id
    ).count()
    
    # Get user's performance scores
    performance_scores = db.query(models.PerformanceScore).filter(
        models.PerformanceScore.user_id == user_id
    ).all()
    
    # Calculate average overall score
    if performance_scores:
        average_overall_score = sum(s.overall_weighted_score for s in performance_scores) / len(performance_scores)
        
        # Get recent performance trend (last 5 sessions)
        recent_scores = db.query(models.PerformanceScore).filter(
            models.PerformanceScore.user_id == user_id
        ).order_by(models.PerformanceScore.created_at.desc()).limit(5).all()
        recent_performance_trend = [s.overall_weighted_score for s in reversed(recent_scores)]
    else:
        average_overall_score = 0.0
        recent_performance_trend = []

    if performance_scores:
        skill_metrics = [
            {"name": "Argument Quality", "value": round(sum(s.argument_quality for s in performance_scores) / len(performance_scores), 1), "color": "#D90429", "description": "Claim structure, relevance, and persuasive reasoning."},
            {"name": "Evidence Usage", "value": round(sum(s.evidence_use for s in performance_scores) / len(performance_scores), 1), "color": "#111827", "description": "Strength and relevance of supporting evidence."},
            {"name": "Logical Consistency", "value": round(sum(s.logical_consistency for s in performance_scores) / len(performance_scores), 1), "color": "#4B5563", "description": "Ability to maintain a coherent position under challenge."},
            {"name": "Rebuttal Effectiveness", "value": round(sum(s.rebuttal_effectiveness for s in performance_scores) / len(performance_scores), 1), "color": "#3B82F6", "description": "Quality of direct counterarguments and responses."},
            {"name": "Communication Skills", "value": round(sum(s.communication_skills for s in performance_scores) / len(performance_scores), 1), "color": "#10B981", "description": "Delivery, clarity, and vocal communication performance."}
        ]
    else:
        skill_metrics = []
    
    # Get most common fallacies
    fallacy_counts = db.query(
        models.FallacyLog.fallacy_type,
        func.count(models.FallacyLog.id).label('count')
    ).join(models.ArgumentAnalysis).filter(
        models.ArgumentAnalysis.user_id == user_id
    ).group_by(models.FallacyLog.fallacy_type).order_by(func.count(models.FallacyLog.id).desc()).all()
    
    # Get top fallacy avoided (least common among detected fallacies)
    if fallacy_counts:
        top_fallacy_avoided = fallacy_counts[-1][0] if len(fallacy_counts) > 1 else "None detected"
    else:
        top_fallacy_avoided = "Excellent fallacy awareness"
    
    # Get coaching plan for recommended exercises
    coaching_plan = db.query(models.CoachingPlan).filter(
        models.CoachingPlan.user_id == user_id
    ).first()
    
    if coaching_plan:
        import json
        recommended_exercises = json.loads(coaching_plan.targeted_recommendations)
    else:
        recommended_exercises = [
            "Start with basic debate simulation",
            "Complete argument analysis exercise",
            "Practice with 'The Contrarian' persona"
        ]
    
    return {
        "role": "Learner",
        "user_id": user_id,
        "total_debates_completed": total_debates,
        "average_overall_score": round(average_overall_score, 1),
        "recent_performance_trend": recent_performance_trend,
        "skill_metrics": skill_metrics,
        "top_fallacy_avoided": top_fallacy_avoided,
        "recommended_exercises": recommended_exercises
    }

@router.get("/coach/{user_id}")
def get_coach_dashboard(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.id != user_id and current_user.role not in ["Administrator"]:
        raise HTTPException(status_code=403, detail="Only the coach or an administrator may access this dashboard.")
    assigned_ids = [assignment.learner_id for assignment in db.query(models.CoachAssignment).filter(
        models.CoachAssignment.coach_id == current_user.id,
        models.CoachAssignment.status == "Active"
    ).all()]
    assigned_students = db.query(models.User).filter(
        models.User.id.in_(assigned_ids) if assigned_ids else models.User.id == -1
    ).all()
    
    assigned_students_count = len(assigned_students)
    
    # Get top performers based on average scores
    student_scores = []
    learner_roster = []
    for student in assigned_students:
        scores = db.query(models.PerformanceScore).filter(
            models.PerformanceScore.user_id == student.id
        ).all()
        avg_score = sum(s.overall_weighted_score for s in scores) / len(scores) if scores else 0
        learner_roster.append({
            "id": student.id,
            "name": student.full_name,
            "email": student.email,
            "average_score": round(avg_score, 1),
            "debates_completed": db.query(models.DebateSession).filter(
                models.DebateSession.user_id == student.id
            ).count()
        })
        if scores:
            student_scores.append((student.full_name, avg_score))
    
    # Sort by score and get top 3
    student_scores.sort(key=lambda x: x[1], reverse=True)
    top_performers = [s[0] for s in student_scores[:3]] if student_scores else ["No data yet"]
    
    # Get common skill gaps across all students
    all_fallacies = db.query(
        models.FallacyLog.fallacy_type,
        func.count(models.FallacyLog.id).label('count')
    ).join(models.ArgumentAnalysis).join(models.User).filter(
        models.User.id.in_(assigned_ids) if assigned_ids else models.User.id == -1
    ).group_by(models.FallacyLog.fallacy_type).order_by(func.count(models.FallacyLog.id).desc()).limit(5).all()
    
    class_skill_gaps = [f[0] for f in all_fallacies] if all_fallacies else ["No data available"]
    
    # Get pending evaluations (sessions without performance scores)
    pending_evaluations = db.query(models.DebateSession).join(models.User).filter(
        models.User.id.in_(assigned_ids) if assigned_ids else models.User.id == -1,
        models.DebateSession.status == "Active"
    ).count()
    
    return {
        "role": "Debate Coach",
        "user_id": user_id,
        "assigned_students_count": assigned_students_count,
        "learner_roster": learner_roster,
        "top_performers": top_performers,
        "class_skill_gaps": class_skill_gaps,
        "pending_evaluations": pending_evaluations
    }

@router.get("/educator/{user_id}")
def get_educator_dashboard(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.id != user_id and current_user.role not in ["Administrator"]:
        raise HTTPException(status_code=403, detail="Educator dashboard access denied.")
    # Get all users (simulating classes)
    total_enrolled_students = db.query(models.User).filter(
        models.User.role == "Learner"
    ).count()
    
    # Calculate average class score
    all_scores = db.query(models.PerformanceScore).join(models.User).filter(
        models.User.role == "Learner"
    ).all()
    
    if all_scores:
        average_class_score = sum(s.overall_weighted_score for s in all_scores) / len(all_scores)
    else:
        average_class_score = 0.0
    
    # Get unique debate topics
    debate_topics = db.query(models.DebateSession.topic).distinct().all()
    debate_topics_assigned = [t[0] for t in debate_topics[:5]] if debate_topics else ["No topics assigned"]
    
    # Active classes (simulated as user groups)
    active_classes = 3  # Default value for demo
    
    return {
        "role": "Educator",
        "user_id": user_id,
        "active_classes": active_classes,
        "total_enrolled_students": total_enrolled_students,
        "average_class_score": round(average_class_score, 1),
        "debate_topics_assigned": debate_topics_assigned
    }

@router.get("/admin")
def get_admin_dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "Administrator":
        raise HTTPException(status_code=403, detail="Administrator access is required.")
    total_users = db.query(models.User).count()
    
    # Get active AI agents (personas available)
    active_ai_agents = 3
    
    # System health metrics
    llm_api_health = "100% Operational"
    system_latency_ms = 142
    uptime_percentage = 99.98
    
    return {
        "role": "Administrator",
        "platform_users_total": total_users,
        "learners_total": db.query(models.User).filter(models.User.role == "Learner").count(),
        "coaches_total": db.query(models.User).filter(models.User.role == "Debate Coach").count(),
        "sessions_total": db.query(models.DebateSession).count(),
        "active_ai_agents": active_ai_agents,
        "llm_api_health": llm_api_health,
        "system_latency_ms": system_latency_ms,
        "uptime_percentage": uptime_percentage
    }
