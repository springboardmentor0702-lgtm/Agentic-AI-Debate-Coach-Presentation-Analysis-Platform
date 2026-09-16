# LOGOS.AI Debate Coach

A beginner-friendly guide to installing, running, understanding, and troubleshooting the complete project on Windows.

## 1. What This Project Does

LOGOS.AI is a full-stack debate and presentation coaching platform. It provides:

- User registration and login.
- AI debate simulations.
- Debate arguments, AI rebuttals, fallacy detection, and scoring.
- Voice presentation analysis.
- Speech pace/WPM and filler-word analysis.
- Coach and educator classes.
- Student performance dashboards.
- Coach and educator feedback on specific debate histories.
- AI assistant chat and knowledge documents.

The project has three services:

| Service   | Folder       | Technology          | Port | Purpose                                      |
| --------- | ------------ | ------------------- | ---: | -------------------------------------------- |
| Frontend  | `frontend/`  | Next.js and React   | 3000 | Browser interface                            |
| Backend   | `backend/`   | Node.js and Express | 5000 | Authentication, MongoDB data, platform APIs  |
| AI engine | `ai-engine/` | Python and FastAPI  | 8000 | AI analysis, transcription, debate reasoning |

The frontend is the application you open in your browser:

```text
http://localhost:3000
```

## 2. Required Software

Install these before running the project:

- Windows 10 or newer.
- Node.js LTS and npm.
- Python 3.11 or newer.
- MongoDB Community Server and `mongosh`.
- PostgreSQL and the `createdb`/`psql` command-line tools.
- A Google Gemini API key.
- A microphone for voice analysis.

Verify installations:

```powershell
node --version
npm --version
python --version
mongosh --version
psql --version
```

## 3. Project Folders

```text
try (7)/
  frontend/       Next.js browser application
  backend/        Express API and MongoDB models
  ai-engine/      FastAPI AI service
  frontend/data/  Legacy local JSON snapshot used by older compatibility routes
  PROJECT_GUIDE.md
```

The main runtime data should be stored in databases:

- MongoDB: application data and user-facing history.
- PostgreSQL: AI performance and analytics rows.
- The AI engine also uses MongoDB for assistant messages and knowledge documents.

## 4. Environment Files

The project uses these files:

```text
backend/.env
ai-engine/.env
frontend/.env.local
```

Do not commit these files or share their values. Replace any exposed API key immediately.

### Backend environment

`backend/.env` should contain values similar to:

```dotenv
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/debate_platform_database
JWT_SECRET=use-a-long-random-secret
GEMINI_API_KEY=your-google-gemini-key
GOOGLE_API_KEY=your-google-gemini-key
AI_ENGINE_URL=http://127.0.0.1:8000
```

### AI engine environment

`ai-engine/.env` should contain:

```dotenv
GOOGLE_API_KEY=your-google-gemini-key
REFEREE_MODEL=gemini-flash-latest
OPPONENT_MODEL=gemini-flash-latest
ASSISTANT_MODEL=gemini-flash-latest
MONGO_URL=mongodb://127.0.0.1:27017
MONGO_DB_NAME=debate_platform_database
DATABASE_URL=postgresql://postgres:your_postgres_password@127.0.0.1:5432/debate_db
CORS_ORIGINS=http://localhost:3000
```

### Frontend environment

`frontend/.env.local` should contain:

```dotenv
BACKEND_URL=http://127.0.0.1:5000
JWT_SECRET=the-same-secret-used-by-the-backend
```

The frontend uses `JWT_SECRET` to read the login token and `BACKEND_URL` to proxy API requests to Express.

## 5. Start MongoDB and PostgreSQL

### MongoDB

If MongoDB is installed as a Windows service:

```powershell
Get-Service MongoDB
Start-Service MongoDB
```

If the service name is different, start MongoDB from the MongoDB Compass or Windows Services application.

### PostgreSQL database

Start PostgreSQL from Windows Services, then create the application database once:

```powershell
$env:PGPASSWORD = "your_postgres_password"
createdb -h 127.0.0.1 -U postgres debate_db
Remove-Item Env:PGPASSWORD
```

If the database already exists, PostgreSQL will report that it already exists. That is safe.

The AI engine creates these tables automatically when it starts:

```text
debate_performance
agent_performance_log
```

## 6. Install Dependencies

Run these commands once from the project root:

```powershell
cd "C:\Users\goras\Downloads\try (7)"
```

### Backend dependencies

```powershell
cd backend
npm install
```

If npm warns that bcrypt install scripts are not approved, approve and rebuild it only if bcrypt errors appear:

```powershell
npm install-scripts approve bcrypt
npm rebuild bcrypt
```

### Frontend dependencies

```powershell
cd ..\frontend
npm install
```

### Python dependencies

```powershell
cd ..\ai-engine
python -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

If PowerShell blocks virtual environment activation, use the direct interpreter command above. Activation is optional.

## 7. Migrate Existing Data Once

The existing JSON data was historically stored in:

```text
frontend/data/store.json
```

Import it into MongoDB with:

```powershell
cd "C:\Users\goras\Downloads\try (7)\backend"
$env:MONGO_URI = "mongodb://127.0.0.1:27017/debate_platform_database"
npm run migrate:store
Remove-Item Env:MONGO_URI
```

This migration is safe to repeat. It imports users, presentations, and debates, and preserves the complete old JSON data in the MongoDB collection `legacy_store_snapshots`.

## 8. Start the Complete Project

Use four terminals. Start databases first.

### Terminal 1: AI engine

```powershell
cd "C:\Users\goras\Downloads\try (7)\ai-engine"
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Expected health response:

```text
http://127.0.0.1:8000/health
```

### Terminal 2: Express backend

```powershell
cd "C:\Users\goras\Downloads\try (7)\backend"
npm start
```

Expected message:

```text
Server running on port 5000
MongoDB Connected
```

### Terminal 3: Next.js frontend

```powershell
cd "C:\Users\goras\Downloads\try (7)"
npm run dev
```

The root npm script starts the frontend workspace. Open:

```text
http://localhost:3000
```

### Terminal 4: optional checks

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health -UseBasicParsing
Invoke-WebRequest http://localhost:3000/ -UseBasicParsing
Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 3000,5000,8000
```

## 9. How a Request Moves Through the System

Typical login flow:

```text
Browser
  -> Next.js /api/v1/auth/login
  -> Express /login
  -> MongoDB users collection
  -> JWT returned to browser
```

Typical debate flow:

```text
Browser
  -> Next.js simulation route
  -> AI engine FastAPI endpoint
  -> Gemini/LangChain analysis
  -> Express/MongoDB history save
  -> PostgreSQL AI performance log
  -> Dashboard reads MongoDB history
```

Typical voice presentation flow:

```text
Browser microphone
  -> audio blob and duration
  -> Next.js presentation evaluator
  -> AI engine transcription when available
  -> deterministic WPM and filler calculation
  -> MongoDB presentations collection
  -> dashboard presentation history
```

Coach feedback flow:

```text
Coach selects learner
  -> MongoDB assignedCoach relationship
Coach selects debate
  -> MongoDB debate history record
Coach submits feedback, grade, and logic gap
  -> same debate history record is updated
Learner analytics
  -> displays coach feedback on that specific debate
```

## 10. Where Data Is Stored

### MongoDB

Database:

```text
debate_platform_database
```

Important collections:

| Collection               | Data                                                                |
| ------------------------ | ------------------------------------------------------------------- |
| `users`                  | Accounts, roles, password hashes, coach/educator assignments        |
| `presentations`          | Presentation titles, transcripts, WPM, fillers, confidence, clarity |
| `debatehistories`        | Debate topics, student turns, AI responses, scores, reviews         |
| `sessions`               | Backend debate session records                                      |
| `session_transcripts`    | AI engine debate transcript records                                 |
| `assistant_messages`     | Assistant conversations                                             |
| `knowledge_documents`    | Uploaded knowledge-base document metadata                           |
| `classes`                | Educator classes and learner membership                             |
| `legacy_store_snapshots` | Backup of the original JSON store                                   |

Inspect MongoDB:

```powershell
mongosh
```

```javascript
use debate_platform_database
show collections
db.users.find({}, { password: 0 }).pretty()
db.presentations.find().pretty()
db.debatehistories.find().pretty()
```

### PostgreSQL

Database:

```text
debate_db
```

Tables:

- `debate_performance`: speech pace, fillers, fallacy, delivery, and argument scores.
- `agent_performance_log`: AI agent latency and token usage.

Inspect PostgreSQL:

```powershell
psql -h 127.0.0.1 -U postgres -d debate_db
```

```sql
\dt
SELECT COUNT(*) FROM debate_performance;
SELECT COUNT(*) FROM agent_performance_log;
```

### Local files

- Audio uploads: `backend/uploads/audio/`.
- AI model caches may be downloaded by `faster-whisper` on first use.
- `frontend/data/store.json` is a legacy compatibility snapshot, not the intended primary store for new users, presentations, or debates.

## 11. Main User Workflows

### Create an account

1. Open `http://localhost:3000/signup`.
2. Enter name, email, password, role, and experience.
3. Submit the form.
4. The frontend calls Express.
5. Express hashes the password and stores the user in MongoDB.

### Log in

1. Open `http://localhost:3000/login`.
2. Use the same email and password.
3. A JWT is saved in browser storage for the current session.
4. The dashboard reads the role from the JWT.

Roles:

- Learner
- Debate Coach
- Educator
- Administrator

### Run a debate

1. Open Simulation.
2. Choose topic, format, stance, difficulty, and persona.
3. Submit arguments.
4. The AI engine returns an opponent response and analysis.
5. Complete the debate.
6. The debate history is stored in MongoDB.

### Analyze a presentation

1. Open Vocal Metrics.
2. Enter or record speech.
3. Provide the duration for typed/manual analysis.
4. Record audio for real voice analysis.
5. The transcript is analyzed for:
   - Words per minute.
   - Pace status.
   - Filler words.
   - Confidence.
   - Clarity.
   - Engagement.
6. The result is saved in MongoDB.

WPM formula:

```text
WPM = word_count / (duration_seconds / 60)
```

Pace thresholds:

- Below 110 WPM: Too Slow.
- 110-165 WPM: Optimal.
- Above 165 WPM: Too Fast.

### Add a learner as a coach

1. Log in as a Debate Coach.
2. Open Analytics.
3. Open the coach class tab.
4. Click Add Existing Student.
5. Enter the learner's registered account email.
6. Select the learner's debate history.
7. Review the complete student/AI transcript.
8. Enter feedback, grade, and logic gap.
9. Submit the review.

### Add a learner as an educator

1. Log in as an Educator.
2. Open Analytics.
3. Add an existing learner by account email.
4. The learner is added to an educator-owned MongoDB class.
5. The educator can view assigned learner performance and review debate history.

## 12. Troubleshooting FAQ

### The frontend says `Cannot find module './818.js'`.

The generated Next.js bundle is stale or corrupted. Stop the frontend, remove `.next`, and restart:

```powershell
cd "C:\Users\goras\Downloads\try (7)\frontend"
if (Test-Path .next) { Remove-Item .next -Recurse -Force }
npm run dev
```

### Port 3000 is already in use.

```powershell
$listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($listener) { Stop-Process -Id $listener.OwningProcess -Force }
cd "C:\Users\goras\Downloads\try (7)"
npm run dev
```

### Port 5000 is already in use.

```powershell
$listener = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($listener) { Stop-Process -Id $listener.OwningProcess -Force }
cd "C:\Users\goras\Downloads\try (7)\backend"
npm start
```

### The AI engine exits immediately.

Check the error in the AI terminal. Common causes:

- The virtual environment dependencies were not installed.
- `GOOGLE_API_KEY` is missing.
- PostgreSQL database `debate_db` does not exist.
- PostgreSQL password in `DATABASE_URL` is incorrect.
- MongoDB is not running.

The password `postgres` is only an example. Test the local PostgreSQL login without putting the password in the command line:

```powershell
psql -h 127.0.0.1 -U postgres -d postgres
```

Type the password created during PostgreSQL installation. Then update `ai-engine/.env`:

```dotenv
DATABASE_URL=postgresql://postgres:YOUR_REAL_PASSWORD@127.0.0.1:5432/debate_db
```

If you do not know the password, reset it through pgAdmin or PostgreSQL administration tools, then update the URL. Do not commit the real password.

Run:

```powershell
cd "C:\Users\goras\Downloads\try (7)\ai-engine"
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### MongoDB says connection refused.

```powershell
Get-Service MongoDB
Start-Service MongoDB
mongosh --host 127.0.0.1
```

Use `127.0.0.1` rather than `localhost` if Windows resolves localhost to IPv6 and MongoDB only listens on IPv4.

### PostgreSQL says database does not exist.

```powershell
$env:PGPASSWORD = "your_postgres_password"
createdb -h 127.0.0.1 -U postgres debate_db
Remove-Item Env:PGPASSWORD
```

### Login returns `User not found`.

The frontend uses MongoDB through Express. Verify the account exists:

```javascript
use debate_platform_database
db.users.find({ email: "your@email.com" }, { password: 0 }).pretty()
```

### Login says `Incorrect password` for an old migrated account.

Old JSON demo accounts did not contain real password hashes. Create a new account through `/signup` or reset the password in the backend using a proper password-reset flow.

### The coach dashboard shows no students.

The learner must already have an account. Add the learner by the exact registered email from the coach Analytics page. Verify MongoDB:

```javascript
use debate_platform_database
db.users.find({ role: "Learner" }, { name: 1, email: 1, assignedCoach: 1 })
```

### Coach feedback appears for the learner but says Pending for the coach.

Refresh the page with `Ctrl + F5`. The coach dashboard reads the latest reviewed debate from MongoDB. Verify:

```javascript
use debate_platform_database
db.debatehistories.find(
  { reviewedByCoach: true },
  { topic: 1, coachFeedback: 1, coachGrade: 1, coachLogicGap: 1 }
).pretty()
```

### Presentation WPM is wrong.

WPM depends on the transcript and measured duration. Check that:

- The recording duration is correct.
- The transcript is present.
- The audio transcription completed successfully.
- You are not relying on an old archived result.

Start a new recording after refreshing the page.

### Filler words are wrong.

Filler words are counted from the transcript. Supported phrases include:

```text
um, uh, uhh, like, you know, actually, basically, literally, sort of, kind of
```

A word spoken in audio but missing from the transcript cannot be counted. Check the displayed transcript first.

### Voice analysis is slow.

`faster-whisper` may download an AI speech model the first time it is used. The first transcription can take longer and requires disk space and network access.

### The dashboard redirects back to login.

1. Clear the old browser token:

```javascript
localStorage.removeItem("logos_ai_jwt");
```

2. Refresh the browser.
3. Log in again.
4. Confirm `frontend/.env.local` uses the same `JWT_SECRET` as `backend/.env`.

### A delete history action fails.

History deletion requires:

- A valid login token.
- A selected history ID.
- A record owned by the current account.

The delete API supports both Mongo ObjectIds and legacy numeric IDs. Refresh the dashboard if the list contains old data.

## 13. Useful Health Checks

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health -UseBasicParsing
Invoke-WebRequest http://localhost:3000/ -UseBasicParsing
Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 3000,5000,8000
```

Expected:

- AI engine health returns HTTP 200 and `{"status":"ok"}`.
- Frontend returns HTTP 200.
- Ports 3000, 5000, and 8000 are listening.

## 14. Development Commands

Frontend:

```powershell
cd frontend
npm run dev
npm run build
npm run lint
```

Backend:

```powershell
cd backend
npm start
npm run migrate:store
```

Python tests:

```powershell
cd ai-engine
.\venv\Scripts\python.exe -m pytest tests/ -v
```

## 15. Security Notes

- Never commit `.env`, `.env.local`, passwords, or API keys.
- Rotate any Google API key that was exposed or shared.
- Use a strong random JWT secret.
- Do not expose the AI engine directly to the public internet without service authentication.
- Protect uploaded audio and presentation files before production deployment.
- Review the policy for who may create Admin accounts.

## 16. Recommended Startup Order

Every time you work on the project:

1. Start MongoDB.
2. Start PostgreSQL.
3. Start the AI engine on port 8000.
4. Start Express on port 5000.
5. Start Next.js on port 3000.
6. Open `http://localhost:3000`.
7. Check `/health` if an AI feature fails.

If you only need to work on the frontend layout, MongoDB, PostgreSQL, and the backend may not be required. Login, dashboard, debates, and voice analysis require the services described above.
