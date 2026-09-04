# ARGUAI — Final Fresh Build

A Dockerized AI debate, coaching, presentation, social, educator, coach, and administrator platform.

## Fresh start

1. Copy `.env.example` to `.env`.
2. Put your real `GROQ_API_KEY` in `.env`.
3. Run `./START-FRESH.ps1` from PowerShell, or run the commands below.
4. Open **http://localhost:3200**.

### Manual commands

```powershell
Copy-Item .env.example .env
notepad .env
docker compose down -v --remove-orphans
docker compose up -d --build
docker compose ps
```

The `-v` flag intentionally deletes this project's PostgreSQL and MongoDB volumes so the database starts fresh. It does not delete Docker volumes belonging to other projects.

## Services

- Frontend: http://localhost:3200
- Backend health: http://localhost:8200/api/health
- PostgreSQL host port: 55432
- MongoDB host port: 57017

The frontend uses same-origin `/api` calls and Nginx proxies them to the backend, avoiding browser/API port mismatch problems. WebSocket traffic under `/ws/` is proxied too.

## AI

Provider order: **Groq → Gemini → Demo**. Demo Mode is clearly identified if all real providers are unavailable. The browser never receives AI provider secrets.

## Demo accounts

The backend seeds these accounts on a fresh database:

- learner@example.com / Demo1234!
- coach@example.com / Demo1234!
- educator@example.com / Demo1234!
- admin@example.com / Demo1234!

Administrator registration is disabled; the seeded administrator is provisioned by the platform.

## Key product flows

- Learner: dashboard, AI debate, AI practice, live arena, friends, presentations, analysis, coaching, analytics, reports, notifications, profile.
- Coach: dashboard, students, debates, evaluations, skill gaps, analytics, coaching, reports.
- Educator: dashboard, classes, students, rankings, analytics, debates, presentations, reports.
- Administrator: dashboard, users, roles, analytics, AI monitoring, system health, audit logs, reports, settings.
- Debate: short conversational AI turns, browser voice playback, voice input, finish-and-assess, weak-skill coaching prompt, and saved replay/history.
- AI Practice: dedicated practice-only AI workflow separate from the Debates history area.
- Presentation: PPTX upload, slide-by-slide review, explicit captured-speech handling, non-fabricated delivery metrics, and stored presentation scores.
- Social/live: real friend requests, accepted-friend invitations, pending invitation actions, room codes, and WebSocket live debate support.

## Stop everything for this project

```powershell
docker compose down -v --remove-orphans
```

Do not run `docker volume prune` unless you intentionally want to remove unrelated Docker volumes too.
