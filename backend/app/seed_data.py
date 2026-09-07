import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from .models import User, UserProfile, DebateSession, DebateTurn, DebateScore, PresentationAnalysis, Notification, LearningPath
from .routers.auth import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "learner@debate.ai").first():
            print("Database already seeded with demo data.")
            return

        print("Seeding database with demo data...")

        # 1. Users for each of the 4 required roles
        users_to_create = [
            {
                "email": "learner@debate.ai",
                "full_name": "Alex Morgan",
                "role": "Learner",
                "exp": "Intermediate",
                "topics": ["Artificial Intelligence", "Climate Policy", "Bioethics", "Economic Inequality"],
                "domains": ["Collegiate Debate", "Keynote Presentations", "Interview Prep"],
                "goals": ["Master Oxford Debate Format", "Eliminate Vocal Fillers", "Overcome Straw Man Attacks"],
                "pref": "Socratic & Challenging"
            },
            {
                "email": "coach@debate.ai",
                "full_name": "Marcus Sterling",
                "role": "Debate Coach",
                "exp": "Champion",
                "topics": ["Parliamentary Procedure", "Rhetorical Strategy", "Cross-Examination"],
                "domains": ["Tournament Adjudication", "Varsity Debate"],
                "goals": ["Coach debaters to National Finals"],
                "pref": "Direct & Tactical"
            },
            {
                "email": "educator@debate.ai",
                "full_name": "Prof. Diana Vance",
                "role": "Educator",
                "exp": "Advanced",
                "topics": ["Public Policy", "Philosophy of Law", "Critical Thinking"],
                "domains": ["Higher Education", "Curriculum Design"],
                "goals": ["Foster dialectical reasoning across undergraduate students"],
                "pref": "Analytical & Academic"
            },
            {
                "email": "admin@debate.ai",
                "full_name": "System Administrator",
                "role": "Administrator",
                "exp": "Champion",
                "topics": ["Platform Architecture", "AI Alignment"],
                "domains": ["System Telemetry"],
                "goals": ["Ensure 99.9% uptime and low inference latency"],
                "pref": "Technical"
            }
        ]

        created_users = {}
        for u_data in users_to_create:
            u = User(
                email=u_data["email"],
                hashed_password=get_password_hash("password123"),
                full_name=u_data["full_name"],
                role=u_data["role"]
            )
            db.add(u)
            db.commit()
            db.refresh(u)

            profile = UserProfile(
                user_id=u.id,
                experience_level=u_data["exp"],
                preferred_topics=json.dumps(u_data["topics"]),
                presentation_domains=json.dumps(u_data["domains"]),
                learning_goals=json.dumps(u_data["goals"]),
                coaching_preferences=u_data["pref"],
                bio=f"{u_data['full_name']} - Active participant in the Agentic AI Debate Coaching Platform."
            )
            db.add(profile)
            created_users[u_data["role"]] = u

        learner = created_users["Learner"]

        # 2. Seed Sample Debate Sessions for the Learner
        session1 = DebateSession(
            user_id=learner.id,
            title="Autonomous AI Decision-Making in High-Stakes Governance",
            topic="Resolved: Autonomous AI algorithms should have binding authority in critical infrastructure policy.",
            format="Oxford Debate",
            user_position="Affirmative",
            opponent_type="AI",
            ai_persona="Dr. Eleanor Vance (Empirical Scholar)",
            status="completed",
            duration_minutes=20,
            created_at=datetime.utcnow() - timedelta(days=2),
            completed_at=datetime.utcnow() - timedelta(days=2, hours=-1)
        )
        db.add(session1)
        db.commit()
        db.refresh(session1)

        turns1 = [
            DebateTurn(
                session_id=session1.id,
                speaker="User (Affirmative)",
                turn_number=1,
                content="Human cognitive bias, fatigue, and electoral incentives systematically distort municipal infrastructure decisions. Algorithmic systems processing real-time telemetry achieve 40% higher efficiency and eliminate corrupt resource diversion."
            ),
            DebateTurn(
                session_id=session1.id,
                speaker="AI Opponent (Dr. Eleanor Vance)",
                turn_number=2,
                content="While efficiency metrics appear alluring, algorithmic models inherit historical training biases and lack democratic accountability. When black-box optimizations fail, citizens have no electoral recourse or constitutional redress."
            ),
            DebateTurn(
                session_id=session1.id,
                speaker="User (Affirmative)",
                turn_number=3,
                content="Our framework does not abandon democratic oversight; it enforces mathematically verifiable constraint boundaries. Transparency is higher with open-source audit trails than backroom legislative lobbying."
            )
        ]
        db.add_all(turns1)
        db.commit()

        # Score for session 1
        score1 = DebateScore(
            session_id=session1.id,
            user_id=learner.id,
            argument_quality=86.0,
            evidence_usage=82.0,
            logical_consistency=89.0,
            rebuttal_effectiveness=84.0,
            communication_skills=88.0,
            overall_score=85.8,
            grade="A",
            strengths=json.dumps(["Crisp rebuttal distinguishing algorithmic authority from total absence of oversight.", "High deductive consistency."]),
            weaknesses=json.dumps(["Cite specific technical audit architectures like differential privacy or cryptographic proofs."]),
            feedback_summary="Excellent round. Handled Dr. Vance's accountability challenge effectively by introducing mathematical constraint boundaries."
        )
        db.add(score1)

        # Active debate session
        session2 = DebateSession(
            user_id=learner.id,
            title="Universal Basic Income vs. Targeted Social Guarantees",
            topic="Resolved: Universal Basic Income is superior to conditional social safety net subsidies.",
            format="Parliamentary Debate",
            user_position="Affirmative",
            opponent_type="AI",
            ai_persona="Marcus Reed (Aggressive Cross-Examiner)",
            status="active",
            duration_minutes=15,
            created_at=datetime.utcnow() - timedelta(hours=3)
        )
        db.add(session2)
        db.commit()

        # 3. Seed Presentation Analysis
        speech1 = PresentationAnalysis(
            user_id=learner.id,
            title="Keynote: The Future of Dialectical Reasoning with AI",
            transcript="Good morning esteemed colleagues. Today I want to address a question that touches the core of human inquiry. Are we using artificial intelligence merely to generate answers, or can we harness it to sharpen our own critical thinking? In our trials across 500 collegiate debaters, students practicing against agentic sparring partners showed a 32% increase in evidence recall and a dramatic reduction in cognitive fallacies. Therefore, pair-debating with AI is not a crutch—it is an intellectual sparring dojo.",
            duration_seconds=55.0,
            speech_pace_wpm=145.0,
            filler_words_count=1,
            filler_words_breakdown=json.dumps({"actually": 1}),
            confidence_score=91.0,
            clarity_score=94.0,
            engagement_score=88.0,
            feedback="Masterful delivery. Cadence is locked in the ideal 140-150 WPM pocket. Clean rhetorical contrast and powerful closing metaphor."
        )
        db.add(speech1)

        # 4. Seed Learning Path
        learning_path = LearningPath(
            user_id=learner.id,
            title="Debate & Oratory Championship Track",
            description="Personalized 5-module path focusing on logical consistency, rebuttal agility, and vocal command.",
            progress_percentage=40.0,
            status="in_progress",
            current_level="Intermediate Debater",
            target_level="Championship Finalist",
            milestones_json=json.dumps([
                {"id": 1, "title": "Module 1: Foundations of Propositional Logic", "description": "Master premise-warrant-impact structures.", "duration": "1 week", "completed": True},
                {"id": 2, "title": "Module 2: Advanced Fallacy Neutralization", "description": "Identify and counter Straw Man and False Dilemma in real time.", "duration": "1 week", "completed": True},
                {"id": 3, "title": "Module 3: Evidence Grounding & Empirical Rebuttals", "description": "Strengthen warrants with verified statistics.", "duration": "2 weeks", "completed": False},
                {"id": 4, "title": "Module 4: Rhetorical Delivery & Vocal Command", "description": "Pacing at 140-155 WPM with zero vocal bridges.", "duration": "1 week", "completed": False},
                {"id": 5, "title": "Module 5: Grand Finals Debate Simulation", "description": "Complete full Oxford round against Dr. Vance and Marcus Reed.", "duration": "2 weeks", "completed": False}
            ])
        )
        db.add(learning_path)

        # 5. Seed Notifications
        notifications = [
            Notification(
                user_id=learner.id,
                title="Debate Evaluation Ready",
                message="Coach Marcus reviewed your round on 'Autonomous Governance' and awarded Grade A.",
                type="feedback",
                link="/debates"
            ),
            Notification(
                user_id=learner.id,
                title="Practice Session Reminder",
                message="Your scheduled cross-examination drill with Prof. Sophia Lin starts today at 4:00 PM.",
                type="reminder",
                link="/studio"
            ),
            Notification(
                user_id=learner.id,
                title="Skill Milestone Unlocked!",
                message="Completed Module 2: Advanced Fallacy Neutralization. Your fallacy resistance rating is now 92%.",
                type="milestone",
                link="/pathways"
            )
        ]
        db.add_all(notifications)
        db.commit()

        print("Successfully seeded all demo accounts, debates, scores, presentations, and pathways.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
