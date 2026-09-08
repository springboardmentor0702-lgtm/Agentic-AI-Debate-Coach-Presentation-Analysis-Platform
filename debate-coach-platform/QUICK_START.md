# ⚡ QUICK START GUIDE

## 🚀 Get Running in 60 Seconds

### Prerequisites Check
- ✅ Docker installed? → Follow **Docker Setup**
- ✅ Python 3.10+ & Node.js 18+? → Follow **Manual Setup**

---

## 📦 Docker Setup (Recommended)

### 1. Start Everything
```bash
cd debate-coach-platform
docker compose up --build
```

**Wait 30-60 seconds for services to initialize...**

### 2. Access the Application

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3000 | User interface |
| Backend API | http://localhost:8000 | REST API |
| API Docs | http://localhost:8000/docs | Interactive Swagger UI |
| Database | localhost:5432 | PostgreSQL |

### 3. Login
```
Email: jane@example.com
Password: StrongPass123!
```

### 4. Stop Everything
```bash
docker compose down
```

---

## 🖥️ Manual Setup (Development)

### Backend

```bash
# 1. Navigate to backend
cd backend

# 2. Create Python environment
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# OR
.venv\Scripts\Activate.ps1  # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup PostgreSQL database
# Ensure PostgreSQL is running locally, then:
psql -U postgres
CREATE DATABASE debate_coach;
CREATE USER debate_user WITH PASSWORD 'debug_password';
ALTER ROLE debate_user SET client_encoding TO 'utf8';
ALTER ROLE debate_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE debate_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE debate_coach TO debate_user;
\q

# 5. Run migrations
alembic upgrade head

# 6. Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend running at **http://localhost:8000**

### Frontend

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Create environment file
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1" > .env.local

# 4. Start development server
npm run dev
```

✅ Frontend running at **http://localhost:3000**

---

## 🎯 What to Do Next

### Option 1: Login with Demo Account
1. Go to http://localhost:3000/login
2. Use credentials:
   - Email: `jane@example.com`
   - Password: `StrongPass123!`
3. Explore the dashboard

### Option 2: Create New Account
1. Go to http://localhost:3000/register
2. Fill in registration form
3. You'll be auto-logged in

### Option 3: Test Admin Features
1. Create an account and check console for role assignment
2. (Admin role requires database modification for this demo)

---

## 🔍 Explore Features

### Debates
- Dashboard → "Start Debate" or "New debate" button
- Create a debate session
- Send messages and see AI responses
- View argument analysis and coaching tips

### Presentations
- Dashboard → "Presentations" quick action
- Upload presentation
- View analysis results

### Analytics
- Dashboard → "Analytics" quick action
- View performance reports
- See progress tracking

### Profile
- Dashboard → "My profile"
- Update bio and expertise
- Manage skills

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [RUN_INSTRUCTIONS.md](RUN_INSTRUCTIONS.md) | Complete setup & troubleshooting (200+ lines) |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment guide (700+ lines) |
| [README.md](README.md) | Project overview & features |
| [PROJECT_COMPLETION.md](PROJECT_COMPLETION.md) | Full feature list & status |

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000/8000 in use | `docker compose down` or use different ports |
| Database connection refused | Wait 30-60s for PostgreSQL to initialize |
| "Module not found" error | Run `pip install -r requirements.txt` |
| Frontend not loading data | Check `NEXT_PUBLIC_API_BASE_URL` in `.env.local` |
| Container won't start | Check logs: `docker compose logs [service_name]` |

---

## ✨ Key Features Implemented

✅ **Authentication** - Register, login, logout, token refresh  
✅ **Debates** - Create sessions, message exchange, AI responses  
✅ **Presentations** - Upload, manage, analyze  
✅ **Analytics** - Performance reports, progress tracking  
✅ **Notifications** - Full notification system  
✅ **Admin Panel** - User management, statistics  
✅ **Security** - JWT auth, bcrypt hashing, CORS  
✅ **Database** - PostgreSQL with Alembic migrations  
✅ **Docker** - One-command deployment  
✅ **Tests** - Backend tests passing (4/4)  

---

## 🎓 Learning Path

1. **Start here**: Run with Docker Compose
2. **Explore**: Login and test features
3. **Read**: Check API docs at `/docs`
4. **Develop**: Follow manual setup for development
5. **Deploy**: Read DEPLOYMENT.md for production

---

## 📞 Common Commands

### Docker
```bash
docker compose up              # Start services
docker compose down            # Stop services
docker compose logs -f backend # View backend logs
docker compose logs -f frontend # View frontend logs
```

### Backend Testing
```bash
cd backend
pytest -q              # Run tests
pytest test_health.py -v  # Run specific test
flake8 app/           # Lint code
```

### Frontend
```bash
cd frontend
npm run lint          # Run linter
npm run build         # Production build
npm run dev          # Development server
```

---

## 🔐 Security Notes

- Store `.env` file securely (not in git)
- Change JWT_SECRET_KEY in production
- Use strong database passwords in production
- Enable HTTPS in production
- See DEPLOYMENT.md for security best practices

---

## 📊 Architecture

```
┌─────────────────────────────────────┐
│   Frontend (Next.js, React, TS)    │
│   http://localhost:3000             │
└────────────┬────────────────────────┘
             │
             │ API Calls (REST)
             ▼
┌─────────────────────────────────────┐
│  Backend (FastAPI, Python)          │
│  http://localhost:8000              │
│  ├─ Auth (JWT, Bcrypt)             │
│  ├─ Debates                        │
│  ├─ Presentations                  │
│  ├─ Analytics                      │
│  ├─ Notifications                  │
│  └─ Admin                          │
└────────────┬────────────────────────┘
             │
             │ SQL Queries
             ▼
┌─────────────────────────────────────┐
│  PostgreSQL Database                │
│  localhost:5432                     │
│  ├─ Users & Roles                  │
│  ├─ Debates & Messages             │
│  ├─ Presentations                  │
│  ├─ Analytics                      │
│  ├─ Notifications                  │
│  └─ Skills & Profiles              │
└─────────────────────────────────────┘
```

---

## 🎯 Next Steps After Setup

1. **Verify Backend**: Visit http://localhost:8000/docs
2. **Verify Frontend**: Visit http://localhost:3000
3. **Login**: Use jane@example.com / StrongPass123!
4. **Test Features**: Try creating a debate
5. **Review Code**: Explore backend/app/ and frontend/app/
6. **Read Docs**: Check out the documentation files

---

## ✅ Success Checklist

- [ ] Services running (Docker or manual)
- [ ] Frontend accessible at http://localhost:3000
- [ ] Backend accessible at http://localhost:8000/docs
- [ ] Can login with demo credentials
- [ ] Can create a debate
- [ ] Can view analytics
- [ ] Can access admin panel (if admin role)

---

**🎉 Once all items are checked, you're ready to start developing or deploying!**

---

**Last Updated**: 2026-08-31  
**Platform Status**: ✅ Production-Ready
