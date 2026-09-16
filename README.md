# Agentic AI Debate Coach

Agentic AI Debate Coach is a full-stack debate practice and presentation analysis platform. Learners can practice structured debates, submit typed or spoken arguments, receive AI feedback, detect fallacies, generate counterarguments, analyze presentations, and track progress. Coaches, educators, and administrators have role-based dashboards for reviewing learner activity and managing platform data.

New users should start with [PROJECT_GUIDE.md](PROJECT_GUIDE.md), which contains the current Windows setup commands, service startup order, data architecture, workflows, and troubleshooting FAQ.

This repository contains three separate services:

| Service     | Directory    | Technology                                 | Default URL           | Responsibility                                                                          |
| ----------- | ------------ | ------------------------------------------ | --------------------- | --------------------------------------------------------------------------------------- |
| Frontend    | `frontend/`  | React 19, Vite, Tailwind CSS, React Router | http://localhost:5173 | Browser application and role-based user interface                                       |
| Backend API | `backend/`   | Node.js, Express, Mongoose                 | http://localhost:5000 | Authentication, users, sessions, dashboards, MongoDB persistence, uploads               |
| AI engine   | `ai-engine/` | Python, FastAPI, LangChain, LangGraph      | http://localhost:8000 | Debate reasoning, analysis agents, transcription, presentation analysis, assistant chat |

The frontend calls the Node API for authentication and platform data. It calls the Python AI engine directly for AI analysis and debate workflows.

## Features

### Learner experience

- Account creation and login.
- Learner onboarding and preferred debate formats.
- Typed one-turn debate practice.
- Streaming typed debate replies.
- Voice debate practice with microphone recording, transcription, transcript review, and audio persistence.
- Multi-phase debates with pause, continue, or end decisions.
- Debate formats including One-on-One, Parliamentary, Oxford, Policy, Public Forum, and AI Debate Simulation.
- Difficulty levels: Beginner, Intermediate, and Hard.
- Opponent personas such as LogicBot, PersuadeBot, Aggressive Opponent, Data-Driven Opponent, Formal Opponent, and Accessible Opponent.
- Argument analysis covering clarity, relevance, evidence strength, logical consistency, and persuasiveness.
- Fallacy detection and correction suggestions.
- Delivery analysis covering confidence, clarity, engagement, grammar, pace, words per minute, and filler words.
- Counterargument generation.
- Presentation analysis for `.pptx` and `.pdf` files plus recorded speech.
- AI assistant chat with conversation history and rename support.
- Goals, drafts, notes, scheduled sessions, coaching plans, reports, and skill tracking.

### Coach, educator, and administrator experience

- Coach learner lists, performance analytics, fallacy reports, presentation reviews, plans, notifications, and CSV exports.
- Educator knowledge-base document upload and evidence search.
- Educator classes, assignments, rubrics, announcements, and learner activity.
- Administrator user management, topics, resources, audit logs, support tickets, notices, security/compliance, system health, AI service usage, and top active debates.

## Repository layout

```text
.
├── ai-engine/
│   ├── app/
│   │   ├── agents/       # Multi-agent debate and assistant logic
│   │   ├── config/       # Debate format configuration
│   │   ├── core/         # Environment-backed settings
│   │   ├── schemas/      # Pydantic request and response models
│   │   └── services/     # Analysis, transcription, persistence, and workflow services
│   ├── tests/             # Python tests
│   ├── requirements.txt
│   ├── pytest.ini
│   └── venv/              # Local virtual environment, ignored by Git
├── backend/
│   ├── middleware/        # JWT and role middleware
│   ├── models/            # Mongoose models
│   ├── aiService.js       # Node-side Gemini adapter
│   ├── seedTopics.js      # One-time topic seed script
│   ├── server.js          # Express entrypoint
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/           # Axios clients for Node and Python services
│   │   ├── components/
│   │   ├── pages/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Prerequisites

Install the following before starting the project:

- Windows 10 or newer.
- Node.js. Node 22 is currently used locally; use a current LTS release.
- npm.
- Python 3.11 or newer.
- MongoDB Server running locally on port `27017`.
- PostgreSQL Server running locally on port `5432`.
- A Google Gemini API key for AI requests.
- A working microphone for voice features.

The application currently expects these local database defaults:

- MongoDB: `mongodb://localhost:27017`
- MongoDB database: `debate_platform_database`
- PostgreSQL database: `debate_db`
- PostgreSQL user: `postgres`

## Environment configuration

Do not commit API keys, database passwords, JWT secrets, or `.env` files. The repository ignores `.env` files. The checked-in `.env.example` is only a template; replace any example or previously exposed key before using the application.

### AI engine environment

From `ai-engine/`, create a `.env` file with values appropriate for your machine:

```dotenv
GOOGLE_API_KEY=your_real_google_api_key
REFEREE_MODEL=gemini-flash-latest
OPPONENT_MODEL=gemini-flash-latest
ASSISTANT_MODEL=gemini-flash-latest

MONGO_URL=mongodb://localhost:27017
MONGO_DB_NAME=debate_platform_database
DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/debate_db
CORS_ORIGINS=http://localhost:5173
```

The Python application requires `GOOGLE_API_KEY` during import. It uses `MONGO_URL`, `MONGO_DB_NAME`, and `DATABASE_URL`. On startup it creates or upgrades the PostgreSQL tables used for debate performance and agent performance logging.

### Node backend environment

From `backend/`, create a `.env` file:

```dotenv
MONGO_URI=mongodb://localhost:27017/debate_platform_database
JWT_SECRET=replace_with_a_long_random_secret
GEMINI_API_KEY=your_real_google_api_key
PORT=5000
```

The Node-side adapter in `backend/aiService.js` reads `GEMINI_API_KEY`, while the Python engine reads `GOOGLE_API_KEY`. Set both names to the same Google key when using both AI paths.

For a temporary PowerShell session, environment variables can be set without creating `.env` files:

```powershell
$env:MONGO_URI = "mongodb://localhost:27017/debate_platform_database"
$env:JWT_SECRET = "local-development-secret-change-me"
$env:GEMINI_API_KEY = "your_real_google_api_key"

$env:GOOGLE_API_KEY = "your_real_google_api_key"
$env:MONGO_URL = "mongodb://localhost:27017"
$env:MONGO_DB_NAME = "debate_platform_database"
$env:DATABASE_URL = "postgresql://postgres:your_postgres_password@localhost:5432/debate_db"
$env:CORS_ORIGINS = "http://localhost:5173"
```

## Database setup

### Start MongoDB

If MongoDB is installed as a Windows service:

```powershell
Get-Service MongoDB
Start-Service MongoDB
```

The backend connects to MongoDB when it starts. A MongoDB connection failure is logged by Node and can cause signup, login, sessions, topics, and dashboards to fail.

### Create PostgreSQL database

The PostgreSQL server must be running. Create the application database once, replacing the password with your actual local PostgreSQL password:

```powershell
$env:PGPASSWORD = "your_postgres_password"
createdb -h localhost -U postgres debate_db
Remove-Item Env:PGPASSWORD
```

If `debate_db` already exists, PostgreSQL reports an error and no action is needed. FastAPI creates these tables automatically at startup:

- `debate_performance`
- `agent_performance_log`

### Seed debate topics

The seed script inserts 150 topics across the supported formats and difficulty levels. It skips existing titles and is safe to run again:

```powershell
cd backend
$env:MONGO_URI = "mongodb://localhost:27017/debate_platform_database"
node seedTopics.js
```

## Installation

Run these commands once from the repository root.

### Python dependencies

The repository already contains a Windows virtual environment at `ai-engine/venv` in the current workspace. For a new checkout, create one instead:

```powershell
cd ai-engine
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PowerShell blocks activation, use the interpreter directly as shown in the startup commands below.

### Node dependencies

Install backend dependencies:

```powershell
cd ..\backend
npm install
```

Install frontend dependencies:

```powershell
cd ..\frontend
npm install
```

## Run the complete project

Start each service in its own VS Code terminal. Start MongoDB and PostgreSQL first.

### Terminal 1: Python AI engine

```powershell
cd "C:\path\to\Agentic-AI-Debate-Coach-Presentation-Analysis-Platform--jessica-agentic-ai-debate-coach\ai-engine"
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

If using a `.env` file, no additional environment variables are needed. Without one, set the Python variables from the environment section first.

The correct import path is `app.main:app`. `uvicorn app:app` will not load this project because the FastAPI instance is inside `app/main.py`.

### Terminal 2: Node backend

```powershell
cd "C:\path\to\Agentic-AI-Debate-Coach-Presentation-Analysis-Platform--jessica-agentic-ai-debate-coach\backend"
npm start
```

The backend listens on `http://localhost:5000`.

### Terminal 3: React frontend

```powershell
cd "C:\path\to\Agentic-AI-Debate-Coach-Presentation-Analysis-Platform--jessica-agentic-ai-debate-coach\frontend"
npm run dev
```

Open http://localhost:5173 in a browser. To force the host and port explicitly, use Vite directly:

```powershell
npx vite --host localhost --port 5173
```

Do not use `npm run dev -- --host localhost --port 5173` with the current npm/Vite combination; npm can incorrectly forward the arguments as positional Vite arguments. `npx vite --host localhost --port 5173` avoids that issue.

## Verify services

Run these checks from any PowerShell terminal:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
Invoke-WebRequest http://localhost:5173/
Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 5000,5173,8000
```

Expected results:

- FastAPI `/health` returns HTTP `200` and `{"status":"ok"}`.
- Vite returns HTTP `200` for `/`.
- Node may return HTTP `404` for `/` because no root route is defined; that still confirms the Express process is listening.

## Main API surface

### Node backend: `http://localhost:5000`

- `POST /signup` creates a user.
- `POST /login` authenticates a user and returns a JWT.
- `/profile`, `/topics`, `/session`, `/skills`, `/goals`, `/drafts`, `/notes`, `/support`, `/notifications`, `/admin`, `/coach`, `/educator`, and `/assignments` provide platform features.
- `/uploads/audio/<filename>` serves locally stored uploaded debate recordings.
- Protected routes use the JWT returned by `/login` and role checks for learner, coach, educator, and admin access.

Signup expects JSON containing `name`, `email`, `password`, and one of `Learner`, `Debate Coach`, `Educator`, or `Admin`. `experience` is optional and defaults to `Beginner`.

Example:

```powershell
$body = @{
	name = "Test Learner"
	email = "learner@example.com"
	password = "ChangeThisPassword123!"
	role = "Learner"
	experience = "Beginner"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:5000/signup -ContentType "application/json" -Body $body
```

### Python AI engine: `http://localhost:8000`

Health and metadata:

- `GET /health`
- `GET /api/v1/debate/persona-options`

Debate:

- `POST /api/v1/debate/turn-text`
- `POST /api/v1/debate/turn-text-stream`
- `POST /api/v1/debate/turn`
- `POST /api/v1/debate/turn-stream`
- `POST /api/v1/debate/session/start`
- `POST /api/v1/debate/session/start-stream`
- `POST /api/v1/debate/session/{session_id}/submit`
- `POST /api/v1/debate/session/{session_id}/submit-stream`
- `POST /api/v1/debate/session/{session_id}/continue`
- `POST /api/v1/debate/session/{session_id}/continue-stream`
- `POST /api/v1/debate/transcribe`

Analysis tools:

- `POST /api/v1/tools/argument-analyzer`
- `POST /api/v1/tools/fallacy-detector`
- `POST /api/v1/tools/counterargument-generator`
- `POST /api/v1/presentation/analyze`
- `POST /api/v1/presentation/analyze-full`

Assistant and knowledge base:

- `POST /api/v1/assistant/chat`
- `GET /api/v1/assistant/conversations`
- `GET /api/v1/assistant/conversation/{conversation_id}`
- `PUT /api/v1/assistant/conversation/{conversation_id}/title`
- `POST /api/v1/knowledge/documents`
- `GET /api/v1/knowledge/documents`
- `GET /api/v1/knowledge/search`

The presentation endpoint accepts `.pptx` and `.pdf` documents plus recorded audio. The transcription feature uses `faster-whisper` and may download a model the first time it is used.

## Frontend scripts

Run these from `frontend/`:

```powershell
npm run dev       # Start Vite development server
npm run build     # Create production build in frontend/dist
npm run lint      # Run ESLint
npm run preview   # Preview the production build locally
```

## Tests and validation

### Frontend

```powershell
cd frontend
npm run build
npm run lint
```

### Python

```powershell
cd ai-engine
.\venv\Scripts\python.exe -m pytest tests/ -v
```

The current consistency tests make real Gemini API calls: two tests run five AI calls each. They consume API quota and require a valid `GOOGLE_API_KEY`; they are not mock-only tests.

### Basic smoke test

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
Invoke-WebRequest http://localhost:5173/
```

## Troubleshooting

### `10048: only one usage of each socket address`

Another process is already using the port, usually an existing Uvicorn instance. Check it:

```powershell
Get-NetTCPConnection -LocalPort 8000 | Select-Object LocalPort,OwningProcess
```

Stop the real process ID without angle brackets:

```powershell
Stop-Process -Id 20512 -Force
```

Do not stop entries whose owning process is `0`. Alternatively, if the existing server responds, keep it running:

```powershell
Invoke-WebRequest http://localhost:8000/health
```

### FastAPI says `database "debate_db" does not exist`

Create the database with `createdb` as described in the database setup section, then restart FastAPI.

### PostgreSQL password authentication failed

Update `DATABASE_URL` with the actual password for the local `postgres` user. The password shown in any example file is not a universal default.

### `ModuleNotFoundError: No module named 'pptx'`

Install the Python dependencies using the project virtualenv:

```powershell
cd ai-engine
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

The presentation parser requires `python-pptx` and `pdfplumber`.

### Signup returns `Server error`

Signup is handled by Node, not FastAPI. Confirm the backend is listening on `5000`, MongoDB is running, and `MONGO_URI` is set:

```powershell
Get-Service MongoDB
Get-NetTCPConnection -LocalPort 5000
```

Inspect the Node terminal for `MongoDB Error`. Test signup directly with the example request in the API section. A duplicate email should return `Email already registered`, not a server error.

### AI requests fail but `/health` works

The health endpoint does not call Gemini. Verify that `GOOGLE_API_KEY` is set for Python and `GEMINI_API_KEY` is set for Node. Also confirm the selected model names are available to the Google API account.

### Repeated `404` for `/api/v1/notifications/my-alerts`

This request is not a FastAPI health failure. It means a client is asking the Python engine for a notification route that is not registered there. Platform notification routes belong to the Node backend. The frontend can still load, but that specific integration needs to call the service that owns the route.

### Voice or presentation analysis is slow on first use

`faster-whisper` may download its speech model on first transcription. Allow the download to finish and ensure the machine has sufficient disk space and network access.

### Port conflicts

The frontend, Node backend, and Python engine use fixed URLs in the frontend source:

- `5173` for Vite.
- `5000` for Node.
- `8000` for FastAPI.

Stop the conflicting process or update the corresponding frontend API base URLs and CORS configuration together.

## Security notes

- Rotate any API key that has ever been committed to or shared from an environment example.
- Use a long random `JWT_SECRET` outside local development.
- Never commit `.env`, database credentials, generated audio, or model caches.
- The AI engine currently trusts the Node layer for authentication on several endpoints. Add service authentication before exposing it directly to the public internet.
- The backend serves uploaded audio from local disk under `/uploads`; apply access controls and a durable storage strategy before production deployment.
- Review role assignment and admin signup policy before production use.

## Production considerations

This repository is configured for local development. A production deployment should add:

- Secret management instead of shell variables or local `.env` files.
- Managed MongoDB and PostgreSQL with backups and TLS.
- A production WSGI/ASGI and Node process manager.
- Reverse proxying so browser clients do not need hardcoded localhost URLs.
- Authentication between the frontend, Node API, and AI engine.
- Object storage for audio and presentation files.
- Rate limiting, request size limits, structured logs, monitoring, and alerting.
- API and end-to-end tests that do not depend exclusively on live model responses.
