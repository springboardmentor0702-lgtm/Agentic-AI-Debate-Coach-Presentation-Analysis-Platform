# Copilot instructions for the Agentic AI Debate Coach platform

## Project overview
This repository is a monorepo for an AI-powered debate coaching and presentation analysis platform.

- Backend: FastAPI + SQLAlchemy + Pydantic + Alembic
- Frontend: Next.js App Router + TypeScript + Tailwind CSS
- Data layer: PostgreSQL via Docker Compose
- Runtime workflow: local development with Docker Compose, or direct backend/frontend startup scripts

## Core responsibilities
- Keep the backend and frontend code decoupled unless a shared contract is intentionally introduced.
- Prefer small, incremental changes that match the existing architecture and naming conventions.
- Maintain the API contract and health checks when modifying backend routes or frontend service calls.
- Favor configuration-driven behavior and environment variables over hardcoded values.

## Backend conventions
- Work under the `backend/` package structure: `app/api`, `app/core`, `app/db`, `app/models`, `app/schemas`, `app/services`, `app/repositories`, and `app/tests`.
- Keep FastAPI route modules organized by versioned API namespace.
- Validate changes with `pytest` when touching backend logic or tests.
- Use environment variables defined in `.env.example` and avoid introducing required secrets without documentation.

## Frontend conventions
- Keep feature work under `frontend/app`, `frontend/components`, `frontend/features`, `frontend/services`, and `frontend/lib`.
- Use TypeScript and keep type safety in mind when adding new API responses or component props.
- Prefer existing service wrappers and app layout patterns before creating new abstractions.
- Validate UI changes with `npm run lint` and `npm run build` when relevant.

## Local development workflow
- Docker Compose is the default local environment entry point:
  - `cp .env.example .env`
  - `docker compose up --build`
- Backend direct development:
  - `cd backend`
  - `python -m venv .venv`
  - `.venv\Scripts\activate`
  - `pip install -r requirements.txt`
  - `uvicorn app.main:app --reload`
- Frontend direct development:
  - `cd frontend`
  - `npm install`
  - `npm run dev`

## Quality bar
- Preserve the health check endpoints and startup behavior.
- Do not silently remove environment variables or required config.
- Add or update tests for behavior changes when practical.
- Keep documentation aligned with the code when user-visible behavior changes.

## Guardrails
- Do not commit secrets or personal credentials.
- Do not introduce broad refactors unrelated to the task.
- Do not bypass the project’s existing monorepo structure or Docker-first local workflow without a clear reason.
