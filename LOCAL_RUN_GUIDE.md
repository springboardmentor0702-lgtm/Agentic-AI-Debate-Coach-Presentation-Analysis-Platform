# LOGOS.AI Local Run Guide

This guide runs the integrated project locally without requiring PostgreSQL, MongoDB, or AI-provider credentials. Development defaults use SQLite and deterministic heuristic analysis. External providers are optional.

## 1. Prerequisites

Install Git, Python 3.10 or newer, Node.js 18 or newer, and npm. FFmpeg and FFprobe are required for uploaded-audio analysis when the backend runs directly on the host. Docker Desktop is optional; the sandbox used for this validation did not have Docker installed.

Check versions:

```bash
git --version
python --version
node --version
npm --version
ffmpeg -version
ffprobe -version
```

## 2. Obtain the completed branch

If the branch is already present in your clone:

```bash
git switch SriRam-Kunamsetty
git pull origin SriRam-Kunamsetty
```

If you received the complete bundle instead of a remote branch, import it from the repository root:

```bash
git fetch /path/to/SriRam-Kunamsetty-complete-latest.bundle SriRam-Kunamsetty:refs/remotes/bundle/SriRam-Kunamsetty
git switch SriRam-Kunamsetty
git merge --ff-only bundle/SriRam-Kunamsetty
```

Verify the final local commit:

```bash
git log -3 --oneline --decorate
```

## 3. Start the backend directly

From the repository root, create and activate a virtual environment:

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
python -m uvicorn main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

Windows PowerShell:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
python -m uvicorn main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

The API should respond at `http://localhost:8000/health`, and interactive API documentation is at `http://localhost:8000/docs`. The default configuration uses `AI_PROVIDER=heuristic`, SQLite fallback storage, disabled automatic transcription, and a local upload directory.

## 4. Start the frontend

Open a second terminal at the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend uses `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` by default. If the backend runs on another host or port, set that variable before starting Next.js.

## 5. Run the standalone AI/ML agents offline

Open a third terminal at the repository root:

macOS/Linux:

```bash
cd ai-ml
python -m pip install -r requirements.txt
AI_ML_MODE=local python -m app.run_flow "Either we ban all cars immediately, or the planet is doomed."
AI_ML_MODE=local python -m pytest -q tests/test_offline.py
```

Windows PowerShell:

```powershell
cd ai-ml
python -m pip install -r requirements.txt
$env:AI_ML_MODE="local"
python -m app.run_flow "Either we ban all cars immediately, or the planet is doomed."
python -m pytest -q tests/test_offline.py
```

`AI_ML_MODE=local` never calls an external provider. `AI_ML_MODE=auto` uses Groq/Gemini when keys are available and falls back locally. `AI_ML_MODE=provider` requires provider credentials.

## 6. Test the project

From the repository root:

```bash
python -m py_compile backend/*.py backend/routers/*.py backend/services/*.py ai-ml/app/*.py ai-ml/app/agents/*.py
python -m pytest -q backend/test_ai_backend.py ai-ml/tests/test_offline.py
cd frontend
npm run build
```

With the backend already running, execute the real HTTP smoke tests from another terminal:

macOS/Linux:

```bash
cd backend
BASE_URL=http://127.0.0.1:8000 RUN_LIVE_API_TESTS=1 python -m unittest test_api -v
```

Windows PowerShell:

```powershell
cd backend
$env:BASE_URL="http://127.0.0.1:8000"
$env:RUN_LIVE_API_TESTS="1"
python -m unittest test_api -v
```

## 7. Use the main workflow

Register an account at `/signup`, sign in at `/login`, create a debate session from `/dashboard` or `/simulation`, submit arguments for analysis, review fallacies and counterarguments, complete presentation analysis, inspect coaching recommendations, and download reports from `/reports`. The reports page also supports certificate issuance for a completed session scoring at least 80 and public certificate verification.

## 8. Optional provider configuration

The backend’s optional OpenAI-compatible adapter is configured in `backend/.env` with `AI_PROVIDER=openai` or another supported LLM mode, `OPENAI_API_BASE`, `OPENAI_API_KEY`, and `AI_MODEL`. The standalone package uses `GROQ_API_KEY`, `GROQ_MODEL`, `GEMINI_API_KEY`, and `LLM_MODEL`. Do not commit either `.env` file or provider keys.

For optional uploaded-audio transcription, set `TRANSCRIPTION_PROVIDER` and `TRANSCRIPTION_MODEL` in `backend/.env`. If transcription is disabled or fails, the backend preserves deterministic signal metrics and does not break the workflow.

## 9. Docker alternative

With Docker Desktop installed and running:

```bash
docker compose up --build
```

The backend is exposed on port 8000 and the frontend on port 3000. Compose persists development data under `data/backend`, waits for the backend health check before starting the frontend, and installs FFmpeg inside the backend image.

## 10. Common problems

If the backend reports that port 8000 is already in use, stop the old process or use another port and update `NEXT_PUBLIC_API_URL`. If the frontend cannot reach the backend, confirm that the backend is running and that the frontend environment variable ends with `/api/v1`. If audio upload fails during a direct host run, install FFmpeg and FFprobe or run the backend through Docker. If a PostgreSQL or MongoDB connection warning appears during development, leave the SQLite fallback enabled unless those services are intentionally configured.
