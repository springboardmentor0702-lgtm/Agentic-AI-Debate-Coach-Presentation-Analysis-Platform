# Milestone Completion Matrix

## Milestone 1 — Initialization, Design & Core Setup
- Authentication: JWT login/register + OAuth2-compatible development handoff.
- RBAC: Learner, Debate Coach, Educator, Administrator roles with protected role dashboards.
- Profiles: experience, topics, domains, goals and coaching preferences.
- Debate sessions: topic, format, position, scheduling/status and history.
- Skill tracking: `/api/v1/skills/me` derives argument, evidence, logic, rebuttal and presentation skills.

## Milestone 2 — Argument Analysis & Fallacy Detection
- Claim extraction and argument strength scoring.
- Clarity, relevance, evidence, logic and persuasiveness.
- All eight specified fallacies with explanation/correction.
- Five counterargument types and challenge questions.
- Persistent analysis/fallacy/counterargument records.

## Milestone 3 — AI Debate Simulation & Coaching
- Parliamentary/AI simulation workflow.
- Multi-turn AI opponent personas.
- Topic-aware and analysis-aware rebuttal selection.
- Dynamic coaching based on fallacies, evidence, logic, clarity and persuasion.
- Personalized coaching plan and learning path.
- Performance dashboard and weighted scoring.

## Milestone 4 — Presentation Analytics, Testing & Deployment
- Faster-Whisper speech-to-text integration.
- Speech pace, filler words, confidence, clarity and engagement metrics.
- PDF and Excel reports.
- Notifications and engagement alerts.
- Docker Compose production-like stack with PostgreSQL + MongoDB.
- Health/operations endpoints and Docker healthchecks.
- GitHub Actions CI for backend and frontend.
- Cloud deployment guide for AWS/Azure container services.

### Production note
Actual deployment to a user's AWS/Azure account requires that account's credentials, networking and managed-service resources. The repository is deployment-ready but this package does not claim a live cloud deployment without those external resources.
