# MindArena AI - Comprehensive Project Architecture & Implementation Plan

**Tagline**: *"Train Your Mind. Sharpen Your Arguments. Master Every Debate."*

MindArena AI is a production-grade AI-powered debate coaching, presentation analysis, autonomous research, and communication intelligence platform.

---

## 1. Complete Folder Structure

```
mindarena-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point, CORS, routers & health
│   │   ├── config.py                # Pydantic Settings & environment manager
│   │   ├── dependencies.py          # Auth dependencies, JWT validation, RBAC
│   │   ├── auth/                    # Auth helpers, password hashing, JWT tokens
│   │   ├── db/                      # Supabase client, local fallback DB, schemas
│   │   ├── models/                  # SQLAlchemy / Pydantic models for DB records
│   │   ├── schemas/                 # Pydantic request/response validation schemas
│   │   ├── agents/                  # The 4 Distinct Agentic Architectures
│   │   │   ├── state.py             # Explicit LangGraph State definitions
│   │   │   ├── pipeline_agent.py    # Pattern 1: Fixed Argument Analysis Pipeline
│   │   │   ├── debate_agents.py     # Pattern 2: Multi-Agent Debate Simulation (Opponent + Judge)
│   │   │   ├── research_agent.py    # Pattern 3: Self-Directed ReAct Research Agent (Wikipedia)
│   │   │   ├── coach_agent.py       # Pattern 4: Tool-Calling AI Coach
│   │   │   └── prompts/             # Centralized engineered prompts
│   │   │       ├── argument_prompts.py
│   │   │       ├── debate_prompts.py
│   │   │       ├── judge_prompts.py
│   │   │       ├── research_prompts.py
│   │   │       └── coach_prompts.py
│   │   ├── routers/                 # REST Endpoints (18 distinct modules)
│   │   ├── services/                # Business logic, RAG retrieval, AI service provider
│   │   │   ├── ai_service.py        # Unified AI service with Gemini primary + Groq fallback
│   │   │   ├── rag_service.py       # Vector embeddings & semantic search
│   │   │   └── speech_service.py    # Presentation metric analysis
│   │   ├── tools/                   # Agent tool implementations
│   │   └── utils/                   # Helpers, security validators, sanitizers
│   ├── scripts/
│   │   ├── api_smoke_test.py        # 50+ Comprehensive API tests
│   │   └── seed_dummy_data.py       # Seed data for 4 roles and realistic records
│   ├── requirements.txt
│   └── .env.example
├── frontend/ (src/)
│   ├── assets/                      # Icons, logos, branding assets
│   ├── components/                  # Reusable accessible UI components
│   │   ├── layout/                  # Sidebar, Topbar, Layout wrappers
│   │   ├── ui/                      # Button, Card, Badge, Modal, Toast, Input
│   │   ├── ai/                      # Agent Observability Cards & Panels
│   │   └── speech/                  # VoiceInput (Web Speech API)
│   ├── context/                     # AuthContext, ThemeContext, NotificationContext
│   ├── hooks/                       # useSpeechRecognition, useAuth, useDebounce
│   ├── layouts/                     # DashboardLayout, AuthLayout
│   ├── pages/                       # 18+ Role-based screens
│   │   ├── auth/                    # Login, Register
│   │   ├── learner/                 # Dashboard, Analysis, Debates, Research, Coach, etc.
│   │   ├── coach/                   # CoachDashboard, Learners, Feedback, Goals
│   │   ├── educator/                # EducatorDashboard, Classes, Analytics
│   │   └── admin/                   # AdminDashboard, Users, Platform Analytics, Export
│   ├── services/                    # API client, Auth service, Export helpers
│   ├── types/                       # TypeScript interfaces and contracts
│   └── App.jsx                      # Route definitions & protected guards
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql   # PostgreSQL + pgvector + RLS policies
├── docs/                            # Architecture diagrams, specifications
├── server.js                        # Production Node/Express API Server (Port 3000)
├── package.json
├── render.yaml                      # Render backend deployment config
├── .env.example
└── README.md
```

---

## 2. Database Relationship Architecture

- **`profiles`**: Central user identity (id PK, role: learner|coach|educator|admin, username, experience_level, participate_in_comparison).
- **`debate_topics`**: Pre-curated & user-suggested debate propositions.
- **`argument_analyses`**: `user_id` FK -> `profiles(id)`. Stores deterministic pipeline outputs (claims, evidence_quality, logical_strength, fallacies, counterarguments).
- **`fallacy_detections`**: `user_id` FK -> `profiles(id)`. Detailed catalog of formal & informal fallacies with credibility scores.
- **`counterarguments`**: `user_id` FK -> `profiles(id)`. Multi-angle rebuttals.
- **`case_reviews`**: `user_id` FK -> `profiles(id)`. Comprehensive holistic debate case evaluations.
- **`presentation_analyses`**: `user_id` FK -> `profiles(id)`. Transcript, audio duration, WPM, filler word density, pace distribution, clarity/confidence scores.
- **`debate_sessions`**: `user_id` FK (User A), `opponent_id` FK (User B / AI), mode (ai/human), invite_status, round_count.
- **`debate_rounds`**: `session_id` FK -> `debate_sessions(id)`, round_number, user_speech, opponent_speech, judge_feedback JSONB.
- **`performance_snapshots`**: `user_id` FK -> `profiles(id)`. Longitudinal scores (logic, evidence, rebuttal, presentation, streak).
- **`goals`**: `user_id` FK -> `profiles(id)`, `assigned_by` FK -> `profiles(id)`. Measurable progress targets.
- **`classes`**: `created_by` FK -> `profiles(id)` (Educator).
- **`class_members`**: Composite PK (`class_id`, `learner_id`).
- **`coach_feedback`**: `coach_id` FK -> `profiles(id)`, `learner_id` FK -> `profiles(id)`. Targeted reviews for arguments, rounds, presentations.
- **`research_briefs`**: `user_id` FK -> `profiles(id)`. ReAct research briefs, source citations, iterations.
- **`coaching_agent_sessions`**: `user_id` FK -> `profiles(id)`. Question, tools_used JSONB, tool_results, proposed_goal, recommendation.
- **`notifications`**: `user_id` FK -> `profiles(id)`. Invites, reviews, goal alerts.
- **`coaching_embeddings`**: Knowledge base with `vector(768)` for pgvector RAG retrieval.

---

## 3. API Architecture

All endpoints enforce JWT authentication and RBAC:

- **Authentication**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- **Profiles**: `GET /api/profiles`, `GET /api/profiles/:id`, `PATCH /api/profiles/:id`
- **AI Pipeline 1 - Argument Analysis**: `POST /api/arguments/analyze`, `GET /api/arguments/history`, `POST /api/fallacies/detect`, `POST /api/counterarguments/generate`, `POST /api/case-reviews/synthesize`
- **AI Pipeline 2 - Multi-Agent Debate**: `POST /api/debates/create`, `GET /api/debates`, `GET /api/debates/:id`, `POST /api/debates/:id/round`, `POST /api/debates/:id/respond-invite`
- **AI Pipeline 3 - ReAct Research Agent**: `POST /api/research/brief`, `GET /api/research/history`
- **AI Pipeline 4 - Tool-Calling Coach Agent**: `POST /api/coaching-agent/ask`, `GET /api/coaching-agent/sessions`
- **RAG Coaching**: `POST /api/coaching/plan`, `GET /api/coaching/knowledge`
- **Presentation Analysis**: `POST /api/presentations/analyze`, `GET /api/presentations/history`
- **Performance & Analytics**: `GET /api/performance/summary`, `GET /api/performance/peer-comparison`
- **Goals**: `GET /api/goals`, `POST /api/goals`, `PATCH /api/goals/:id`, `DELETE /api/goals/:id`
- **Classes**: `GET /api/classes`, `POST /api/classes`, `POST /api/classes/:id/members`, `DELETE /api/classes/:id/members/:learnerId`
- **Coach Feedback**: `GET /api/coach-feedback`, `POST /api/coach-feedback`
- **Notifications**: `GET /api/notifications`, `PATCH /api/notifications/:id/read`
- **Data Export**: `GET /api/export?format=json|csv`
- **Health & Diagnostics**: `GET /health` -> `{"status": "ok", "app": "MindArena AI"}`

---

## 4. Frontend Route Architecture

- **Public**: `/login`, `/register`
- **Learner Routes**:
  - `/dashboard`: Overall scores, streaks, active goals, improvement trends, quick actions
  - `/argument-analysis`: Interactive claim/evidence/logic pipeline
  - `/fallacy-detection`: Formal/informal fallacy scanner
  - `/counterarguments`: Multi-perspective rebuttal generator
  - `/case-review`: Comprehensive case synthesizer
  - `/debate`: Active debate hub (AI and Human modes)
  - `/debate/:id`: Turn-based debate arena with live Judge feedback
  - `/presentation-analysis`: Voice recorder (Web Speech API) & transcript evaluator
  - `/coaching-plan`: Grounded RAG personal coaching roadmap
  - `/ask-coach`: Autonomous tool-calling AI debate mentor
  - `/research`: ReAct Wikipedia research assistant with live iteration steps
  - `/goals`: Goal tracker & metric progression
  - `/performance`: Longitudinal charts, radar diagrams, peer comparisons
  - `/notifications`: Real-time platform notifications
  - `/profile`: Experience level, comparison opt-in, account settings
- **Coach Routes**:
  - `/coach/dashboard`: Assigned learners, recent debates, feedback queue
  - `/coach/learners`: Detailed learner roster & progress reports
  - `/coach/feedback`: Direct feedback authoring tool
  - `/coach/goals`: Goal assignment for assigned learners
- **Educator Routes**:
  - `/educator/dashboard`: Cohort analytics, average scores, class management
  - `/educator/classes`: Create/edit classes and roster members
  - `/educator/classes/:id`: Granular class member progress
  - `/educator/analytics`: Class-wide skill breakdown
- **Admin Routes**:
  - `/admin/dashboard`: Platform user metrics, AI token/usage telemetry, debate counts
  - `/admin/users`: User role management & permissions
  - `/admin/classes`: Global class directory
  - `/admin/analytics`: Platform-wide telemetry & fallacy distribution
  - `/admin/export`: Authorized data exporter (CSV/JSON)

---

## 5. LangGraph & Agent Architectures

1. **Pattern 1: Fixed AI Pipeline (Argument Analysis)**
   - *State*: `ArgumentAnalysisState(argument, topic, claims, evidence, fallacies, counterarguments, scores, recommendations)`
   - *Flow*: `extract_claims -> analyze_evidence -> analyze_logical_structure -> detect_fallacies -> generate_counterarguments -> compute_scores -> generate_case_review -> END`

2. **Pattern 2: Multi-Agent Debate Simulator**
   - *State*: `DebateState(topic, stance, round_number, max_rounds, history, current_user_speech, opponent_speech, judge_feedback, status)`
   - *Agents*:
     - **Opponent Agent**: Crafts responsive, rhetorically sound opposing arguments.
     - **Judge Agent**: Impartial adjudicator evaluating logic, evidence, rebuttal, clarity, persuasiveness.
   - *Conditional Routing*: Loops for N rounds, then generates holistic Final Verdict.

3. **Pattern 3: Self-Directed ReAct Research Agent**
   - *State*: `ResearchState(topic, query_history, search_results, evaluation, is_sufficient, iteration, max_iterations, final_brief)`
   - *Tool*: Live Wikipedia REST API (`https://en.wikipedia.org/w/api.php`)
   - *Cycle*: `analyze_topic -> decide_search -> execute_wikipedia_search -> evaluate_evidence -> [Conditional: Enough information? YES -> synthesize_brief | NO -> decide_search]` with `MAX_ITERATIONS = 4`.

4. **Pattern 4: Tool-Calling Coaching Agent**
   - *State*: `CoachingAgentState(question, user_id, selected_tools, tool_results, reasoning, proposed_goal, final_response)`
   - *Tools*:
     - `get_performance_history(user_id)`
     - `get_recent_debate_results(user_id)`
     - `get_presentation_analysis(user_id)`
     - `get_current_goals(user_id)`
   - *Decision*: Dynamically invokes only the necessary tools, observes output, and synthesizes tailored coaching advice.

---

## 6. AI Provider Architecture (Primary & Fallback)

```
       Incoming Request
             │
             ▼
      [ AI Service ]
             │
             ├──► Try Primary: Google Gemini (`gemini-3.8-flash`)
             │         │
             │         ├─► [200 OK] ──► Return Validated Structured JSON
             │         │
             │         └─► [Failure / RateLimit / Timeout]
             │                     │
             │                     ▼
             └──────► Fallback: Groq API (`llama-3.3-70b-versatile`)
                                   │
                                   └─► Return Validated Structured JSON
```
- All responses are parsed, validated, and typed through strict schemas.
- Resilient local semantic fallbacks guarantee uninterrupted operation if API keys are not supplied.

---

## 7. Development Phases

- **Phase 1: Foundation (Current)**: Project structure, PostgreSQL schema, JWT Auth & RBAC, server entry point with `/health`, base React layouts, theme switching, and seed infrastructure.
- **Phase 2: Core AI**: Fixed Argument Analysis Pipeline, Fallacy Detection, Counterarguments, Case Reviews.
- **Phase 3: Debate Engine**: Multi-Agent AI Debate Simulation (Opponent + Judge) & Human-vs-Human Turn Debate.
- **Phase 4: Presentation & Speech**: Web Speech API integration, transcript analysis, WPM, filler words, pace radar.
- **Phase 5: RAG Coaching**: Semantic knowledge base, embedding matching, personalized coaching roadmaps.
- **Phase 6: ReAct Research Agent**: Autonomous Wikipedia research loop with safe iteration bounds.
- **Phase 7: Tool-Calling Coaching Agent**: 4 core tools, autonomous dispatch, session recording.
- **Phase 8: Platform & Roles**: Learner, Coach, Educator, Admin views, Goals, Classes, Peer Comparison, Notifications, Data Export.
- **Phase 9: Verification & Tests**: 50+ API smoke tests, error resilience, role validation.
- **Phase 10: Production Deployment**: Render, Vercel, Supabase setup guides.
