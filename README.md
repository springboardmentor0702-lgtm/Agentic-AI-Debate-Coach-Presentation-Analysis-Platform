# LOGOS.AI

**Agentic AI Debate Coach & Presentation Analysis Platform.**

A full-stack application that evaluates how a learner argues and
presents — scoring logic, catching fallacies, generating
counterarguments, simulating a live debate opponent, and analyzing
speech delivery — across four dashboards: Learner, Debate Coach,
Educator, and Admin.

---

## Architecture

React/Next.js talks to a FastAPI backend over authenticated REST
calls (`/api/v1/*`); the backend persists data via SQLAlchemy
(SQLite by default, Postgres/MongoDB-ready) and calls out to **Groq**
as the primary LLM provider, with automatic fallback to **Google
Gemini** if Groq is unavailable. A dedicated `ai-ml/` module hosts
the six reasoning agents behind a shared `BaseAgent` pattern, and
`faster-whisper` handles speech-to-text transcription for the
presentation-analysis module.

```
Browser  →  Next.js Frontend (:3000)  →  FastAPI Backend (:8000, /api/v1/*)
                                              │
                                              ├──▶  AI Agents (Groq → Gemini fallback)
                                              ├──▶  faster-whisper (speech-to-text)
                                              └──▶  SQLite / PostgreSQL + MongoDB
```

---

## What it does

- **Argument Analysis** — scores claim clarity, evidence strength,
  relevance, logical consistency, and persuasiveness (1–10 each).
- **Logic Audit (Fallacy Detection)** — flags 8 fallacy types in real
  time (*Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal
  to Authority, Circular Reasoning, Hasty Generalization, Red
  Herring*) with correction suggestions.
- **Rebuttal Generation** — multi-perspective counterarguments
  (logical, evidence-based, ethical, practical, policy).
- **AI Debate Simulation** — a multi-turn AI opponent across 5 debate
  formats (1-on-1, Parliamentary, Oxford, Policy, Public Forum).
- **Presentation Analysis** — speech pace (WPM), filler-word density,
  and confidence scoring from a recording or transcript.
- **Weighted Scoring Model** — one explainable score built from five
  weighted components: Argument Quality (30%), Evidence Usage (20%),
  Logical Consistency (20%), Rebuttal Effectiveness (15%),
  Communication Skills (15%).
- **Coaching Engine** — personalized skill-gap recommendations and
  learning paths.
- **Reports & Export** — session, performance, and coaching reports
  exportable as PDF/Excel.
- **Role-based Dashboards** — tailored views for Learner, Debate
  Coach, Educator, and Admin, plus session scheduling, roster
  management, and notifications.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 14, React 18, Lucide Icons, vanilla CSS |
| Backend | Python, FastAPI, SQLAlchemy, JWT Auth |
| Database | SQLite (default/dev) — PostgreSQL + MongoDB ready |
| AI / LLM | Groq (primary), Google Gemini (automatic fallback) |
| Speech | faster-whisper (speech-to-text) |
| Search | FAISS vector index |
| Reports | ReportLab (PDF), OpenPyXL (Excel) |
| DevOps | Docker, Docker Compose, Render (cloud deployment) |

## Getting started

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt
# copy .env.example to .env and fill in your keys (SECRET_KEY, GROQ_API_KEY, GEMINI_API_KEY)
.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Backend runs at **http://localhost:8000** — interactive API docs at
`http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
# copy .env.example to .env.local (NEXT_PUBLIC_API_URL=http://localhost:8000)
npm run dev
```

Frontend runs at **http://localhost:3000**.

### AI/ML module (standalone agents)

```bash
cd ai-ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
# copy .env.example to .env and add GROQ_API_KEY / GEMINI_API_KEY
python -m app.run_flow
```

## Running with Docker

```bash
docker-compose up --build
```

This builds and runs both `backend` (port 8000) and `frontend` (port
3000) from `Dockerfile.backend` and `Dockerfile.frontend`.

## Testing

- **Backend tests:** `backend/tests/test_agent_bridge.py`,
  `backend/test_api.py` (live API smoke test against a running
  server), `backend/test_ai_backend.py`
- **AI/ML agent tests:** `ai-ml/tests/test_agents_demo.py`,
  `ai-ml/tests/test_fallacies.py`, `ai-ml/tests/test_new_agents.py`

```bash
# Run backend tests
cd backend
pytest

# Run AI/ML agent tests
cd ai-ml
python tests/test_agents_demo.py
python tests/test_fallacies.py
```

## Deployment

Deployed on Render's free tier (backend + frontend as separate Docker
web services):

- **Frontend:** https://logos-ai-frontend.onrender.com
- **Backend API docs:** https://logos-ai-backend.onrender.com/docs

> Free-tier instances spin down after inactivity — the first request
> after idle time may take 30–50 seconds to respond while the service
> wakes up.

## Documentation

| Document | What it's for |
|---|---|
| [`README.md`](README.md) | Project overview, setup, deployment (this file) |
| [`BACKEND_AIML_ANALYSIS.md`](BACKEND_AIML_ANALYSIS.md) | Detailed backend + AI/ML module technical analysis |
| [`ai-ml/README.md`](ai-ml/README.md) | AI/ML agents: setup, agent architecture, run instructions |

## Project structure

```
Springboard-Project/
├── backend/            FastAPI app: routers, services, models, tests
│   ├── routers/        auth, sessions, argument_analysis, fallacy_detection,
│   │                   counterarguments, simulation, scoring, coaching,
│   │                   dashboards, roster_management, reports, notifications,
│   │                   presentation_analysis
│   └── services/       ai_engine.py, speech_engine.py
├── ai-ml/               Standalone AI agents (BaseAgent pattern)
│   └── app/agents/      argument_analysis, fallacy_detection, counterargument,
│                        opponent, scoring, speech_analysis
├── frontend/            Next.js app (dashboards, simulation terminal, reports)
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
└── BACKEND_AIML_ANALYSIS.md
```

## License

Built as part of the Infosys Springboard Virtual Internship 7.0.
Not currently licensed for reuse.