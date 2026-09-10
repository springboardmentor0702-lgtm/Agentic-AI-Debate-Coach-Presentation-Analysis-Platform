# MindArena AI

> **"Train Your Mind. Sharpen Your Arguments. Master Every Debate."**

MindArena AI is a production-style full-stack web application for debate coaching, presentation analysis, autonomous research, and communication intelligence.

The platform combines traditional learning tools with **FOUR genuinely different AI agent architectures**:

1. **Fixed AI Pipeline**: Deterministic argument breakdown (Claims -> Evidence -> Logic -> Fallacies -> Counterarguments -> Synthesis).
2. **Multi-Agent Debate Simulation**: Turn-based debate arena with autonomous **Opponent Agent** and impartial **Judge Agent**.
3. **Self-Directed ReAct Research Agent**: Autonomous loop researching topics via Wikipedia REST API with dynamic stopping conditions and verifiable citations.
4. **Tool-Calling AI Coaching Agent**: Specialized mentor ("Ask Your Coach") dynamically invoking tools (`get_performance_history`, `get_recent_debate_results`, `get_presentation_analysis`, `get_current_goals`).

---

## Key Features

- **Four User Roles (RBAC)**: Learner, Debate Coach, Educator, and Administrator.
- **RAG Coaching System**: Grounded in curated debate and public speaking strategies with pgvector semantic similarity search.
- **Presentation & Speech Analysis**: Real-time microphone capture via Web Speech API, Words-per-Minute (WPM) tracking, filler word detection, and delivery pacing diagnostics.
- **Human-vs-Human Debates**: Peer challenge invitation workflow with turn-by-turn AI adjudication.
- **Peer Performance Comparison**: Aggregated anonymized benchmark percentiles while respecting privacy preferences.
- **Goal Management & Practice Streaks**: Quantifiable milestone tracking with coach and educator assignment capabilities.
- **Institutional Classrooms**: Cohort rosters, class-wide skill radar charts, and progress tracking for educators.
- **Authorized Data Export**: Secure JSON and CSV export capabilities.

---

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Recharts, Lucide Icons, Web Speech API.
- **Backend**: Node.js / Express (Integrated Full-Stack Server) & Python FastAPI (LangGraph Agent Engine).
- **AI Infrastructure**: Google Gemini (`gemini-3.8-flash`) primary with Groq (`llama-3.3-70b-versatile`) fallback.
- **Database & Storage**: PostgreSQL 15+, Supabase Auth, pgvector, Row Level Security (RLS).
- **Deployment**: Vercel (Frontend), Render (Backend), Supabase (Database).

---

## Documentation Links
- [Project Plan & Architecture (PROJECT_PLAN.md)](./PROJECT_PLAN.md)
- [Setup & Installation (SETUP.md)](./SETUP.md)
- [Comprehensive Test Plan (TEST_PLAN.md)](./TEST_PLAN.md)
- [Deployment Guide (DEPLOYMENT_GUIDE.md)](./DEPLOYMENT_GUIDE.md)
- [Database Migrations (database/migrations/001_initial_schema.sql)](./database/migrations/001_initial_schema.sql)
