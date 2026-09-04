# ARGUEAI — Professional Real-Time Product Architecture

## Product rule
Every dashboard value must be derived from records belonging to the authenticated user, their authorized roster/class, or platform-wide operational records available to an administrator. New accounts have no activity until they create it.

## Identity and ownership
- Users register with first name, last name, email, password and role.
- Passwords are hashed server-side.
- JWT authentication protects API and WebSocket access.
- Coaches see only learners explicitly assigned to them.
- Educators see only classes they own and members of those classes.
- Learners see their own private activity, history, scores and reports.
- Administrators are provisioned rather than self-granted through public registration.

## Real-time architecture
- REST APIs handle authentication, CRUD, historical analytics and reports.
- WebSockets handle live debate rooms and presence.
- PostgreSQL stores relational source-of-truth records.
- MongoDB stores flexible AI/analysis artifacts.
- Background processing is used for expensive presentation/report/speech workflows where configured.

## AI provider policy
1. Groq is primary.
2. Gemini is fallback.
3. Demo Mode is final fallback.
4. Ollama is not required.
5. A response is labeled with the provider that actually produced it.

## Analytics policy
No hard-coded production metrics. A new user receives zero counts and no score. Scores appear only after an assessment is completed. Improvement requires historical assessments.

## Live friend debate lifecycle
Search real user -> friend request -> acceptance -> invitation -> acceptance -> authorized WebSocket room -> persisted messages -> AI referee -> persisted scores -> both users' histories updated.

## Role dashboards
### Learner
Practice, debate, analysis, presentations, analytics, coaching, friends, notifications and reports.

### Coach
Owned learner roster, pending reviews, learner performance, evaluations, skill gaps, coaching and reports.

### Educator
Owned classes, learner membership, class performance, rankings, debates, presentations and reports.

### Administrator
Users, roles, analytics, AI monitoring, system health, audit logs, reports and settings.
