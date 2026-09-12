from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user, require_role
import routers.simulation as simulation_router
from services.runtime_metrics import get_runtime_seconds
import models


router = APIRouter(
    prefix="/api/v1/dashboards",
    tags=["Dashboard & Analytics"]
)


# ============================================================
# LEARNER DASHBOARD
# ============================================================

@router.get("/learner/me")
def get_learner_dashboard(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return the authenticated learner's dashboard analytics.

    All learner metrics are calculated from database records.
    """

    # --------------------------------------------------------
    # Debate sessions
    # --------------------------------------------------------

    sessions = (
        db.query(models.DebateSession)
        .filter(
            models.DebateSession.user_id == current_user.id
        )
        .order_by(
            models.DebateSession.created_at.desc()
        )
        .all()
    )

    completed_sessions = [
        session
        for session in sessions
        if session.status == "Completed"
    ]

    # --------------------------------------------------------
    # Performance scores
    # --------------------------------------------------------

    scores = (
        db.query(models.PerformanceScore)
        .filter(
            models.PerformanceScore.user_id == current_user.id
        )
        .order_by(
            models.PerformanceScore.created_at.asc()
        )
        .all()
    )

    # --------------------------------------------------------
    # Fallacy records
    # --------------------------------------------------------

    fallacies = (
        db.query(models.FallacyLog)
        .filter(
            models.FallacyLog.user_id == current_user.id
        )
        .all()
    )

    # --------------------------------------------------------
    # Presentation metrics
    # --------------------------------------------------------

    presentation_metrics = (
        db.query(models.PresentationMetric)
        .filter(
            models.PresentationMetric.user_id == current_user.id
        )
        .order_by(
            models.PresentationMetric.created_at.desc()
        )
        .all()
    )

    # --------------------------------------------------------
    # Score lookup by session
    # --------------------------------------------------------

    score_by_session = {}

    for score in scores:
        score_by_session[score.session_id] = score

    # --------------------------------------------------------
    # Overall score
    # --------------------------------------------------------

    overall_scores = [
        float(score.overall_weighted_score)
        for score in scores
        if score.overall_weighted_score is not None
    ]

    average_overall_score = (
        round(
            sum(overall_scores) / len(overall_scores),
            1
        )
        if overall_scores
        else 0.0
    )

    # --------------------------------------------------------
    # Recent performance trend
    # --------------------------------------------------------

    recent_scores = [
        round(float(score.overall_weighted_score), 1)
        for score in scores[-10:]
        if score.overall_weighted_score is not None
    ]

    # --------------------------------------------------------
    # Top detected fallacy
    # --------------------------------------------------------

    fallacy_counts = Counter(
        fallacy.fallacy_type
        for fallacy in fallacies
        if fallacy.fallacy_type
    )

    top_fallacy = (
        fallacy_counts.most_common(1)[0][0]
        if fallacy_counts
        else None
    )

    # --------------------------------------------------------
    # Average helper
    # --------------------------------------------------------

    def average_score_field(field_name):
        values = []

        for score in scores:
            value = getattr(
                score,
                field_name,
                None
            )

            if value is not None:
                values.append(float(value))

        return (
            round(
                sum(values) / len(values),
                1
            )
            if values
            else 0.0
        )

    # --------------------------------------------------------
    # Debate history
    # --------------------------------------------------------

    debate_history = []

    for session in completed_sessions:

        score = score_by_session.get(session.id)

        debate_history.append({
            "id": session.id,
            "topic": session.topic,
            "format": session.format,
            "position": session.assigned_position,
            "status": session.status,
            "date": (
                session.created_at.isoformat()
                if session.created_at
                else None
            ),
            "score": (
                round(
                    float(score.overall_weighted_score),
                    1
                )
                if score
                and score.overall_weighted_score is not None
                else None
            ),
            "argument_quality": (
                round(
                    float(score.argument_quality),
                    1
                )
                if score
                and score.argument_quality is not None
                else None
            ),
            "evidence_use": (
                round(
                    float(score.evidence_use),
                    1
                )
                if score
                and score.evidence_use is not None
                else None
            ),
            "logical_consistency": (
                round(
                    float(score.logical_consistency),
                    1
                )
                if score
                and score.logical_consistency is not None
                else None
            ),
            "rebuttal_effectiveness": (
                round(
                    float(score.rebuttal_effectiveness),
                    1
                )
                if score
                and score.rebuttal_effectiveness is not None
                else None
            ),
            "communication_skills": (
                round(
                    float(score.communication_skills),
                    1
                )
                if score
                and score.communication_skills is not None
                else None
            )
        })

    # --------------------------------------------------------
    # Presentation history
    # --------------------------------------------------------

    presentation_history = []

    for metric in presentation_metrics:

        related_session = (
            db.query(models.DebateSession)
            .filter(
                models.DebateSession.id == metric.session_id
            )
            .first()
        )

        presentation_history.append({
            "id": metric.id,
            "session_id": metric.session_id,
            "title": (
                related_session.title
                if related_session
                else f"Presentation Analysis #{metric.id}"
            ),
            "topic": (
                related_session.topic
                if related_session
                else None
            ),
            "duration": (f"{int(metric.audio_duration_seconds // 60)}m {int(metric.audio_duration_seconds % 60)}s" if metric.audio_duration_seconds is not None and metric.audio_duration_seconds > 0 and metric.audio_duration_seconds >= 60 else f"{int(metric.audio_duration_seconds)}s" if metric.audio_duration_seconds is not None and metric.audio_duration_seconds > 0 else "N/A"),
            "wpm": (
                round(
                    float(metric.speech_pace_wpm),
                    1
                )
                if metric.speech_pace_wpm is not None
                else None
            ),
            "fillerWords": (
                int(metric.filler_words_count)
                if metric.filler_words_count is not None
                else 0
            ),
            "confidence": (
                f"{round(float(metric.confidence_score), 1)}%"
                if metric.confidence_score is not None
                else "—"
            ),
            "clarity": (
                f"{round(float(metric.clarity_score), 1)}%"
                if metric.clarity_score is not None
                else "—"
            ),
            "engagement": (
                f"{round(float(metric.engagement_score), 1)}%"
                if metric.engagement_score is not None
                else "—"
            ),
            "created_at": (
                metric.created_at.isoformat()
                if metric.created_at
                else None
            )
        })

    # --------------------------------------------------------
    # Skill matrix
    # --------------------------------------------------------

    skill_matrix = {
        "logical_consistency":
            average_score_field(
                "logical_consistency"
            ),

        "argument_construction":
            average_score_field(
                "argument_quality"
            ),

        "evidence_strength":
            average_score_field(
                "evidence_use"
            ),

        "rebuttal_effectiveness":
            average_score_field(
                "rebuttal_effectiveness"
            ),

        "communication_skills":
            average_score_field(
                "communication_skills"
            )
    }

    # --------------------------------------------------------
    # Recommended exercises
    # --------------------------------------------------------

    if scores or presentation_metrics:

        recommended_exercises = [
            "Review your latest debate performance.",
            "Complete a vocal pacing analysis.",
            "Practice fallacy detection and rebuttal drills."
        ]

    else:

        recommended_exercises = [
            "Start your first AI debate simulation.",
            "Perform a vocal metrics speech analysis.",
            "Complete your first debate performance evaluation."
        ]

    # --------------------------------------------------------
    # Return learner dashboard
    # --------------------------------------------------------

    return {
        "role": current_user.role,
        "user_id": current_user.id,

        "total_debates_completed":
            len(completed_sessions),

        "average_overall_score":
            average_overall_score,

        "recent_performance_trend":
            recent_scores,

        "top_fallacy":
            top_fallacy,

        "debate_history":
            debate_history,

        "presentation_history":
            presentation_history,

        "skill_matrix":
            skill_matrix,

        "recommended_exercises":
            recommended_exercises
    }


# ============================================================
# LEGACY LEARNER DASHBOARD
# ============================================================

@router.get("/learner/{user_id}")
def get_learner_dashboard_legacy(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own dashboard."
        )

    return get_learner_dashboard(
        current_user=current_user,
        db=db
    )
# ============================================================
# DEBATE COACH DASHBOARD
# ============================================================

@router.get("/coach/me")
def get_coach_dashboard(
    current_user: models.User = Depends(
        require_role(["Debate Coach", "Administrator"])
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Get all learners from the database
    # --------------------------------------------------------

    if current_user.role == "Debate Coach":
        students = (
            db.query(models.User)
            .filter(
                models.User.role == "Learner",
                models.User.coach_id == current_user.id
            )
            .all()
        )
    else:
        students = (
            db.query(models.User)
            .filter(
                models.User.role == "Learner"
            )
            .all()
        )

    learner_ids = [
        student.id
        for student in students
    ]

    # --------------------------------------------------------
    # Get all performance scores belonging to learners
    # --------------------------------------------------------

    scores = (
        db.query(models.PerformanceScore)
        .filter(
            models.PerformanceScore.user_id.in_(
                learner_ids
            )
        )
        .all()
        if learner_ids
        else []
    )

    # --------------------------------------------------------
    # Class Performance Average
    # --------------------------------------------------------

    overall_scores = [
        float(score.overall_weighted_score)
        for score in scores
        if score.overall_weighted_score is not None
    ]


    # --------------------------------------------------------
    # Calculate individual learner averages
    # --------------------------------------------------------

    averages = {}

    for score in scores:

        if score.overall_weighted_score is None:
            continue

        if score.user_id not in averages:

            averages[score.user_id] = {
                "overall": [],
                "logic": [],
                "communication": []
            }

        averages[
            score.user_id
        ]["overall"].append(
            float(score.overall_weighted_score)
        )

        if score.logical_consistency is not None:

            averages[
                score.user_id
            ]["logic"].append(
                float(score.logical_consistency)
            )

        if score.communication_skills is not None:

            averages[
                score.user_id
            ]["communication"].append(
                float(score.communication_skills)
            )

    # --------------------------------------------------------
    # Build top performer ranking
    # --------------------------------------------------------

    ranked = []

    for user_id, values in averages.items():

        learner = (
            db.query(models.User)
            .filter(
                models.User.id == user_id
            )
            .first()
        )

        if not learner:
            continue

        if not values["overall"]:
            continue

        overall = (
            sum(values["overall"])
            / len(values["overall"])
        )

        logic = (
            sum(values["logic"])
            / len(values["logic"])
            if values["logic"]
            else None
        )

        communication = (
            sum(values["communication"])
            / len(values["communication"])
            if values["communication"]
            else None
        )

        ranked.append({
            "user_id": learner.id,
            "name": learner.full_name,
            "score": round(overall, 1),
            "logic": (
                round(logic, 1)
                if logic is not None
                else None
            ),
            "clarity": (
                round(communication, 1)
                if communication is not None
                else None
            )
        })

    ranked.sort(
        key=lambda student: student["score"],
        reverse=True
    )

    for index, student in enumerate(
        ranked,
        start=1
    ):
        student["rank"] = index

    # --------------------------------------------------------
    # Class Performance Average
    # --------------------------------------------------------

    class_performance_average = (
        sum(student["score"] for student in ranked) / len(ranked)
        if ranked
        else 0.0
    )

    # --------------------------------------------------------
    # Fallacy analysis
    # --------------------------------------------------------

    fallacies = (
        db.query(models.FallacyLog)
        .filter(
            models.FallacyLog.user_id.in_(
                learner_ids
            )
        )
        .all()
        if learner_ids
        else []
    )

    fallacy_counts = Counter(
        fallacy.fallacy_type
        for fallacy in fallacies
        if fallacy.fallacy_type
    )

    # --------------------------------------------------------
    # Presentation metrics
    # --------------------------------------------------------

    presentation_metrics = (
        db.query(models.PresentationMetric)
        .filter(
            models.PresentationMetric.user_id.in_(
                learner_ids
            )
        )
        .all()
        if learner_ids
        else []
    )

    # --------------------------------------------------------
    # Average speaking pace
    # --------------------------------------------------------

    pace_values = [
        float(metric.speech_pace_wpm)
        for metric in presentation_metrics
        if metric.speech_pace_wpm is not None
    ]

    average_pace = (
        sum(pace_values) / len(pace_values)
        if pace_values
        else None
    )

    # --------------------------------------------------------
    # Average evidence strength
    # --------------------------------------------------------

    evidence_scores = [
        float(score.evidence_use)
        for score in scores
        if score.evidence_use is not None
    ]

    average_evidence = (
        sum(evidence_scores)
        / len(evidence_scores)
        if evidence_scores
        else None
    )

    # --------------------------------------------------------
    # Class skill gaps
    # --------------------------------------------------------

    skill_gaps = []

    if fallacy_counts:

        top_fallacy, fallacy_count = (
            fallacy_counts.most_common(1)[0]
        )

        skill_gaps.append({
            "type": "fallacy",
            "name": top_fallacy,
            "count": fallacy_count,
            "message": (
                f"{top_fallacy} detected in "
                f"{fallacy_count} learner analyses."
            )
        })

    if (
        average_evidence is not None
        and average_evidence < 70
    ):

        skill_gaps.append({
            "type": "evidence",
            "name": "Evidence Strength",
            "value": round(
                average_evidence,
                1
            ),
            "message": (
                "Evidence strength needs improvement. "
                f"Learner average: "
                f"{average_evidence:.1f}%."
            )
        })

    if (
        average_pace is not None
        and average_pace > 165
    ):

        skill_gaps.append({
            "type": "pace",
            "name": "Speaking Pace",
            "value": round(
                average_pace,
                1
            ),
            "message": (
                f"Average speaking pace is "
                f"{average_pace:.1f} WPM. "
                "Pacing practice is recommended."
            )
        })

    # --------------------------------------------------------
    # If there are no problems in the available data
    # --------------------------------------------------------

    if not skill_gaps:

        skill_gaps.append({
            "type": "info",
            "name": "No Major Skill Gaps",
            "message": (
                "No major skill gaps detected "
                "from the available learner data."
            )
        })

    # --------------------------------------------------------
    # Get debate sessions
    # --------------------------------------------------------

    sessions = (
        db.query(models.DebateSession)
        .filter(
            models.DebateSession.user_id.in_(
                learner_ids
            )
        )
        .order_by(
            models.DebateSession.created_at.desc()
        )
        .all()
        if learner_ids
        else []
    )

    # --------------------------------------------------------
    # Pending evaluations
    #
    # A completed debate without a performance score
    # is considered pending evaluation.
    # --------------------------------------------------------

    scored_session_ids = {
        score.session_id
        for score in scores
        if score.session_id is not None
        and score.overall_weighted_score is not None
    }

    pending_evaluations = sum(
        1
        for session in sessions
        if session.status == "Completed"
        and session.id not in scored_session_ids
    )

    # --------------------------------------------------------
    # Student progress roster
    # --------------------------------------------------------

    student_roster = []

    for student in students:

        # ----------------------------------------------------
        # Student sessions
        # ----------------------------------------------------

        student_sessions = [
            session
            for session in sessions
            if session.user_id == student.id
        ]

        latest_session = (
            student_sessions[0]
            if student_sessions
            else None
        )

        # ----------------------------------------------------
        # Student scores
        # ----------------------------------------------------

        student_scores = [
            score
            for score in scores
            if score.user_id == student.id
        ]

        latest_score = (
            max(
                student_scores,
                key=lambda score: (
                    score.created_at
                    or ""
                )
            )
            if student_scores
            else None
        )

        # ----------------------------------------------------
        # Student fallacies
        # ----------------------------------------------------

        student_fallacies = [
            fallacy
            for fallacy in fallacies
            if fallacy.user_id == student.id
        ]

        student_fallacy_counts = Counter(
            fallacy.fallacy_type
            for fallacy in student_fallacies
            if fallacy.fallacy_type
        )

        top_logic_gap = (
            student_fallacy_counts
            .most_common(1)[0][0]
            if student_fallacy_counts
            else "No fallacies recorded"
        )

        # ----------------------------------------------------
        # Student roster entry
        # ----------------------------------------------------

        student_roster.append({
            "user_id": student.id,

            "name": (
                student.full_name
                or student.email
            ),

            "topic": (
                latest_session.topic
                if latest_session
                else "No debate session recorded"
            ),

            "grade": (
                f"{float(latest_score.overall_weighted_score):.1f}%"
                if latest_score
                and latest_score.overall_weighted_score
                is not None
                else "Not graded"
            ),

            "gap": top_logic_gap,

            "latest_session_status": (
                latest_session.status
                if latest_session
                else None
            )
        })

    # --------------------------------------------------------
    # Return complete Coach dashboard data
    # --------------------------------------------------------

    return {
        "role": current_user.role,

        # Real learner count from database
        "assigned_students_count": len(
            students
        ),

        # Real average calculated from PerformanceScore
        "class_performance_average": round(
            class_performance_average,
            1
        ),

        # Real pending completed sessions
        "pending_evaluations":
            pending_evaluations,

        # Real ranked learners
        "top_performers":
            ranked[:5],

        # Real student records
        "student_roster":
            student_roster,

        # Real class weaknesses
        "class_skill_gaps":
            skill_gaps,

        # Real presentation metrics
        "average_speaking_pace": (
            round(average_pace, 1)
            if average_pace is not None
            else None
        ),

        "average_evidence_strength": (
            round(average_evidence, 1)
            if average_evidence is not None
            else None
        )
    }


# ============================================================
# LEGACY DEBATE COACH DASHBOARD
# ============================================================

@router.get("/coach/{user_id}")
def get_coach_dashboard_legacy(
    user_id: int,
    current_user: models.User = Depends(
        require_role(
            ["Debate Coach", "Administrator"]
        )
    ),
    db: Session = Depends(get_db)
):

    return get_coach_dashboard(
        current_user=current_user,
        db=db
    )
# ============================================================
# EDUCATOR DASHBOARD
# ============================================================

@router.get("/educator/me")
def get_educator_dashboard(
    current_user: models.User = Depends(
        require_role(
            ["Educator", "Administrator"]
        )
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Total learners from database
    # --------------------------------------------------------

    learner_count = (
        db.query(models.User)
        .filter(
            models.User.role == "Learner"
        )
        .count()
    )

    # --------------------------------------------------------
    # Debate sessions from database
    # --------------------------------------------------------

    sessions = (
        db.query(models.DebateSession)
        .all()
    )

    # --------------------------------------------------------
    # Performance scores from database
    # --------------------------------------------------------

    scores = (
        db.query(models.PerformanceScore)
        .all()
    )

    # --------------------------------------------------------
    # Class average
    # --------------------------------------------------------

    valid_scores = [
        float(score.overall_weighted_score)
        for score in scores
        if score.overall_weighted_score is not None
    ]

    average_class_score = (
        sum(valid_scores) / len(valid_scores)
        if valid_scores
        else 0.0
    )

    # --------------------------------------------------------
    # Topics from actual debate sessions
    # --------------------------------------------------------

    topics = list(
        dict.fromkeys(
            session.topic
            for session in sessions
            if session.topic
        )
    )

    # --------------------------------------------------------
    # Return educator dashboard
    # --------------------------------------------------------

    return {
        "role": current_user.role,

        "total_enrolled_students":
            learner_count,

        "average_class_score":
            round(
                average_class_score,
                1
            ),

        "debate_topics_assigned":
            topics,

        # There is currently no Class model in the
        # available database structure, so active_classes
        # cannot be calculated from real class records.
        "active_classes": None
    }


# ============================================================
# LEGACY EDUCATOR DASHBOARD
# ============================================================

@router.get("/educator/{user_id}")
def get_educator_dashboard_legacy(
    user_id: int,
    current_user: models.User = Depends(
        require_role(
            ["Educator", "Administrator"]
        )
    ),
    db: Session = Depends(get_db)
):

    return get_educator_dashboard(
        current_user=current_user,
        db=db
    )


# ============================================================
# ADMINISTRATOR DASHBOARD
# ============================================================

@router.get("/admin")
def get_admin_dashboard(
    current_user: models.User = Depends(
        require_role(["Administrator"])
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Platform users
    # --------------------------------------------------------

    platform_users_total = (
        db.query(models.User)
        .count()
    )

    # --------------------------------------------------------
    # User role counts
    # --------------------------------------------------------

    learner_count = (
        db.query(models.User)
        .filter(
            models.User.role == "Learner"
        )
        .count()
    )

    coach_count = (
        db.query(models.User)
        .filter(
            models.User.role == "Debate Coach"
        )
        .count()
    )

    educator_count = (
        db.query(models.User)
        .filter(
            models.User.role == "Educator"
        )
        .count()
    )

    # --------------------------------------------------------
    # Debate sessions
    # --------------------------------------------------------

    total_debates = (
        db.query(models.DebateSession)
        .count()
    )

    completed_debates = (
        db.query(models.DebateSession)
        .filter(
            models.DebateSession.status == "Completed"
        )
        .count()
    )

    # --------------------------------------------------------
    # Performance scores
    # --------------------------------------------------------

    scores = (
        db.query(models.PerformanceScore)
        .all()
    )

    valid_scores = [
        float(score.overall_weighted_score)
        for score in scores
        if score.overall_weighted_score is not None
    ]

    average_platform_score = (
        sum(valid_scores)
        / len(valid_scores)
        if valid_scores
        else 0.0
    )

    # --------------------------------------------------------
    # Presentation metrics
    # --------------------------------------------------------

    presentation_metrics = (
        db.query(models.PresentationMetric)
        .all()
    )

    # --------------------------------------------------------
    # Average speaking pace
    # --------------------------------------------------------

    pace_values = [
        float(metric.speech_pace_wpm)
        for metric in presentation_metrics
        if metric.speech_pace_wpm is not None
    ]

    average_speaking_pace = (
        sum(pace_values)
        / len(pace_values)
        if pace_values
        else None
    )

    # --------------------------------------------------------
    # Fallacy statistics
    # --------------------------------------------------------

    fallacies = (
        db.query(models.FallacyLog)
        .all()
    )

    fallacy_counts = Counter(
        fallacy.fallacy_type
        for fallacy in fallacies
        if fallacy.fallacy_type
    )

    # --------------------------------------------------------
    # Return administrator dashboard
    # --------------------------------------------------------

    user_directory = [
        {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "status": "Active"
        }
        for user in db.query(models.User).order_by(models.User.id).all()
    ]
    return {
        "users": user_directory,
        "inference_latency_ms": simulation_router.LATEST_INFERENCE_LATENCY_MS,
        "system_runtime_seconds": get_runtime_seconds(),
        "role": current_user.role,

        "platform_users_total":
            platform_users_total,

        "learner_count":
            learner_count,

        "coach_count":
            coach_count,

        "educator_count":
            educator_count,

        "total_debates":
            total_debates,

        "completed_debates":
            completed_debates,

        "average_platform_score":
            round(
                average_platform_score,
                1
            ),

        "average_speaking_pace": (
            round(
                average_speaking_pace,
                1
            )
            if average_speaking_pace is not None
            else None
        ),

        "fallacy_counts":
            dict(fallacy_counts)
    }























