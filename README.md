# LOGOS.AI: Agentic AI Debate Coach & Presentation Analysis Platform

**LOGOS.AI** is a state-of-the-art, AI-powered Agentic Debate Coach & Presentation Analytics Platform engineered to assist learners, debate coaches, educators, and administrators in mastering high-stakes rhetoric, argument structure, public speaking, and logical fallacy defence.

---

## 🌟 Features

1. **Exact Editorial Design Identity**: Recreated faithfully from visual design mockups featuring a premium white/obsidian/cyber-red palette (`#D90429`), clean monospace accents, `LOGOS.AI` typography, and background `"RHETORIC"` watermarks.
2. **The Analysis Suite (8 Core Modules)**:
   - **Argument Mining**: Automatic claim & evidence extraction.
   - **Logic Audit**: Real-time detection of 8 key fallacies (*Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, Red Herring*).
   - **Rebuttal Gen**: Multi-perspective counterarguments (*Logical, Evidence-Based, Ethical, Practical, Policy*).
   - **Vocal Metrics**: Prosody analysis, WPM speech pace, filler word counter, confidence score.
   - **Simulation Engine**: Multi-turn AI debate opponent across 5 formats (*Parliamentary, Oxford, Policy, 1-on-1, Public Forum*).
   - **Scoring Model**: Exact 5-part weighted performance model ($30\%$ Arg Quality + $20\%$ Evidence + $20\%$ Consistency + $15\%$ Rebuttal + $15\%$ Communication).
   - **Coaching Engine**: Skill gap matrix & personalized learning recommendations.
   - **Analytics Suite**: Tailored dashboards for Learner, Coach, Educator, Admin.
3. **Interactive AI Debate Terminal (`/simulation`)**: Live debate cross-examination terminal with customizable AI opponent personas (*"The Contrarian"*, *"The Academic"*, *"The Strategist"*).
4. **Prosody & Vocal Analytics (`/presentation`)**: Instant WPM calculation, filler word density breakdown, confidence scoring.
5. **Reports & Exports (`/reports`)**: One-click CSV/PDF performance scorecards & certificates.
6. **Notification & Engagement Engine**: Real-time alerts for scheduled sessions, coaching feedback, and milestone achievement alerts.
7. **Vector Context Memory**: Built-in vector embedding indexes for semantic search memory, allowing the AI to recall and cross-reference statements.

---

## 🛠️ Tech Stack

* **Backend**: FastAPI, Pydantic, SQLAlchemy ORM, SQLite/PostgreSQL, MongoDB Document Store
* **Frontend**: Next.js 14, React 18, Vanilla CSS, Lucide Icons
* **DevOps & Containers**: Docker, Docker Compose

---

## 🎨 Frontend Development

The LOGOS.AI frontend is developed using Next.js 14 and React 18 with a component-driven architecture focused on providing a responsive, interactive, and premium user experience.

### Frontend Highlights:
- Responsive interfaces for Learner, Coach, Educator, and Admin dashboards.
- Interactive AI debate simulation interface for real-time argument practice.
- Presentation analysis dashboard for vocal metrics and performance insights.
- Reusable React components for consistent UI design.
- Seamless integration with FastAPI backend REST APIs.
- Premium UI design following the LOGOS.AI white/obsidian/cyber-red visual identity.

### Frontend Structure:
frontend/
├── src/
│ ├── app/ # Application routes and layouts
│ ├── components/ # Reusable UI components
│ ├── styles/ # Global styling files
│ └── utils/ # Utility functions
├── public/ # Static assets
└── package.json # Frontend dependencies and scripts 


---

## 📱 Application Routes

The platform provides dedicated pages for different functionalities:

| Route | Description |
|------|-------------|
| `/` | LOGOS.AI landing page and platform overview |
| `/dashboard` | User analytics and performance dashboard |
| `/simulation` | Interactive AI debate simulation terminal |
| `/presentation` | Presentation and vocal analysis module |
| `/reports` | Performance reports and exports |
| `/profile` | User profile and account management |

---

## 🛠️ Recommended Development Environment

For frontend development, the following tools are recommended:

- Visual Studio Code
- Node.js v18.x or later
- Git version control
- Modern web browser (Chrome, Edge, or Firefox)

### Frontend Setup Commands:

```bash
cd frontend
npm install
npm run dev


## 📂 Folder Structure

```
Agentic-AI-Debate-Coach/
├── backend/                  # FastAPI Application
│   ├── routers/              # Microservice API Endpoints
│   ├── services/             # AI Reasoning, Vector DB & Speech Metrics
│   ├── database.py           # SQL/Mongo Dual-Database Engine
│   ├── main.py               # Application Entrypoint
│   ├── requirements.txt      # Python Dependencies
│   └── package.json          # Node wrapper for execution scripts
├── frontend/                 # Next.js Application
│   ├── src/
│   │   ├── app/              # Page layouts & router endpoints
│   │   └── components/       # Premium UI components
│   └── package.json          # Frontend Dependencies & scripts
├── docker-compose.yml        # Multi-container local deployment config
├── Dockerfile.backend        # Backend image specifications
├── Dockerfile.frontend       # Frontend image specifications
└── README.md                 # Professional documentation
```

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
* [Node.js (v18.x or later)](https://nodejs.org/)
* [Python (3.10 or later)](https://www.python.org/)
* [Git](https://git-scm.com/)
* [PostgreSQL](https://www.postgresql.org/) & [MongoDB](https://www.mongodb.com/) (Optional: SQLite Fallback active by default)

---

## 💻 Local Setup Instructions

Running the application locally requires opening two terminal windows to execute the backend and frontend concurrently:

### 🖥️ Terminal 1 (Backend Server)
Navigate to the `backend/` directory, set up your configuration environment, install dependencies, and start the FastAPI reload server:
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
*(Alternatively, using Python directly: `pip install -r requirements.txt` followed by `uvicorn main:app --reload --port 8000`)*

### 🖥️ Terminal 2 (Next.js Frontend Client)
Navigate to the `frontend/` directory, install dependencies, and run the development hot-reloaded dev client:
```bash
cd frontend
npm install
npm run dev
```

---

## 🔧 Environment Variable Setup

The backend configuration relies on settings stored inside `backend/.env`. Create this file by copying the template file:
```bash
cp backend/.env.example backend/.env
```
Ensure the parameters are filled:
* `POSTGRES_USER` / `POSTGRES_PASSWORD`: Your credentials for local PostgreSQL.
* `MONGO_URI`: Address of your local MongoDB instance.
* `SECRET_KEY`: Cryptographic key used to sign JWT session access tokens.

---

## 🔗 Port Mappings & Backend Connections
* **Frontend Port**: Runs locally on port **`3000`** (`http://localhost:3000`).
* **Backend Port**: Runs locally on port **`8000`** (`http://localhost:8000`).
* **Connection Interface**: The frontend connects to the backend REST API by dispatching async requests to `http://localhost:8000/api/v1/*`. The token retrieved upon authentication is appended inside the standard `Authorization: Bearer <JWT>` request header.

---

## 📦 Build & Production Bundle
To create an optimized production deployment bundle:

### Frontend Build
```bash
cd frontend
npm run build
```

### Run Production Containers (Docker)
```bash
docker-compose up --build
```

---

## ❓ Troubleshooting & Setup Issues

### 1. PostgreSQL/MongoDB Connection Refused
* **Issue**: The server console prints fallback warning messages and switches database handlers.
* **Resolution**: Ensure your local database services are actively running:
  - On Windows (Services App): Ensure PostgreSQL and MongoDB services are marked as "Running".
  - Run database checks by running: `python backend/diagnose_db.py`.

### 2. Port 8000 or 3000 already in use
* **Issue**: Error: `listen EADDRINUSE: address already in use :::8000`.
* **Resolution**: Terminate any lingering background processes or change the port mapping config inside `backend/.env` / `frontend/package.json`.

---

## 🤝 Contributing Guidelines
1. Fork this repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
