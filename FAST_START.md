# FAST START — Integrated Debate Coach

This ZIP keeps the original Next.js frontend and FastAPI backend, and integrates Jessica's useful voice-recording flow into the existing Simulation page. It also includes the local faster-whisper STT agent.

## 1. Open
Open this folder in VS Code.

## 2. Backend
```cmd
cd backend
..\.venv\Scripts\activate
pip install -r requirements.txt
pip install -r ..\ai-ml\requirements-stt.txt
python main.py
```
Backend: http://localhost:8000

If `.venv` does not exist, create it with Python 3.11/3.12:
```cmd
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
pip install -r ai-ml\requirements-stt.txt
```

## 3. Frontend
Open a second CMD:
```cmd
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:3000

## 4. Use voice
1. Log in.
2. Open Simulation.
3. Start a practice session.
4. Click RECORD.
5. Allow microphone permission.
6. Speak and click STOP.
7. Whisper transcribes the audio.
8. Review/edit the transcript.
9. Click ANALYZE SPEECH.
10. The existing argument-analysis + simulation APIs process the transcript.

## Notes
- PostgreSQL is optional; the project can fall back to SQLite as configured.
- GROQ/Gemini keys are optional for the local fallback path, but real LLM agent output requires a configured provider key.
- Whisper downloads the selected model the first time it is used, so the first transcription may take longer.
- Do not commit `.env` or API keys.
