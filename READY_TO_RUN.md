# LOGOS.AI — Final V5 Ready-to-Run

### First run
Double-click `SETUP_WINDOWS.bat` once. It creates `backend\.venv`, installs the backend dependencies including `faster-whisper`, and runs `npm install`.

### Every run
1. Double-click `START_BACKEND.bat`.
2. Double-click `START_FRONTEND.bat`.
3. Open http://localhost:3000

No PowerShell activation is required.

### Database
The backend tries PostgreSQL first and automatically falls back to local SQLite when PostgreSQL is unavailable. MongoDB is optional.

### Demo flow
Login → Simulation → Transmit → AI Opponent → Coaching → Whisper/Vocal Metrics → Complete Session → Analytics → Reports.
