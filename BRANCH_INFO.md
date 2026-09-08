# LOGOS.AI - Agentic AI Debate Coach & Presentation Analysis Platform

**Repository**: https://github.com/springboardmentor0702-lgtm/Agentic-AI-Debate-Coach-Presentation-Analysis-Platform

## Branch Information

**Current Branch**: `NehaDeepthi`

**Branch URL**: https://github.com/springboardmentor0702-lgtm/Agentic-AI-Debate-Coach-Presentation-Analysis-Platform/tree/NehaDeepthi

## Recent Fixes Applied

### 1. Frontend State Management (frontend/app/debate/page.js)
- **Issue**: Missing `format` and `persona` useState declarations
- **Fix**: Added state initialization:
  ```javascript
  const [format, setFormat] = useState('1-on-1');
  const [persona, setPersona] = useState('The Contrarian');
  ```

### 2. API Configuration (frontend/lib/api.js)
- **Issue**: Missing fallback for `API_BASE` when environment variable is undefined
- **Fix**: Added fallback URL:
  ```javascript
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  ```

## Backend Setup

### Requirements
The backend dependencies are defined in `backend/requirements.txt`:
- fastapi
- uvicorn[standard]
- python-dotenv
- pydantic>=2.9.0
- pydantic-settings
- python-multipart
- sqlalchemy
- pymysql
- cryptography
- google-generativeai
- openai
- google-genai
- groq

### Installation & Running

1. **Install dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start the server**:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:3000` and communicate with the backend at `http://localhost:8000/api/v1`.

## Project Structure

```
├── backend/              # FastAPI backend application
│   ├── routers/         # API route handlers
│   ├── services/        # Business logic services
│   ├── schemas.py       # Data models
│   ├── main.py          # Application entry point
│   └── requirements.txt  # Python dependencies
├── frontend/            # Next.js React frontend
│   ├── app/             # Application pages
│   │   ├── debate/      # Debate arena interface
│   │   ├── analysis/    # Argument analysis page
│   │   ├── presentation/ # Presentation analytics
│   │   └── history/     # Session history
│   ├── lib/             # API client utilities
│   └── package.json     # Node dependencies
├── ai-ml/               # Machine learning modules
└── aiml/                # Alternative ML implementation
```

## Key Features

- **Debate Simulation**: Practice debates against AI opponents with configurable formats and personas
- **Argument Analysis**: Detect logical fallacies and evaluate argument strength
- **Vocal Analytics**: Analyze speech pace, filler words, and presentation metrics
- **Performance Evaluation**: Get detailed metrics and personalized coaching recommendations
- **Session History**: Track all debate sessions and performance progress

## Troubleshooting

**"Failed to fetch" error on frontend**:
- Ensure backend server is running on `http://localhost:8000`
- Check that all environment variables are properly configured
- Verify CORS settings in the backend

**Dependencies not installing**:
- Use Python 3.8+
- Create a virtual environment: `python -m venv venv`
- Activate it and try installing again

---

Last Updated: 2026-09-08
