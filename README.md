# LOGOS.AI: Agentic AI Debate Coach & Presentation Analysis Platform

**LOGOS.AI** is a state-of-the-art, AI-powered Agentic Debate Coach & Presentation Analytics Platform engineered to assist learners, debate coaches, educators, and administrators in mastering high-stakes rhetoric, argument structure, public speaking, and logical fallacy defence.

---

## 🌟 Features

1. **Exact Editorial Design Identity**: Recreated faithfully from visual design mockups featuring a premium white/obsidian/cyber-red palette (`#D90429`), clean monospace accents, `LOGOS.AI` typography, and background `"RHETORIC"` watermarks.
2. **The Analysis Suite (8 Core Modules)**:
   - **Argument Mining**: Automatic claim & evidence extraction.
   - **Logic Audit**: Real-time detection of 8 key fallacies (*Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, Red Herring*).
   - **Rebuttal Gen**: Multi-perspective counterarguments (*Logical, Evidence-Based, Ethical, Practical, Policy*).
   - **Vocal Metrics**: Prosody analysis, WPM speech pace, filler word counter, confidence score.
   - **Simulation Engine**: Multi-turn AI debate opponent across 5 formats (*Parliamentary, Oxford, Policy, 1-on-1, Public Forum*).
   - **Scoring Model**: Exact 5-part weighted performance model ($30\%$ Arg Quality + $20\%$ Evidence + $20\%$ Consistency + $15\%$ Rebuttal + $15\%$ Communication).
   - **Coaching Engine**: Skill gap matrix & personalized learning recommendations.
   - **Analytics Suite**: Tailored dashboards for Learner, Coach, Educator, Admin.
3. **Interactive AI Debate Terminal (`/simulation`)**: Live debate cross-examination terminal with customizable AI opponent personas (*"The Contrarian"*, *"The Academic"*, *"The Strategist"*).
4. **Prosody & Vocal Analytics (`/presentation`)**: Instant WPM calculation, filler word density breakdown, confidence scoring.
5. **Reports & Exports (`/reports`)**: One-click CSV/PDF performance scorecards & certificates.
6. **Notification & Engagement Engine**: Real-time alerts for scheduled sessions, coaching feedback, and milestone achievement alerts.
7. **Vector Context Memory**: Built-in vector embedding indexes for semantic search memory, allowing the AI to recall and cross-reference statements.

---

## 🛠️ Tech Stack

* **Backend**: FastAPI, Pydantic, SQLAlchemy ORM, SQLite/PostgreSQL, MongoDB Document Store
* **Frontend**: Next.js 14, React 18, Vanilla CSS, Lucide Icons
* **DevOps & Containers**: Docker, Docker Compose

---

## 📂 Folder Structure

```
Agentic-AI-Debate-Coach/
├── backend/                  # FastAPI Application
│   ├── routers/              # Microservice API Endpoints
│   ├── services/             # AI Reasoning, Vector DB & Speech Metrics
│   ├── database.py           # SQL/Mongo Dual-Database Engine
│   ├── main.py               # Application Entrypoint
│   ├── requirements.txt      # Python Dependencies
│   └── package.json          # Node wrapper for execution scripts
├── frontend/                 # Next.js Application
│   ├── src/
│   │   ├── app/              # Page layouts & router endpoints
│   │   └── components/       # Premium UI components
│   └── package.json          # Frontend Dependencies & scripts
├── docker-compose.yml        # Multi-container local deployment config
├── Dockerfile.backend        # Backend image specifications
├── Dockerfile.frontend       # Frontend image specifications
└── README.md                 # Professional documentation
```

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
* Node.js (v18.x or later)
* Python (3.10 or later)
* Git
* PostgreSQL & MongoDB (Optional: SQLite Fallback active by default)

---

## 💻 Local Setup Instructions

Running the application locally requires opening two terminal windows to execute the backend and frontend concurrently:

### 🖥️ Terminal 1 (Backend Server)
Navigate to the `backend/` directory, set up your configuration environment, install dependencies, and start the FastAPI reload server:
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
*(Alternatively, using Python directly: `pip install -r requirements.txt` followed by `uvicorn main:app --reload --port 8000`)*

### 🖥️ Terminal 2 (Next.js Frontend Client)
Navigate to the `frontend/` directory, install dependencies, and run the development hot-reloaded dev client:
```bash
cd frontend
npm install
npm run dev
```

---

## 🔧 Environment Variable Setup

The backend configuration relies on settings stored inside `backend/.env`. Create this file by copying the template file:
```bash
cp backend/.env.example backend/.env
```
Ensure the parameters are filled:
* `POSTGRES_USER` / `POSTGRES_PASSWORD`: Your credentials for local PostgreSQL.
* `MONGO_URI`: Address of your local MongoDB instance.
* `SECRET_KEY`: Cryptographic key used to sign JWT session access tokens.

---

## 🔗 Port Mappings & Backend Connections
* **Frontend Port**: Runs locally on port **`3000`** (`http://localhost:3000`).
* **Backend Port**: Runs locally on port **`8000`** (`http://localhost:8000`).
* **Connection Interface**: The frontend connects to the backend REST API by dispatching async requests to `http://localhost:8000/api/v1/*`. The token retrieved upon authentication is appended inside the standard `Authorization: Bearer <JWT>` request header.

---

## 📦 Build & Production Bundle
To create an optimized production deployment bundle:

### Frontend Build
```bash
cd frontend
npm run build
```

### Run Production Containers (Docker)
```bash
docker-compose up --build
```

---

## ❓ Troubleshooting & Setup Issues

### 1. PostgreSQL/MongoDB Connection Refused
* **Issue**: The server console prints fallback warning messages and switches database handlers.
* **Resolution**: Ensure your local database services are actively running:
  - On Windows (Services App): Ensure PostgreSQL and MongoDB services are marked as "Running".
  - Run database checks by running: `python backend/diagnose_db.py`.

### 2. Port 8000 or 3000 already in use
* **Issue**: Error: `listen EADDRINUSE: address already in use :::8000`.
* **Resolution**: Terminate any lingering background processes or change the port mapping config inside `backend/.env` / `frontend/package.json`.

---

## Current Implementation Status

The repository now contains an end-to-end demonstrable prototype covering the main learner workflow: account registration and login, authenticated debate sessions, deterministic argument and fallacy analysis, five rebuttal perspectives, multi-turn persona simulation, transcript and uploaded-audio presentation analysis, weighted scoring, personalized coaching plans, real-data dashboards, persistent notifications, coach feedback, and authenticated PDF/XLSX reports.

The AI layer supports two modes. `AI_PROVIDER=heuristic` runs locally without credentials using deterministic, explainable rules. `AI_PROVIDER=openai`, `llm`, or `builtin` enables the optional structured model adapter through an OpenAI-compatible endpoint; if a provider call fails, the service returns to the deterministic analyzer instead of failing the user workflow.

Audio analysis requires `ffmpeg` and `ffprobe`. The backend container installs them automatically. The analyzer measures uploaded-audio duration, pauses, silence ratio, average volume, speech pace, filler words, confidence, clarity, and engagement. Audio metrics are persisted with the related debate session.

### Verification commands

```bash
cd backend
python -m compileall -q .
python -m unittest test_ai_backend -v

cd ../frontend
npm install
npm run build
```

### Production checklist

Before deployment, set a strong `SECRET_KEY`, `ENVIRONMENT=production`, a reachable PostgreSQL `DATABASE_URL`, explicit `CORS_ORIGINS`, a real `UPLOAD_DIR`, and provider credentials when using model-backed inference. Do not enable `ALLOW_SELF_ASSIGN_ROLES` in production. Run the backend health check at `/health` and retain the persistent upload/data volume. A production deployment should additionally add a managed migration process, centralized logs/metrics, object storage for audio files, rate limiting, email or push delivery for notifications, and a verified OAuth provider integration.

## 🤝 Contributing Guidelines
1. Fork this repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
