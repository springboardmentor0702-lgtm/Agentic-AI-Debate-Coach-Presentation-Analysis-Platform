from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models

router = APIRouter(prefix="/api/v1/dashboards", tags=["Dashboard & Analytics"])

@router.get("/learner/{user_id}")
def get_learner_dashboard(user_id: int, db: Session = Depends(get_db)):
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
        "top_fallacy_avoided": top_fallacy_avoided,
        "recommended_exercises": recommended_exercises
    }

@router.get("/coach/{user_id}")
def get_coach_dashboard(user_id: int, db: Session = Depends(get_db)):
    # Get all learners (users with role "Learner")
    assigned_students = db.query(models.User).filter(
        models.User.role == "Learner"
    ).all()
    
    assigned_students_count = len(assigned_students)
    
    # Get top performers based on average scores
    student_scores = []
    for student in assigned_students:
        scores = db.query(models.PerformanceScore).filter(
            models.PerformanceScore.user_id == student.id
        ).all()
        if scores:
            avg_score = sum(s.overall_weighted_score for s in scores) / len(scores)
            student_scores.append((student.full_name, avg_score))
    
    # Sort by score and get top 3
    student_scores.sort(key=lambda x: x[1], reverse=True)
    top_performers = [s[0] for s in student_scores[:3]] if student_scores else ["No data yet"]
    
    # Get common skill gaps across all students
    all_fallacies = db.query(
        models.FallacyLog.fallacy_type,
        func.count(models.FallacyLog.id).label('count')
    ).join(models.ArgumentAnalysis).join(models.User).filter(
        models.User.role == "Learner"
    ).group_by(models.FallacyLog.fallacy_type).order_by(func.count(models.FallacyLog.id).desc()).limit(5).all()
    
    class_skill_gaps = [f[0] for f in all_fallacies] if all_fallacies else ["No data available"]
    
    # Get pending evaluations (sessions without performance scores)
    pending_evaluations = db.query(models.DebateSession).join(models.User).filter(
        models.User.role == "Learner",
        models.DebateSession.status == "Active"
    ).count()
    
    return {
        "role": "Debate Coach",
        "user_id": user_id,
        "assigned_students_count": assigned_students_count,
        "top_performers": top_performers,
        "class_skill_gaps": class_skill_gaps,
        "pending_evaluations": pending_evaluations
    }

@router.get("/educator/{user_id}")
def get_educator_dashboard(user_id: int, db: Session = Depends(get_db)):
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
def get_admin_dashboard():
    # Get total users
    total_users = 1420  # This would be a real query in production
    
    # Get active AI agents (personas available)
    active_ai_agents = 3  # The Contrarian, The Academic, The Strategist
    
    # System health metrics
    llm_api_health = "100% Operational"
    system_latency_ms = 142
    uptime_percentage = 99.98
    
    return {
        "role": "Administrator",
        "platform_users_total": total_users,
        "active_ai_agents": active_ai_agents,
        "llm_api_health": llm_api_health,
        "system_latency_ms": system_latency_ms,
        "uptime_percentage": uptime_percentage
    }
