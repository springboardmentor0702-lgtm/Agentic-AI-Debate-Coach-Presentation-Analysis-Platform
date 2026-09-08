# LOGOS.AI — Start Here (Windows)

This repository is the integrated application baseline plus the remaining integration work. The target specification is the included project PDF.

## 1. PostgreSQL

Create a database named `ai_debate_coach` in pgAdmin 4 (PostgreSQL 18 is fine).

## 2. Backend

Open PowerShell in `backend/`:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and replace `YOUR_POSTGRES_PASSWORD` with your PostgreSQL password.

Optional live LLM opponent:

```text
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

The application remains usable without a key through its deterministic local reasoning engine.

Run:

```powershell
uvicorn main:app --reload --port 8000
```

Open `http://127.0.0.1:8000/docs` to inspect and test the API.

## 3. Frontend

Open a second PowerShell in `frontend/`:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4. Voice

Use Chrome or Edge. On the Debate Arena, click the microphone and speak. The browser's Speech Recognition API transcribes the argument into the composer. The AI opponent can also read its response aloud. Allow microphone access when the browser asks.

The Presentation Intelligence Lab uses the same voice-to-text workflow and stores the resulting speech metrics in PostgreSQL.

## 5. Main flow to demonstrate

1. Sign up.
2. Login.
3. Open **Simulation**.
4. Choose topic, position, format and AI persona.
5. Start the debate.
6. Click the microphone and speak an argument.
7. Submit the turn and observe the AI rebuttal, fallacy audit and coaching tip.
8. Finish the session.
9. Open **Dashboard** to see real stored progress.
10. Open **Presentation** and record a short speech.
11. Open **Reports** and export PDF/Excel for a completed session.

## 6. Specification coverage

- Authentication / JWT / roles / profile
- Skill and learning-goal tracking
- Debate creation and scheduling
- Argument mining and evaluation
- Eight supported logical fallacies
- Five counterargument styles
- Voice speech metrics
- Multi-turn AI simulation with personas
- Weighted performance scoring
- Personalized coaching path
- Learner / coach / educator / admin analytics endpoints
- Notifications
- PDF and real XLSX exports
- Docker Compose with PostgreSQL + MongoDB + backend + frontend

The MongoDB connection is optional for local use; PostgreSQL is the primary relational store.
