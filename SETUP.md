# Segment 0 Setup Guide — Windows

You need: **Python 3.11+** and **Node.js 18+** installed. Check with:

```
python --version
node --version
```

If either is missing, install from python.org and nodejs.org (default
options are fine), then re-open VS Code's terminal.

Everything below works in both **Command Prompt** and **PowerShell** —
where they differ, both versions are shown.

---

## 1. Where to put this folder

Unzip the project anywhere, e.g. `C:\Projects\debate-coach-platform`.
Open that folder in VS Code (`File > Open Folder`).

---

## 2. Backend setup

Open a terminal in VS Code (`` Ctrl+` ``), then:

```
cd backend
python -m venv .venv
```

**Activate the virtual environment** (do this every time you open a new
terminal to work on the backend):

- Command Prompt: `.venv\Scripts\activate.bat`
- PowerShell: `.venv\Scripts\Activate.ps1`
  - If PowerShell blocks this with a script-execution error, run once:
    `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` and confirm with `Y`.

You'll see `(.venv)` appear at the start of your terminal line once it's active.

Install dependencies:

```
pip install -r requirements.txt
```

**Add your API keys**: copy `.env.example` to `.env` in the `backend`
folder (same folder as `requirements.txt`), then open `.env` and paste in
your real keys:

```
GEMINI_API_KEY=your-real-key-here
GROQ_API_KEY=your-real-key-here
```

Copy command:
- Command Prompt: `copy .env.example .env`
- PowerShell: `Copy-Item .env.example .env`

**Run the backend:**

```
uvicorn app.main:app --reload
```

Leave this terminal running. Open http://localhost:8000/docs in your
browser — you should see the interactive API docs (Swagger UI) with
`/health` and `/health/llm` listed.

---

## 3. Frontend setup

Open a **second** terminal (`` Ctrl+Shift+` `` in VS Code, keep the backend
one running) and:

```
cd frontend
npm install
```

Copy the env file the same way as before:
- Command Prompt: `copy .env.example .env`
- PowerShell: `Copy-Item .env.example .env`

(`frontend/.env` should contain `VITE_API_URL=http://localhost:8000` —
that's already the default, no editing needed unless you change ports.)

**Run the frontend:**

```
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

---

## 4. Confirm everything is wired correctly

On the page that opens:

1. Click **"Test backend connection"** → should show `Backend is running.`
2. Click **"Test Gemini -> Groq fallback"** → should show a 5-word AI
   response. If it errors, double check `backend/.env` has real (not
   placeholder) API keys and that you restarted `uvicorn` after editing it.

If both work, Segment 0 is done and we move to Segment 1 (Auth).

---

## 5. Getting your free API keys (if you need new ones)

- **Gemini**: https://aistudio.google.com/apikey — sign in with any
  Google account, click "Create API key". Free tier covers this project.
- **Groq**: https://console.groq.com/keys — sign up free, click
  "Create API Key".

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `uvicorn: command not found` | Your venv isn't activated — repeat the activate step in step 2 |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` again inside the activated venv |
| Frontend shows "Could not reach backend" | Make sure the `uvicorn` terminal is still running on port 8000 |
| LLM check fails with a key error | Check `backend/.env` for typos, no quotes needed around the key, then restart uvicorn |
| PowerShell won't activate venv | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, type `Y`, try again |
