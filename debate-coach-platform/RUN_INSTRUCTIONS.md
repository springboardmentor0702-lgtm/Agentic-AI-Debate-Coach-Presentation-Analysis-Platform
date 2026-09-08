# 🚀 Complete Run Instructions for Debate Coach Platform

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start (Recommended)](#quick-start-recommended)
3. [Manual Setup](#manual-setup)
4. [Troubleshooting](#troubleshooting)
5. [Architecture Overview](#architecture-overview)

---

## Prerequisites

### Required Software
- **Python 3.10+** (for backend)
- **Node.js 18+** (for frontend)
- **Docker & Docker Compose** (for containerized PostgreSQL and full-stack deployment)
- **Git**

### System Requirements
- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: 2GB for dependencies
- **Ports**: 3000 (frontend), 8000 (backend), 5432 (PostgreSQL)

---

## Quick Start (Recommended)

### Option 1: Run Everything with Docker Compose (Easiest)

```bash
# Navigate to project root
cd debate-coach-platform

# Copy environment template
cp .env.example .env

# Start all services (backend, frontend, PostgreSQL)
docker compose up --build

# Wait for services to initialize (30-60 seconds)
```

**Access the application:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432 (user: debate_user, password: debug_password)

**Stop services:**
```bash
docker compose down
```

---

## Manual Setup

### Backend Setup (FastAPI + PostgreSQL)

#### Step 1: Install Backend Dependencies

```bash
cd backend

# Create Python virtual environment
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

#### Step 2: Start PostgreSQL (without Docker)

If you don't have PostgreSQL installed, install it first:
- **macOS**: `brew install postgresql`
- **Windows**: Download from https://www.postgresql.org/download/windows/
- **Linux**: `sudo apt-get install postgresql`

```bash
# Start PostgreSQL service
# macOS:
brew services start postgresql

# Linux:
sudo systemctl start postgresql

# Windows: PostgreSQL should auto-start or start via Services
```

Create database and user:
```bash
# Connect to PostgreSQL
psql -U postgres

# In psql prompt, run:
CREATE DATABASE debate_coach;
CREATE USER debate_user WITH PASSWORD 'debug_password';
ALTER ROLE debate_user SET client_encoding TO 'utf8';
ALTER ROLE debate_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE debate_user SET default_transaction_deferrable TO on;
ALTER ROLE debate_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE debate_coach TO debate_user;
\q
```

#### Step 3: Run Database Migrations

```bash
# From backend directory
alembic upgrade head
```

#### Step 4: Start Backend Server

```bash
# From backend directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend is running:** http://localhost:8000

---

### Frontend Setup (Next.js)

#### Step 1: Install Frontend Dependencies

```bash
cd frontend

npm install
```

#### Step 2: Create Environment File

```bash
# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
EOF
```

#### Step 3: Start Development Server

```bash
npm run dev
```

**Frontend is running:** http://localhost:3000

---

## Troubleshooting

### Backend Issues

#### "ModuleNotFoundError: No module named 'app'"
```bash
# Make sure you're in the backend directory and virtual environment is activated
cd backend
source .venv/bin/activate  # macOS/Linux
# or
.venv\Scripts\Activate.ps1  # Windows
```

#### "Connection refused" (PostgreSQL)
```bash
# Check if PostgreSQL is running
# macOS:
brew services list

# Linux:
sudo systemctl status postgresql

# Windows: Check Services (services.msc)

# If not running, start it:
# macOS:
brew services start postgresql

# Linux:
sudo systemctl start postgresql
```

#### "FATAL: role 'debate_user' does not exist"
```bash
# Recreate the user (see step 2 of Backend Setup)
psql -U postgres
CREATE USER debate_user WITH PASSWORD 'debug_password';
ALTER ROLE debate_user SET client_encoding TO 'utf8';
ALTER ROLE debate_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE debate_user SET default_transaction_deferrable TO on;
ALTER ROLE debate_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE debate_coach TO debate_user;
\q
```

### Frontend Issues

#### "Port 3000 already in use"
```bash
# Kill process on port 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows (PowerShell):
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Or use a different port:
npm run dev -- -p 3001
```

#### "Cannot find module" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Docker Compose Issues

#### "Port already allocated"
```bash
# Check what's using the port
docker ps

# Stop conflicting containers
docker stop <container_id>

# Or use different ports in .env:
FRONTEND_PORT=3001
BACKEND_PORT=8001
DB_PORT=5433
```

#### "Database connection failed"
```bash
# Wait 10-15 seconds for PostgreSQL to initialize
# Then restart backend container:
docker compose restart backend
```

---

## Architecture Overview

### Technology Stack

**Backend**
- Framework: FastAPI
- ORM: SQLAlchemy
- Validation: Pydantic
- Database: PostgreSQL
- Auth: JWT + Bcrypt
- Migrations: Alembic

**Frontend**
- Framework: Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- HTTP Client: Native fetch API
- State: React hooks

**Infrastructure**
- Containerization: Docker & Docker Compose
- Database: PostgreSQL 15
- API Gateway: None (direct backend calls)

### Directory Structure

```
debate-coach-platform/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API routes
│   │   ├── core/            # Settings, security, logging
│   │   ├── db/              # Database session, base
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # Data access
│   │   └── tests/           # Unit tests
│   ├── alembic/             # Database migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pytest.ini
├── frontend/
│   ├── app/                 # Next.js pages
│   ├── components/          # React components
│   ├── services/            # API service layer
│   ├── lib/                 # Utilities
│   ├── package.json
│   ├── Dockerfile
│   └── tsconfig.json
├── docker-compose.yml
├── .env.example
└── README.md
```

### API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user

#### Debates
- `GET /api/v1/debates` - List user's debates
- `POST /api/v1/debates` - Create new debate
- `GET /api/v1/debates/{debate_id}` - Get debate details
- `PUT /api/v1/debates/{debate_id}` - Update debate
- `DELETE /api/v1/debates/{debate_id}` - Delete debate
- `POST /api/v1/debates/{debate_id}/message` - Send message

#### Profile
- `GET /api/v1/profile` - Get user profile
- `PUT /api/v1/profile` - Update profile
- `GET /api/v1/profile/skills` - Get user skills
- `PUT /api/v1/profile/skills` - Update skills

#### Health & Status
- `GET /api/v1/health` - Health check

---

## Development Workflow

### Running Tests

**Backend tests:**
```bash
cd backend
pytest -q
```

**Frontend linting:**
```bash
cd frontend
npm run lint
```

**Frontend type checking:**
```bash
cd frontend
npm run build
```

### Database Migrations

```bash
# Create new migration
cd backend
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### Code Style

**Backend:** Python 3.10+ with implicit conventions (no explicit linter config)

**Frontend:** ESLint + TypeScript
```bash
cd frontend
npm run lint --fix
```

---

## Environment Variables

### Backend (.env file)

```env
# Database
DATABASE_URL=postgresql://debate_user:debug_password@localhost:5432/debate_coach

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# AI Mode
AI_MOCK_MODE=true
OPENAI_API_KEY=sk-your-key-here  # Optional when AI_MOCK_MODE=true

# Server
DEBUG=true
LOG_LEVEL=INFO
```

### Frontend (.env.local file)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Demo Credentials

**Default test user:**
- Email: jane@example.com
- Password: StrongPass123!

Register a new account on the `/register` page or use the default credentials.

---

## Next Steps

1. **Access the application:** Navigate to http://localhost:3000
2. **Register or login** with the demo credentials
3. **Create a debate** and start practicing
4. **View your profile** and track your skills
5. **Read API docs** at http://localhost:8000/docs

---

## Support & Documentation

- **API OpenAPI Docs**: http://localhost:8000/docs
- **Project README**: [README.md](README.md)
- **Chatmode Instructions**: [.github/chatmodes/debate-coach-platform.chatmode.md](.github/chatmodes/debate-coach-platform.chatmode.md)

---

## Production Deployment

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md) (if available).

**Quick notes:**
- Set `DEBUG=false` in backend
- Use a proper secrets manager for `SECRET_KEY`
- Configure PostgreSQL with strong credentials
- Use HTTPS for all frontend/backend communication
- Enable CORS properly
- Set appropriate rate limiting

---

**Last Updated**: 2026-08-31  
**Status**: Production-ready monorepo with Phase 1 complete
