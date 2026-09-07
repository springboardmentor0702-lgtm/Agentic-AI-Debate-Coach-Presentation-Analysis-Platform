# Agentic AI Debate Coach & Presentation Analysis Platform

An enterprise-grade, AI-powered **Debate Coaching & Presentation Intelligence Platform** that helps debaters, students, public speakers, educators, and coaches systematically evaluate arguments, identify logical fallacies, assess speech delivery cadence, simulate multi-turn competitive debates against agentic opponents, and generate accredited performance reports.

---

## Architecture & System Design

```
                               ┌─────────────────────────────────────────┐
                               │   Modern React + Tailwind CSS Web App   │
                               │  (Vite / Lucide / Web Audio / Radar SVG)│
                               └────────────────────┬────────────────────┘
                                                    │ REST API / WebSockets
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                FastAPI Backend Gateway                                 │
│  - JWT Auth & RBAC (Learner, Debate Coach, Educator, Administrator)                    │
│  - CORS / Throttling / Request Validation / Error Handlers                            │
├───────────────────┬───────────────────┬────────────────────┬───────────────────────────┤
│ Debate Session    │ Argument &        │ Speech &           │ Recommendation &          │
│ & Simulation      │ Fallacy Engines   │ Presentation Lab   │ Scoring Engine            │
└─────────┬─────────┴─────────┬─────────┴─────────┬──────────┴─────────────┬─────────────┘
          │                   │                   │                        │
          ▼                   ▼                   ▼                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               AI / Agentic Intelligence Layer                          │
│  - DebateOpponentAgent (Dynamic personas, strategy, multi-turn AI debate)              │
│  - ArgumentMiningAgent (Premise/claim extraction, evidence strength)                   │
│  - FallacyDetectionAgent (8 Fallacies: Ad Hominem, Straw Man, False Dilemma, etc.)     │
│  - CounterargumentAgent (5 Types: Logical, Evidence, Ethical, Practical, Policy)       │
│  - PresentationAnalyticsAgent (WPM, filler words, confidence, clarity, engagement)     │
└────────────────────────────────────────────────────────────────────────────────────────┘
          │                                                                │
          ▼                                                                ▼
┌───────────────────────────────┐                                ┌───────────────────────┐
│     Relational Data Store     │                                │  Report & Export Hub  │
│  (SQLAlchemy SQLite/Postgres) │                                │ (PDF / CSV / Excel)   │
└───────────────────────────────┘                                └───────────────────────┘
```

---

## 14 Implemented Modules

| # | Module | Core Capabilities |
|---|---|---|
| **1** | **User Authentication & RBAC** | JWT token authentication, bcrypt password hashing, 4 distinct roles (*Learner*, *Debate Coach*, *Educator*, *Administrator*), 1-click demo logins. |
| **2** | **User Profile & Skill Management** | Experience level tracking, preferred debate topics, presentation domains, learning goals, coaching preferences. |
| **3** | **Debate Session Management** | Session scheduling, position assignment (*Affirmative* vs. *Negative*), formats: **One-on-One**, **Parliamentary**, **Oxford**, **Policy**, **Public Forum**, **AI Debate Simulation**. |
| **4** | **Argument Analysis Engine** | Claim identification, evidence strength evaluation, reasoning quality, and multi-criteria evaluation (**Clarity**, **Relevance**, **Evidence Strength**, **Logical Consistency**, **Persuasiveness**). |
| **5** | **Logical Fallacy Detection Engine** | Scans for all 8 required fallacies: **Ad Hominem**, **Straw Man**, **False Dilemma**, **Slippery Slope**, **Appeal to Authority**, **Circular Reasoning**, **Hasty Generalization**, **Red Herring**. Provides quotes, severity, explanations, and remedies. |
| **6** | **Counterargument Generation Engine** | Generates 5 distinct rebuttal paradigms: **Logical Rebuttals**, **Evidence-Based Rebuttals**, **Ethical Counterarguments**, **Practical Counterarguments**, **Policy Counterarguments**, plus challenge cross-exam questions. |
| **7** | **Presentation Analysis Engine** | Web Audio mic recording, Speech Pace (**WPM**), **Filler Word Tally & Breakdown** (*um, uh, like, actually, basically, etc.*), **Confidence Score**, **Clarity Score**, **Audience Engagement Score**. |
| **8** | **AI Debate Simulation Engine** | Multi-turn AI debate with dynamic personas: **Dr. Eleanor Vance (Empirical Scholar)**, **Marcus Reed (Aggressive Cross-Examiner)**, and **Prof. Sophia Lin (Socratic Inquirer)** with real-time coaching assistance. |
| **9** | **Performance Scoring Engine** | **Exact Weighted Scoring Formula**: $30\%$ Argument Quality + $20\%$ Evidence + $20\%$ Logic + $15\%$ Rebuttal + $15\%$ Communication Skills $\rightarrow$ Letter Grades (A+, A, B, C). |
| **10** | **Recommendation & Coaching Engine** | Personalized coaching pathways, skill gap detection, and recommended targeted practice drills. |
| **11** | **Multi-Role Dashboards & Analytics** | Dedicated dashboards for **Learner** (trend radar, history), **Coach** (student progress, fallacy distribution), **Educator** (class leaderboard, grade curves), and **Admin** (telemetry, role management). |
| **12** | **Notification & Engagement System** | Real-time notifications for debate schedules, coach feedback, and skill milestones. |
| **13** | **Reports & Export System** | Instant compilation and downloading of official **PDF Performance Dossiers**, **CSV Data Sheets**, and **Excel Workbooks**. |
| **14** | **Integration, Testing & Deployment** | Automated test suite covering all 10 test dimensions (including Plain-English Glossary and Simulation turn validations), Dockerfiles for frontend & backend, and docker-compose orchestration. |

---

## Exact Weighted Scoring Model

The debate scoring engine enforces the exact formula from the specification:

$$\text{Overall Debate Score} = (0.30 \times Q) + (0.20 \times E) + (0.20 \times L) + (0.15 \times R) + (0.15 \times C)$$

Where:
- $Q$ = **Argument Quality** (30%)
- $E$ = **Evidence Usage** (20%)
- $L$ = **Logical Consistency** (20%)
- $R$ = **Rebuttal Effectiveness** (15%)
- $C$ = **Communication Skills** (15%)

---

## 📖 Difficult Words Made Simple & Plain-English Glossary

Debate and formal logic can often feel alienating for learners. The platform features an integrated **Plain-English Glossary Service** (`backend/app/services/glossary.py`) that demystifies academic debate jargon:

* **Warrant** $\rightarrow$ *The Proof / Connection (Why your claim is true)*
* **Rebuttal** $\rightarrow$ *Counter-Response (Respectful, evidence-based answer)*
* **Ad Hominem** $\rightarrow$ *Attacking the Person (Name-Calling)*
* **Straw Man** $\rightarrow$ *Twisting the Other Person's Words*
* **False Dilemma** $\rightarrow$ *Only Two Choices (Black-or-White Thinking)*
* **Slippery Slope** $\rightarrow$ *Exaggerated Chain Reaction*
* **Utilitarian** $\rightarrow$ *The Greatest Good for Most People*
* **Deontological** $\rightarrow$ *Rule of Duty & Principles*
* **Externalities** $\rightarrow$ *Side Effects on Others*
* **Cadence** $\rightarrow$ *Speaking Speed & Rhythm (WPM)*

### Interactive Features:
1. **In-Debate Word Extractor**: Automatically scans live speeches and displays plain-English meaning badges with concrete everyday examples.
2. **Searchable Dictionary Modal**: Built-in modal in both the **Live Debate Studio** and the **Argument Lab** allowing keyword search across all terms.
3. **Plain-English Fallacy Labels**: Each detected fallacy displays its everyday name and a 💡 *In Plain English* explanation alongside the formal Latin nomenclature.

---

## 🌟 Structured AI Coach Live Feedback

After every turn in the live sparring chamber, the AI Coach generates actionable guidance:
* 🌟 **What You Did Well (Praise)**: Positive reinforcement of debater strengths (clear thesis, bold claim, empirical data).
* 🎯 **How to Win the Next Point (Tip)**: Friendly, jargon-free advice for countering the opponent's strategy.
* 📖 **Difficult Words Breakdown**: Instant explanations of complex words used during the round.
* ⚡ **Suggested Next Reply**: Ready-to-use counter-speech snippet with a **1-click "Insert in Speech"** button.

---

## Pre-Configured Demo Accounts

Use the **Instant 1-Click Demo Login** buttons on the login screen, or sign in manually with:

| Role | Email | Password | Persona / Capabilities |
|---|---|---|---|
| **Learner** | `learner@debate.ai` | `password123` | Alex Morgan — Practice debates, record speeches, track radar scores |
| **Debate Coach** | `coach@debate.ai` | `password123` | Marcus Sterling — Student progress monitoring, fallacy matrix, drill assignments |
| **Educator** | `educator@debate.ai` | `password123` | Prof. Diana Vance — Class analytics, student rankings, accreditation exports |
| **Administrator** | `admin@debate.ai` | `password123` | System Administrator — User management, role elevations, AI latency monitoring |

---

## Quick Start (Local Development)

### 1. Backend Setup (FastAPI)
```bash
# Navigate to project root
cd Portfolio

# Install backend dependencies
pip install -r backend/requirements.txt

# Run backend test suite
python backend/tests/test_api.py

# Launch FastAPI backend
python backend/run_backend.py
```
Backend will start on: **`http://localhost:8000`**
Interactive Swagger API Docs: **`http://localhost:8000/docs`**

### 2. Frontend Setup (React + Tailwind)
```bash
cd frontend

# Run development server
npm run dev
```
Frontend will be available at: **`http://localhost:5173`**

### 3. One-Click Launch (Windows)
Double-click `run_app.bat` to launch both backend and frontend servers simultaneously!

---

## 🧪 Automated Test Suite (10 / 10 Passing)

Run the full end-to-end automated test suite:
```bash
python backend/tests/test_api.py
```

```text
--- Running Test Suite for Agentic AI Debate Coach Platform ---
[PASS] test_root_and_health
[PASS] test_demo_logins_and_rbac
[PASS] test_argument_analysis
[PASS] test_fallacy_detection_all_types
[PASS] test_counterargument_generation_5_types
[PASS] test_speech_presentation_metrics
[PASS] test_exact_weighted_scoring_model
[PASS] test_ai_simulation_turn
[PASS] test_glossary_and_plain_english_definitions
[PASS] test_report_export_pdf_csv

==========================================
SUCCESS: ALL 10 AUTOMATED SUITES PASSED!
==========================================
```

---

## Docker Deployment

To launch the full platform in Docker containers:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

