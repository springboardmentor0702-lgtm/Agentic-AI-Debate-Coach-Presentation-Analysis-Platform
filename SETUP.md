# MindArena AI - Setup & Installation Guide

## Quick Start (Development Environment)

### Prerequisites
- Node.js 18+ (Node 20+ or 22 recommended)
- Python 3.10+ (for backend/FastAPI standalone deployment)
- Modern browser with Web Speech API support (Chrome, Edge, Safari, Firefox)

---

### Step 1: Install Dependencies
```bash
# Install frontend & server dependencies
npm install

# (Optional) If running standalone Python FastAPI backend:
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

### Step 2: Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the values:
```env
# Gemini API Key for AI Agents
GEMINI_API_KEY=your_gemini_api_key_here

# (Optional) Groq fallback API Key
GROQ_API_KEY=your_groq_api_key_here

# JWT Secret for session tokens
JWT_SECRET=mindarena_secret_jwt_key_2026

# (Optional) Supabase cloud connection
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

### Step 3: Run the Development Server
```bash
# Starts the integrated full-stack server (Port 3000)
npm run dev
```
Open your browser at `http://localhost:3000`.

---

### Step 4: Seed Initial Data
```bash
# In backend directory or run seed script:
python3 backend/scripts/seed_dummy_data.py
```
Pre-configured demo accounts:
- **Learner**: `learner@mindarena.ai` / `password123`
- **Coach**: `coach@mindarena.ai` / `password123`
- **Educator**: `educator@mindarena.ai` / `password123`
- **Admin**: `admin@mindarena.ai` / `password123`

---

### Step 5: Run Smoke Tests
```bash
python3 backend/scripts/api_smoke_test.py
```
Runs 50+ automated verifications across all endpoints and agent workflows.
