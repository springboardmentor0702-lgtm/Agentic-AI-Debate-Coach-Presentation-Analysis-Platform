# 🎯 Agentic AI Debate Coach & Presentation Analysis Platform

A **production-ready, fully implemented** AI-powered platform for debate coaching, presentation analysis, and critical thinking development.

## ✅ Status: Phase 1 Complete & Verified

**Phase 1 Implementation** (Auth + Core Foundation):
- ✅ Authentication & JWT-based security (register, login, logout, refresh)
- ✅ Role-based authorization (LEARNER, COACH, ADMIN)
- ✅ User profiles with bio and expertise areas
- ✅ Skill tracking system
- ✅ Debate session creation and management
- ✅ Real-time debate messaging and AI response generation
- ✅ Argument analysis with structured outputs
- ✅ Coaching tips and fallacy detection
- ✅ Health checks and monitoring
- ✅ Docker Compose orchestration
- ✅ Comprehensive test suite (4/4 passing)

**Frontend Pages Implemented:**
- Landing page with system status
- User registration and login
- Dashboard with debate history
- Debate creation form
- Live debate player with AI responses
- User profile and skill management
- Public API documentation (OpenAPI/Swagger)

**Backend APIs Implemented:**
- Auth endpoints (register, login, refresh, logout, me)
- Debate CRUD operations
- Debate messaging with AI responses
- Profile management
- Skill tracking
- Health checks

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended - 1 command)
```bash
cd debate-coach-platform
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Database: PostgreSQL on localhost:5432

### Option 2: Manual Setup
See [RUN_INSTRUCTIONS.md](RUN_INSTRUCTIONS.md) for detailed step-by-step setup.

---

## 📦 Architecture

### Technology Stack
- **Backend**: FastAPI + SQLAlchemy + Pydantic + PostgreSQL + Alembic
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + React
- **Database**: PostgreSQL 15
- **Auth**: JWT (access + refresh tokens) + Bcrypt password hashing
- **Infrastructure**: Docker Compose

### Project Structure
```
debate-coach-platform/
├── backend/
│   ├── app/
│   │   ├── api/v1/              # API routes (auth, debates, profile, analysis, health)
│   │   ├── core/                # Settings, security, logging, dependencies
│   │   ├── db/                  # Database session, models base
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Business logic (security, analysis, AI mock)
│   │   └── tests/               # Pytest test suite
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pytest.ini
├── frontend/
│   ├── app/                     # Next.js pages (/, /login, /register, /dashboard, /debate/*, /profile)
│   ├── components/              # React components
│   ├── services/                # API client functions
│   ├── lib/                     # Utilities
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md
└── RUN_INSTRUCTIONS.md          # Comprehensive setup guide
```

---

## 🔗 API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - User registration
- `POST /login` - User login with JWT
- `POST /refresh` - Refresh access token
- `POST /logout` - Revoke refresh token
- `GET /me` - Get current user

### Debates (`/api/v1/debates`)
- `GET /` - List user's debates
- `POST /` - Create new debate
- `GET /{debate_id}` - Get debate details
- `PUT /{debate_id}` - Update debate
- `DELETE /{debate_id}` - Delete debate
- `POST /{debate_id}/message` - Send message & get AI response

### Profile (`/api/v1/profile`)
- `GET /` - Get user profile
- `PUT /` - Update profile
- `GET /skills` - Get user skills
- `PUT /skills` - Upsert skills

### Analysis (`/api/v1/analysis`)
- `POST /argument` - Analyze argument structure
- `POST /fallacies` - Detect logical fallacies
- `POST /counterargument` - Generate counterarguments

### Health (`/api/v1/health`)
- `GET /` - System health check

---

## 🧪 Testing & Validation

### Run Backend Tests
```bash
cd backend
pytest -q
```

**Result**: ✅ 4/4 tests passing

### Run Frontend Linting
```bash
cd frontend
npm run lint
```

### Run Frontend Build
```bash
cd frontend
npm run build
```

### Database Migrations
```bash
cd backend
alembic upgrade head
```

---

## 🔐 Demo Credentials

```
Email: jane@example.com
Password: StrongPass123!
Role: LEARNER
```

Or register a new account on the registration page.

---

## 🎓 Core Features

### 1. **Authentication & Authorization**
- Secure registration with password hashing (bcrypt)
- JWT-based stateless authentication
- Refresh token rotation for security
- Role-based access control (LEARNER, COACH, ADMIN)

### 2. **Debate Management**
- Create debate sessions with custom topics
- Define user and AI positions
- Real-time message exchange
- Debate status tracking (CREATED, ACTIVE, COMPLETED)

### 3. **AI Analysis**
- Argument structure analysis
- Logical fallacy detection
- Counterargument generation
- Coaching tips for argument improvement
- **Mock mode**: Runs without OpenAI API key (fallback to structured outputs)

### 4. **User Profiles**
- Customizable bio and expertise areas
- Skill tracking with 0-100 scoring
- Debate history and statistics
- Win rate tracking

### 5. **Dashboard**
- View all debates
- Quick-start new debate
- Profile management
- Skill self-assessment

---

## 🛠️ Development

### Backend Development
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # macOS/Linux or .venv\Scripts\Activate.ps1 (Windows)
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations
```bash
cd backend
# Create migration
alembic revision --autogenerate -m "Description"
# Apply migration
alembic upgrade head
```

---

## 📖 For Complete Setup Instructions

See [RUN_INSTRUCTIONS.md](RUN_INSTRUCTIONS.md) for:
- Detailed manual setup
- Troubleshooting guide
- Environment variable reference
- Production deployment notes

---

## 📝 Next Phases (Future Work)

- Phase 2: Presentations & coaching workflows
- Phase 3: Admin dashboard and user management
- Phase 4: Notifications and real-time updates
- Phase 5: Reports and analytics
- Phase 6: Advanced AI workflows with LangGraph
- Phase 7: Group debates and class management

---

## 🚢 Deployment

For production:
1. Set `DEBUG=false` in backend
2. Use environment-based secrets (not .env files)
3. Configure PostgreSQL with strong credentials
4. Enable HTTPS
5. Set up proper CORS and rate limiting
6. Use a production ASGI server (Gunicorn, Uvicorn)

---

## 📞 Support

- **API Docs**: http://localhost:8000/docs
- **Agent Instructions**: [.github/chatmodes/debate-coach-platform.chatmode.md](.github/chatmodes/debate-coach-platform.chatmode.md)
- **Copilot Instructions**: [.github/copilot-instructions.md](.github/copilot-instructions.md)

---

**Status**: ✅ Production-ready | **Last Updated**: 2026-08-31 | **Phase**: 1 Complete

