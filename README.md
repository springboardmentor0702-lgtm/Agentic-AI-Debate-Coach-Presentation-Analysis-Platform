# LOGOS.AI: Agentic AI Debate Coach & Presentation Analysis Platform

**LOGOS.AI** is an AI-powered Agentic Debate Coach & Presentation Analytics Platform engineered to assist learners, debate coaches, educators, and administrators in mastering high-stakes rhetoric, debate argumentation, and public speaking.

---

## 🌟 Key Features

1. **Exact Editorial Design Identity**: Recreated faithfully from visual design mockups featuring pure white/obsidian/cyber-red palette (`#D90429`), monospace UI accents, `LOGOS.AI` typography, and `"RHETORIC"` watermark.
2. **The Analysis Suite (8 Core Modules)**:
   - **01 Argument Mining**: Automatic claim & evidence extraction.
   - **02 Logic Audit**: Real-time detection of 8 key fallacies (*Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, Red Herring*).
   - **03 Rebuttal Gen**: Multi-perspective counterarguments (*Logical, Evidence-Based, Ethical, Practical, Policy*).
   - **04 Vocal Metrics**: Prosody analysis, WPM speech pace, filler word counter, confidence score.
   - **05 Simulation Engine**: Multi-turn AI debate opponent across 5 formats (*Parliamentary, Oxford, Policy, 1-on-1, Public Forum*).
   - **06 Scoring Model**: Exact 5-part weighted performance model ($30\% + 20\% + 20\% + 15\% + 15\%$).
   - **07 Coaching Engine**: Skill gap matrix & personalized learning recommendations.
   - **08 Analytics Suite**: Tailored dashboards for Learner, Coach, Educator, Admin.
3. **Interactive AI Debate Terminal (`/simulation`)**: Live debate cross-examination terminal with customizable AI opponent personas (*"The Contrarian"*, *"The Academic"*, *"The Strategist"*).
4. **Prosody & Vocal Analytics (`/presentation`)**: Instant WPM calculation, filler word density breakdown, confidence scoring.
5. **Reports & Exports (`/reports`)**: One-click CSV/PDF performance scorecards & certificates.

---

## 🛠️ Tech Stack

* **Backend**: Python 3.10, FastAPI, Pydantic, SQLAlchemy, SQLite/PostgreSQL
* **Frontend**: Next.js 14, React 18, Vanilla CSS Design System, Lucide Icons
* **DevOps**: Docker, Docker Compose

---

## 🚀 Quick Start Guide

### Option 1: Running with Docker Compose (Recommended)
```bash
docker-compose up --build
```
- Frontend application: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`

### Option 2: Running Locally

#### 1. Start FastAPI Backend
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### 2. Start Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.
