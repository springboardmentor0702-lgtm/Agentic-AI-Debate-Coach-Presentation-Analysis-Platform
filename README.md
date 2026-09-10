# Agentic AI Debate Coach & Presentation Analysis Platform

An intelligent, AI-powered platform designed to enhance debating, public speaking, critical thinking, and presentation skills. The platform leverages Large Language Models (LLMs), agentic reasoning workflows, speech analytics, and argument mining to simulate realistic debate environments, evaluate argumentative rigor, detect classical logical fallacies, assess vocal presentation metrics, and provide tailored, actionable coaching pathways.

---

## 🏛️ System Architecture

The platform is designed around a modular microservice-style architecture in **FastAPI** with a responsive **Next.js 16 (React + Tailwind CSS)** user interface, supporting **PostgreSQL** for operational data and **SQLite** for development:

```
                  ┌────────────────────────────────────────┐
                  │ Next.js 16 / React Web Application     │
                  │  (Learner, Coach, Educator, Admin)     │
                  └──────────────────┬─────────────────────┘
                                     │ HTTP / REST APIs
                                     ▼
                  ┌────────────────────────────────────────┐
                  │       FastAPI Microservices API        │
                  │  - Authentication & RBAC (JWT/OAuth)   │
                  │  - Profile & Skill Management          │
                  │  - Debate Session Management (6 Modes) │
                  │  - Argument Analysis (5 Criteria)      │
                  │  - Fallacy Detection (8 Fallacies)     │
                  │  - Counterargument Engine (5 Types)    │
                  │  - Presentation Analytics (Whisper/WPM)│
                  │  - AI Debate Simulation & Personas     │
                  │  - Weighted Scoring (30/20/20/15/15)   │
                  │  - Coaching & Learning Path Engine     │
                  │  - Notification & Engagement System    │
                  │  - Reports & Export (PDF & Excel)      │
                  └──────────────────┬─────────────────────┘
                                     │
                 ┌───────────────────┴────────────────────┐
                 ▼                                        ▼
    ┌─────────────────────────┐              ┌─────────────────────────┐
    │  PostgreSQL / SQLite    │              │ AI & Analytics Engines  │
    │  - Users & Profiles     │              │ - Agentic LLM Reasoner  │
    │  - Debate Sessions      │              │ - Whisper Speech-to-Text│
    │  - Speech Analyses      │              │ - Fallacy Pattern Mining│
    │  - Notifications        │              │ - Dynamic Rebuttal Gen  │
    └─────────────────────────┘              └─────────────────────────┘
```

---

## 🎯 Specification Alignment: 14 Core Modules

| # | Module Name | Features & Deliverables |
|---|---|---|
| **1** | **User Authentication & RBAC** | Secure JWT authentication, password hashing (`PBKDF2-SHA256`), OAuth2 login support, and role-based permissions for 4 user roles. |
| **2** | **User Profile & Skill Management** | Tracking experience level (`beginner`, `intermediate`, `advanced`), preferred topics, presentation domains, learning goals, and coaching preferences. |
| **3** | **Debate Session Management** | Topic management, position assignment (`for` / `against`), turn-by-turn debate recording, and support for all **6 Debate Formats**. |
| **4** | **Argument Analysis Engine** | Claim identification, evidence validation, reasoning quality, and evaluation across **5 criteria**: *Clarity, Relevance, Evidence Strength, Logical Consistency, Persuasiveness*. |
| **5** | **Logical Fallacy Detection Engine** | Identification, explanations, and correction suggestions for all **8 supported classical fallacies**. |
| **6** | **Counterargument Generation Engine** | Rebuttal generation across all **5 perspectives**: *Logical, Evidence-Based, Ethical, Practical, Policy*, plus strategic debate tips and challenge questions. |
| **7** | **Presentation Analysis Engine** | Speech pace evaluation (**Words Per Minute**), filler word control, confidence score, clarity score, and audience engagement measurement via audio upload or transcript input. |
| **8** | **AI Debate Simulation Engine** | Dynamic multi-turn debate simulation with 4 opponent personas (*Skeptical Analyst, Passionate Ideologue, Socratic Inquirer, Pragmatic Realist*) with real-time coach nudges. |
| **9** | **Performance Scoring Engine** | Strict implementation of the official **Weighted Scoring Model** (30% Argument + 20% Evidence + 20% Logic + 15% Rebuttal + 15% Communication). |
| **10** | **Recommendation & Coaching Engine** | Identification of primary strength and growth areas, tailored drills, and a structured **5-week actionable learning roadmap**. |
| **11** | **Dashboard & Analytics** | 4 specialized dashboards: **Learner Dashboard**, **Debate Coach Dashboard**, **Educator Dashboard**, and **Admin Dashboard**. |
| **12** | **Notification & Engagement System** | Session reminders, coaching alerts, practice reminders, skill milestone badges, and platform announcements. |
| **13** | **Reports & Export System** | Detailed debate and speech reports with instant **PDF export** and **Excel / CSV export** capabilities. |
| **14** | **Integration, Testing & Deployment** | End-to-end integration, 24 automated `pytest` test suites, containerized `docker-compose.yml`, and production readiness. |

---

## ⚖️ Official Weighted Scoring Formula

As required by **Section 4, Module 9**:

$$\text{Debate Performance Score} = 0.30 \times \text{Argument Quality} + 0.20 \times \text{Evidence Usage} + 0.20 \times \text{Logical Consistency} + 0.15 \times \text{Rebuttal Effectiveness} + 0.15 \times \text{Communication Skills}$$

* **Master Debater (Excellent)**: $\ge 85\%$
* **Proficient (Strong)**: $70\% - 84.9\%$
* **Competent (Developing)**: $55\% - 69.9\%$
* **Novice (Needs Improvement)**: $< 55\%$

---

## 🎭 8 Classical Logical Fallacies Detected

1. **Ad Hominem**: Attacking the opponent's character rather than substantive claims.
2. **Straw Man**: Distorting or exaggerating the opponent's premise to easily attack it.
3. **False Dilemma**: Presenting only two extreme choices when intermediate options exist.
4. **Slippery Slope**: Claiming an initial step will inevitably cause catastrophic consequences without causal proof.
5. **Appeal to Authority**: Citing an unqualified or irrelevant figure as proof of truth.
6. **Circular Reasoning**: Formulating an argument where the conclusion is assumed in the premise.
7. **Hasty Generalization**: Drawing sweeping conclusions from a tiny, non-representative sample.
8. **Red Herring**: Introducing irrelevant topics to divert attention from the core issue.

---

## 🗣️ 6 Supported Debate Formats

1. **One-on-One Debate**: Head-to-head traditional structured rounds.
2. **Parliamentary Debate**: Government vs. Opposition motion-based debates.
3. **Oxford Debate**: Formal proposition vs. opposition with audience division.
4. **Policy Debate**: Heavy evidentiary scrutiny of realistic plan implementation.
5. **Public Forum Debate**: Accessible current affairs debates for broad audiences.
6. **AI Debate Simulation**: Multi-turn adaptive training against customizable AI personas.

---

## 🚀 Quickstart Guide

### Prerequisites
* **Python**: 3.11+
* **Node.js**: 20+
* **Docker & Docker Compose** (optional for containerized deployment)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API Documentation will be accessible at: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Web application will be accessible at: `http://localhost:3000`

### 3. Docker Compose Deployment

To launch the full stack (PostgreSQL + FastAPI Backend + Next.js Frontend) in one command:

```bash
docker-compose up --build -d
```

Services:
* **Frontend**: `http://localhost:3000`
* **Backend API**: `http://localhost:8000`
* **PostgreSQL**: `localhost:5432`

---

## 🧪 Running Automated Tests

Run the complete automated test suite (24 tests covering auth, scoring, fallacies, counterarguments, presentation metrics, simulation, reports, and notifications):

```bash
python -m pytest backend/tests test_reports.py -v
```

---

## 🔑 Key API Routes

* `POST /api/auth/register` - Register user (`learner`, `coach`, `educator`, `admin`)
* `POST /api/auth/login` - Authenticate user & issue JWT
* `GET  /api/auth/me` - Get profile metadata
* `GET  /api/dashboard?role_view=learner` - Get role-specific telemetry
* `POST /api/analysis/argument` - Analyze argument across 5 criteria & detect 8 fallacies
* `POST /api/counterargument/generate` - Generate 5 types of counterarguments
* `GET  /api/simulation/personas` - List AI opponent personas
* `POST /api/simulation/start` - Start new debate simulation
* `POST /api/simulation/turn` - Conduct multi-turn debate with coach nudges
* `POST /api/simulation/summary` - Evaluate debate summary & weighted scores
* `POST /api/presentation/analyze` - Analyze speech pace, fillers, confidence, clarity
* `POST /api/presentation/analyze-audio` - Transcribe and analyze audio recording
* `POST /api/coaching` - Generate personalized recommendations & 5-week learning plan
* `GET  /api/reports` - List debate & presentation reports
* `GET  /api/reports/{type}/{id}/export/pdf` - Download PDF report
* `GET  /api/reports/{type}/{id}/export/excel` - Download Excel/CSV report
* `GET  /api/notifications` - List user notifications & milestones

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for full details.

