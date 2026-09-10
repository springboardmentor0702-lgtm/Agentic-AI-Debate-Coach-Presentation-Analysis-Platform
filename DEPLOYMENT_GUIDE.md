# MindArena AI - Production Deployment Guide

## 1. Architecture Overview
- **Frontend**: Vercel (React 18 + Vite SPA) or Cloud Run / Render Container
- **Backend**: Render (Python FastAPI with Uvicorn) or Node/Express full-stack container
- **Database**: Supabase (PostgreSQL 15+ with pgvector extension)
- **AI Services**: Google Gemini (Primary) + Groq (Fallback) + Wikipedia REST API

---

## 2. Supabase Setup
1. Create a new Supabase project.
2. In the Supabase SQL Editor, run `database/migrations/001_initial_schema.sql`.
3. Enable pgvector:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "vector";
   ```
4. Verify all tables and RLS policies are created.
5. In Supabase Project Settings -> API, copy:
   - Project URL (`SUPABASE_URL`)
   - Anon public key (`SUPABASE_ANON_KEY`)
   - Service role key (`SUPABASE_SERVICE_ROLE_KEY` - **server only**)

---

## 3. Render Deployment (Backend)
1. Fork or push repository to GitHub/GitLab.
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**, and select your repository (`render.yaml` will be auto-detected).
4. Or create a **New Web Service**:
   - Runtime: `Python 3`
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
5. Configure Environment Variables:
   - `GEMINI_API_KEY`: Your Google GenAI API Key
   - `GROQ_API_KEY`: (Optional) Groq Fallback key
   - `SUPABASE_URL`: Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Secret
   - `JWT_SECRET`: Random 64-char string
   - `CORS_ORIGINS`: Your Vercel frontend URL (e.g., `https://mindarena.vercel.app`)

---

## 4. Vercel Deployment (Frontend)
1. Log into [Vercel Dashboard](https://vercel.com).
2. Click **Add New Project** and import the `frontend` folder (or root).
3. Framework Preset: `Vite`.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Configure Environment Variables:
   - `VITE_API_URL`: `https://your-render-service.onrender.com`
   - `VITE_SUPABASE_URL`: Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase Anon Key

---

## 5. Health Check & Diagnostics
Verify production backend availability:
```bash
curl -I https://your-backend.onrender.com/health
```
Expected Response:
```json
HTTP/1.1 200 OK
Content-Type: application/json

{"status": "ok", "app": "MindArena AI", "version": "1.0.0"}
```
