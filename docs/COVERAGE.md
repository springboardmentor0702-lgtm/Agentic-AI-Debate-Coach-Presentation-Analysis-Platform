# Specification Coverage

This build maps the supplied PDF and Master Build Specification into these implementation areas:

- **Roles/auth/RBAC:** JWT-style access tokens, refresh tokens, password hashing, protected routes, role-specific API permissions, profiles.
- **Debate:** custom/suggested topics, multiple formats, AI simulation, adaptive provider-backed turns, scoring, replay events.
- **Reasoning:** argument extraction/assessment, eight specified fallacies, educational corrections, counterargument types and challenge questions.
- **Voice:** browser microphone controls and a backend transcription endpoint using Groq speech-to-text when configured, then Demo fallback; estimated/unavailable metric semantics.
- **Presentations:** PPTX validation, python-pptx extraction, notes/text/structure, per-slide presentation mode, speech capture, slide intelligence, heatmap and overall analysis.
- **Social/live:** user search, friend requests, invitations, notifications, private room codes, WebSocket room events, invitation acceptance adds the participant, AI referee endpoint.
- **Coaching:** analytics-backed AI Coach and adaptive seven-day plan.
- **Analytics:** stored score-backed trends, skill graph/radar, fallacy frequency, speech metrics, improvement/practice signals, recommendations.
- **Reports:** PDF and Excel export service.
- **Data:** PostgreSQL structured models; MongoDB flexible artifact storage when configured; local/cloud connection strings via environment variables.
- **Ops:** Docker Compose for frontend/backend/PostgreSQL/MongoDB, health checks, migration/seed scripts, logs/audit records, OpenAPI docs.
- **Demo:** seeded four-role users and deterministic Demo provider; no paid service is required for demonstration.
- **Security:** backend-only secrets, file extension/signature/size checks, ownership checks on private resources, CORS, role authorization and audit records.
- **Testing:** backend API, provider fallback, PPTX parsing, WebSocket smoke test, role smoke test, real Uvicorn health check, and frontend JSX parse-check.

## Verification caveat

The execution environment had no Docker binary and no npm registry/cache access, so Docker container startup and the full Vite dependency installation/build could not be executed here. The frontend source was TypeScript-compiler parse-checked, and the backend was fully exercised with pytest plus live Uvicorn and WebSocket smoke tests. The packaged README documents the exact Docker/npm commands to run in a network-enabled environment.
