# ClashLab — Deployment Guide (Segment 28)

Path: GitHub → Render (backend) → Vercel (frontend). Both hosts are
free-tier, both deploy automatically from GitHub on every push after
the first setup.

**One thing to know about Render's free tier**: a free web service
"spins down" after 15 minutes of no traffic, and takes 30-60 seconds
to wake back up on the next request. This is completely normal, not a
bug — the first request after a quiet period will just feel slow.

---

## Part 1 — Get the code onto GitHub

You said this isn't set up yet, so starting from scratch:

1. Go to [github.com/new](https://github.com/new), create a new
   **private** repository (keep it private — your `.env` files should
   never be in it, but private is a safe default regardless), name it
   something like `debate-coach-platform`. Don't initialize it with a
   README (you already have a project).

2. In your project's root folder (the one containing both `backend/`
   and `frontend/`), save the `.gitignore` file from this delivery
   **at the root**, then run:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/debate-coach-platform.git
   git push -u origin main
   ```

3. **Before that push, double-check `.env` isn't tracked.** Run:
   ```powershell
   git status
   ```
   If you see `backend/.env` or `frontend/.env` listed as a file to
   be committed, the `.gitignore` isn't in the right place or wasn't
   saved before `git add .` — fix that before pushing. Committing a
   real API key to a public or private repo is a real risk (private
   repos can still be misconfigured, forked, or a collaborator added
   later) — worth being careful once, not routinely re-checking.

---

## Part 2 — Deploy the backend on Render

1. Go to [render.com](https://render.com), sign up (GitHub login is
   easiest), and click **New → Blueprint**.
2. Connect your GitHub account and select the repository you just
   pushed. Render will detect the `render.yaml` file from this
   delivery (save it to your project **root**, not inside `backend/`)
   and pre-fill the service configuration.
3. When prompted, fill in the environment variables — these are the
   exact same values from your local `backend/.env` file:

   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `SUPABASE_SERVICE_KEY` | Your Supabase service key |
   | `GEMINI_API_KEY` | Your Gemini key |
   | `GROQ_API_KEY` | Your Groq key |
   | `GEMINI_MODEL` | Whatever `check_gemini_models.py` confirmed works |
   | `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` |
   | `GROQ_MODEL` | `openai/gpt-oss-120b` |
   | `FRONTEND_ORIGIN` | Leave a placeholder for now (e.g. `http://localhost:5173`) — you'll update this in Part 4 once you have your real Vercel URL |

4. Click **Apply** / **Create**. Render will build and deploy —
   this takes a few minutes the first time. When it's done, you'll
   have a URL like `https://clashlab-backend.onrender.com`.
5. **Test it immediately**: visit `https://clashlab-backend.onrender.com/health`
   in your browser. You should see a healthy response. If you get an
   error instead, check Render's **Logs** tab — it's the same kind of
   traceback you've seen locally, just on Render's servers instead of
   your machine.

---

## Part 3 — Deploy the frontend on Vercel

1. Go to [vercel.com](https://vercel.com), sign up with GitHub, click
   **Add New → Project**, and select the same repository.
2. Vercel auto-detects a Vite project. Set the **Root Directory** to
   `frontend` (important — otherwise it'll try to build from the repo
   root and fail to find `package.json`).
3. Before deploying, add these environment variables (Vercel's
   project settings → Environment Variables):

   | Variable | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Same Supabase URL as the backend |
   | `VITE_SUPABASE_ANON_KEY` | Same Supabase anon key as the backend |
   | *(backend URL variable)* | Your new Render URL from Part 2 |

   **On that last row** — I need you to check one thing yourself:
   open `frontend/src/lib/api.js` and look for a line like
   `import.meta.env.VITE_something`. Whatever that exact variable name
   is, that's the one to set here, pointed at your Render backend URL
   (e.g. `https://clashlab-backend.onrender.com`). I don't have
   current visibility into that file to confirm the exact name with
   certainty, so this is worth 10 seconds of checking rather than me
   guessing it and you finding out only when the deployed frontend
   can't reach the backend.

4. Click **Deploy**. You'll get a URL like `https://clashlab.vercel.app`.

---

## Part 4 — Connect the two (fix CORS)

Right now your backend still only trusts `localhost`. Go back to
Render, open your backend service's **Environment** tab, and update:

```
FRONTEND_ORIGIN = https://clashlab.vercel.app
```

(your actual Vercel URL from Part 3). Render will automatically
redeploy with the new value. This is the one genuinely necessary
manual reconnection step — everything else deploys independently.

---

## Part 5 — Supabase: allow the new domain

Supabase's Auth settings restrict which URLs can redirect after
login. In your Supabase dashboard → **Authentication → URL
Configuration**, add your Vercel URL to the allowed redirect URLs
list, alongside your existing `localhost` entry (keep localhost too,
so local dev keeps working).

---

## Part 6 — Verify the whole thing end to end

1. Visit your Vercel URL. Try logging in with one of your seeded
   accounts.
2. If login works but API calls fail (check the browser console for
   CORS or network errors), the most likely causes are: `FRONTEND_ORIGIN`
   on Render doesn't exactly match your Vercel URL (must match exactly,
   including `https://` and no trailing slash), or the frontend's
   backend-URL environment variable from Part 3 is wrong.
3. Try the same manual test plan (`TEST_PLAN.md`) against the live
   URL — you don't need to redo everything, but running through a few
   checks per role confirms the deployed version genuinely works, not
   just "the build succeeded."

---

## What happens on future changes

Both Render and Vercel are now connected to your GitHub repo — every
`git push` to `main` automatically redeploys both. No manual
redeployment steps needed after this initial setup, including once
the UI revamp (Segment 29) happens later.
