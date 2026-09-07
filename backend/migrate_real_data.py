"""One-time repair for existing LOGOS.AI data.

Run from the backend directory with the same DATABASE_URL as the API.
The script is idempotent: rerunning it does not duplicate assignments.
"""

from sqlalchemy.orm import Session

import models
from database import SessionLocal
from services.score_service import save_session_score


def remove_integration_users(db: Session) -> int:
    users = (
        db.query(models.User)
        .filter(
            (models.User.email == "integration-f8afb701@logos.ai")
            | (models.User.full_name == "Integration User")
            | (models.User.email.like("integration-%@logos.ai"))
        )
        .all()
    )
    for user in users:
        session_ids = [row[0] for row in db.query(models.DebateSession.id).filter(models.DebateSession.user_id == user.id).all()]
        analysis_ids = [row[0] for row in db.query(models.ArgumentAnalysis.id).filter(models.ArgumentAnalysis.user_id == user.id).all()]
        if analysis_ids:
            db.query(models.Counterargument).filter(models.Counterargument.analysis_id.in_(analysis_ids)).delete(synchronize_session=False)
            db.query(models.FallacyLog).filter(models.FallacyLog.analysis_id.in_(analysis_ids)).delete(synchronize_session=False)
        db.query(models.ArgumentAnalysis).filter(models.ArgumentAnalysis.user_id == user.id).delete(synchronize_session=False)
        db.query(models.PresentationMetric).filter(models.PresentationMetric.user_id == user.id).delete(synchronize_session=False)
        db.query(models.PerformanceScore).filter(models.PerformanceScore.user_id == user.id).delete(synchronize_session=False)
        db.query(models.SimulationTurn).filter(models.SimulationTurn.user_id == user.id).delete(synchronize_session=False)
        db.query(models.CoachingPlan).filter(models.CoachingPlan.user_id == user.id).delete(synchronize_session=False)
        db.query(models.CoachAssignment).filter(
            (models.CoachAssignment.coach_id == user.id) | (models.CoachAssignment.learner_id == user.id)
        ).delete(synchronize_session=False)
        db.query(models.EducatorCohort).filter(
            (models.EducatorCohort.educator_id == user.id) | (models.EducatorCohort.learner_id == user.id)
        ).delete(synchronize_session=False)
        if session_ids:
            db.query(models.DebateSession).filter(models.DebateSession.id.in_(session_ids)).delete(synchronize_session=False)
        db.delete(user)
    return len(users)


def repair_existing_data(db: Session) -> tuple[int, int, int]:
    removed = remove_integration_users(db)

    completed = db.query(models.DebateSession).filter(models.DebateSession.status == "Completed").all()
    for debate_session in completed:
        save_session_score(db, debate_session)

    learners = db.query(models.User).filter(models.User.role == "Learner").all()
    coaches = db.query(models.User).filter(models.User.role == "Debate Coach").all()
    educators = db.query(models.User).filter(models.User.role == "Educator").all()
    coach_links = 0
    educator_links = 0
    for coach in coaches:
        for learner in learners:
            exists = db.query(models.CoachAssignment).filter_by(coach_id=coach.id, learner_id=learner.id).first()
            if not exists:
                db.add(models.CoachAssignment(coach_id=coach.id, learner_id=learner.id))
                coach_links += 1
    for educator in educators:
        for learner in learners:
            exists = db.query(models.EducatorCohort).filter_by(educator_id=educator.id, learner_id=learner.id).first()
            if not exists:
                db.add(models.EducatorCohort(educator_id=educator.id, learner_id=learner.id, cohort_name="Default Cohort"))
                educator_links += 1
    valid_learner_ids = {learner.id for learner in learners}
    for assignment in db.query(models.CoachAssignment).all():
        if assignment.learner_id not in valid_learner_ids:
            db.delete(assignment)
    for entry in db.query(models.EducatorCohort).all():
        if entry.learner_id not in valid_learner_ids:
            db.delete(entry)
    db.commit()
    return removed, coach_links, educator_links


if __name__ == "__main__":
    with SessionLocal() as db:
        print("Removed users and created roster links:", repair_existing_data(db))
