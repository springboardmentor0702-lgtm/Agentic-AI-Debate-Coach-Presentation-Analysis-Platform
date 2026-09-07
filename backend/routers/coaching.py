from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models, schemas
import json

router = APIRouter(
    prefix="/api/v1/coaching",
    tags=["Recommendation & Coaching Engine"]
)


def analyze_skill_gaps(user_id: int, db: Session) -> dict:
    """Analyze user's performance data to identify skill gaps"""
    
    # Get user's recent performance scores
    recent_scores = db.query(models.PerformanceScore).filter(
        models.PerformanceScore.user_id == user_id
    ).order_by(models.PerformanceScore.created_at.desc()).limit(10).all()
    
    # Get user's fallacy history
    fallacy_counts = db.query(
        models.FallacyLog.fallacy_type,
        func.count(models.FallacyLog.id).label('count')
    ).join(models.ArgumentAnalysis).filter(
        models.ArgumentAnalysis.user_id == user_id
    ).group_by(models.FallacyLog.fallacy_type).all()
    
    # Get user's presentation metrics
    presentation_metrics = db.query(models.PresentationMetric).filter(
        models.PresentationMetric.user_id == user_id
    ).order_by(models.PresentationMetric.created_at.desc()).limit(5).all()
    
    # Calculate averages
    if recent_scores:
        avg_arg_quality = sum(s.argument_quality for s in recent_scores) / len(recent_scores)
        avg_evidence = sum(s.evidence_use for s in recent_scores) / len(recent_scores)
        avg_logic = sum(s.logical_consistency for s in recent_scores) / len(recent_scores)
        avg_rebuttal = sum(s.rebuttal_effectiveness for s in recent_scores) / len(recent_scores)
        avg_comm = sum(s.communication_skills for s in recent_scores) / len(recent_scores)
    else:
        avg_arg_quality = 70.0
        avg_evidence = 65.0
        avg_logic = 75.0
        avg_rebuttal = 68.0
        avg_comm = 72.0
    
    # Calculate average speech pace
    if presentation_metrics:
        avg_wpm = sum(m.speech_pace_wpm for m in presentation_metrics) / len(presentation_metrics)
        avg_filler_count = sum(m.filler_words_count for m in presentation_metrics) / len(presentation_metrics)
    else:
        avg_wpm = 140.0
        avg_filler_count = 5.0
    
    # Identify skill gaps
    gaps = []
    if avg_arg_quality < 75:
        gaps.append("Argument construction")
    if avg_evidence < 70:
        gaps.append("Evidence usage")
    if avg_logic < 75:
        gaps.append("Logical consistency")
    if avg_rebuttal < 70:
        gaps.append("Rebuttal effectiveness")
    if avg_comm < 70:
        gaps.append("Communication skills")
    if avg_wpm < 120 or avg_wpm > 160:
        gaps.append("Speech pacing")
    if avg_filler_count > 8:
        gaps.append("Filler word reduction")
    
    # Identify most common fallacies
    common_fallacies = [f[0] for f in fallacy_counts] if fallacy_counts else []
    
    return {
        "gaps": gaps,
        "common_fallacies": common_fallacies,
        "averages": {
            "argument_quality": avg_arg_quality,
            "evidence": avg_evidence,
            "logic": avg_logic,
            "rebuttal": avg_rebuttal,
            "communication": avg_comm,
            "wpm": avg_wpm,
            "filler_count": avg_filler_count
        }
    }


def generate_recommendations(skill_analysis: dict) -> list:
    """Generate targeted recommendations based on skill analysis"""
    recommendations = []
    
    gaps = skill_analysis["gaps"]
    common_fallacies = skill_analysis["common_fallacies"]
    averages = skill_analysis["averages"]
    
    # Argument construction recommendations
    if "Argument construction" in gaps:
        recommendations.append("Practice claim structuring drills with the 'The Academic' persona to improve argument clarity.")
    
    # Evidence usage recommendations
    if "Evidence usage" in gaps:
        recommendations.append("Complete evidence sourcing exercises focusing on peer-reviewed studies and statistical validation.")
    
    # Logical consistency recommendations
    if "Logical consistency" in gaps:
        recommendations.append("Review logical fallacy patterns and practice identifying unstated assumptions.")
    
    # Rebuttal effectiveness recommendations
    if "Rebuttal effectiveness" in gaps:
        recommendations.append("Engage in multi-turn debate simulations with 'The Strategist' to practice counterargument generation.")
    
    # Communication skills recommendations
    if "Communication skills" in gaps:
        recommendations.append("Practice vocal pacing exercises targeting 130-150 WPM for optimal clarity.")
    
    # Speech pacing recommendations
    if "Speech pacing" in gaps:
        if averages["wpm"] < 120:
            recommendations.append("Increase speech pace through timed speaking exercises to reach 130-150 WPM.")
        else:
            recommendations.append("Slow down speech pace through deliberate pausing exercises to reach 130-150 WPM.")
    
    # Filler word recommendations
    if "Filler word reduction" in gaps:
        recommendations.append("Practice the 'pause instead of fill' technique during debate simulations.")
    
    # Fallacy-specific recommendations
    for fallacy in common_fallacies:
        if fallacy == "Ad Hominem":
            recommendations.append("Review Ad Hominem replacement strategies and practice evidence-focused rebuttals.")
        elif fallacy == "Straw Man":
            recommendations.append("Practice accurate opponent position summarization before refuting arguments.")
        elif fallacy == "False Dilemma":
            recommendations.append("Develop nuance recognition skills to identify middle-ground positions.")
    
    # Default recommendations if no specific gaps
    if not recommendations:
        recommendations.append("Continue advanced debate practice with mixed persona simulations.")
        recommendations.append("Explore new debate topics to broaden argumentation versatility.")
    
    return recommendations


def generate_learning_path(skill_analysis: dict) -> list:
    """Generate personalized learning path based on skill analysis"""
    gaps = skill_analysis["gaps"]
    averages = skill_analysis["averages"]
    
    # Determine overall proficiency level
    overall_avg = sum(averages["averages"].values()) / len(averages["averages"])
    
    if overall_avg >= 85:
        level = "Expert"
        base_modules = [
            "Module 1: Advanced Argument Architecture (Completed)",
            "Module 2: Master-Level Fallacy Defense (Completed)",
            "Module 3: Cross-Examination Tactics (Completed)",
            "Module 4: Rhetorical Flourish & Style (Active)",
            "Module 5: Competitive Debate Strategy (Upcoming)"
        ]
    elif overall_avg >= 75:
        level = "Advanced"
        base_modules = [
            "Module 1: Claims & Premise Structuring (Completed)",
            "Module 2: Real-time Fallacy Shielding (Completed)",
            "Module 3: Parliamentary Flow & Cross-fire Mastery (Active)",
            "Module 4: Advanced Counterargument Generation (Upcoming)"
        ]
    elif overall_avg >= 65:
        level = "Intermediate"
        base_modules = [
            "Module 1: Basic Argument Construction (Completed)",
            "Module 2: Common Fallacy Recognition (Active)",
            "Module 3: Evidence Integration (Upcoming)",
            "Module 4: Rebuttal Fundamentals (Upcoming)"
        ]
    else:
        level = "Beginner"
        base_modules = [
            "Module 1: Introduction to Debate Structure (Active)",
            "Module 2: Basic Claim Formation (Upcoming)",
            "Module 3: Simple Evidence Usage (Upcoming)",
            "Module 4: Foundational Logic (Upcoming)"
        ]
    
    # Customize based on specific gaps
    if "Argument construction" in gaps:
        base_modules.append("Special Focus: Advanced Claim Structuring")
    if "Logical consistency" in gaps:
        base_modules.append("Special Focus: Logical Fallacy Deep Dive")
    if "Rebuttal effectiveness" in gaps:
        base_modules.append("Special Focus: Counterargument Workshop")
    
    return base_modules, level


@router.get("/plan/{user_id}", response_model=schemas.CoachingPlanResponse)
def get_coaching_plan(user_id: int, db: Session = Depends(get_db)):
    # Analyze user's actual performance data
    skill_analysis = analyze_skill_gaps(user_id, db)
    
    # Generate dynamic recommendations
    targeted_recommendations = generate_recommendations(skill_analysis)
    
    # Generate personalized learning path
    learning_path_steps, progress_level = generate_learning_path(skill_analysis)
    
    # Generate skill gap summary
    gaps = skill_analysis["gaps"]
    common_fallacies = skill_analysis["common_fallacies"]
    
    if gaps:
        gap_summary = f"Areas for improvement: {', '.join(gaps)}. "
    else:
        gap_summary = "Strong overall performance across all metrics. "
    
    if common_fallacies:
        gap_summary += f"Most common fallacies: {', '.join(common_fallacies)}. "
    else:
        gap_summary += "Excellent fallacy awareness. "
    
    gap_summary += f"Current proficiency level: {progress_level}."
    
    progress_status = f"{progress_level} Rhetorician"

    # Check whether a coaching plan already exists
    existing_plan = (
        db.query(models.CoachingPlan)
        .filter(models.CoachingPlan.user_id == user_id)
        .first()
    )

    if existing_plan:
        # Update existing plan with new analysis
        existing_plan.skill_gap_summary = gap_summary
        existing_plan.targeted_recommendations = json.dumps(targeted_recommendations)
        existing_plan.learning_path_steps = json.dumps(learning_path_steps)
        existing_plan.progress_status = progress_status
        existing_plan.updated_at = func.now()
        
        db.commit()
        db.refresh(existing_plan)
        
        return {
            "user_id": existing_plan.user_id,
            "skill_gap_summary": existing_plan.skill_gap_summary,
            "targeted_recommendations": json.loads(
                existing_plan.targeted_recommendations
            ),
            "learning_path_steps": json.loads(
                existing_plan.learning_path_steps
            ),
            "progress_status": existing_plan.progress_status
        }

    # Create and save a new coaching plan
    new_plan = models.CoachingPlan(
        user_id=user_id,
        skill_gap_summary=gap_summary,
        targeted_recommendations=json.dumps(targeted_recommendations),
        learning_path_steps=json.dumps(learning_path_steps),
        progress_status=progress_status
    )

    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    return {
        "user_id": new_plan.user_id,
        "skill_gap_summary": new_plan.skill_gap_summary,
        "targeted_recommendations": targeted_recommendations,
        "learning_path_steps": learning_path_steps,
        "progress_status": new_plan.progress_status
    }


@router.get("/analysis/{user_id}")
def get_skill_analysis(user_id: int, db: Session = Depends(get_db)):
    """Get detailed skill analysis without generating a plan"""
    skill_analysis = analyze_skill_gaps(user_id, db)
    
    return {
        "user_id": user_id,
        "skill_gaps": skill_analysis["gaps"],
        "common_fallacies": skill_analysis["common_fallacies"],
        "performance_averages": skill_analysis["averages"],
        "total_sessions_analyzed": len(skill_analysis["gaps"])
    }