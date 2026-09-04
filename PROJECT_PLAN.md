# ClashLab (Debate Coach & Presentation Analysis Platform) — Project Plan

> **Note on this document:** reconstructed from the full conversation
> history, not pulled from a live file — my working environment has
> reset between sessions many times, so this is rebuilt from what was
> actually discussed, built, and tested rather than a file I could
> directly copy. If anything here doesn't match what you actually
> have on disk, that's the file to trust — tell me and I'll correct
> this document, not the other way around.

## Stack, in brief

Python + FastAPI backend, React + Vite + Tailwind frontend, PostgreSQL
via Supabase (JSONB columns substitute for the spec's "MongoDB" —
one database instead of two, same flexibility), `pgvector` for RAG,
Gemini → Groq free-tier LLM fallback via plain `requests`/`httpx`
(no SDK), LangGraph for agentic orchestration (not full LangChain —
deliberately lighter). Zero paid services. Deployment target:
Vercel/Netlify (frontend) + Render (backend).

---

## Completed segments

- [x] **Segment 0 — Scaffold**: FastAPI + Vite base, health check,
  config/env wiring, Gemini/Groq LLM client skeleton.
- [x] **Segment 1 — Auth & Profiles**: Supabase Auth (email/password),
  JWT verification, role-based access (learner, debate_coach,
  educator, admin), profile CRUD.
- [x] **Segment 2 — Argument Analysis Engine**: claim extraction,
  5-dimension scoring (clarity, relevance, evidence strength, logical
  consistency, persuasiveness).
- [x] **Segment 3 — Logical Fallacy Detection**: 8 supported fallacy
  types, credibility scoring, correction suggestions.
- [x] **Segment 4 — Counterargument Generation**: rebuttals, challenge
  questions, alternative perspectives, strategy suggestions.
- [x] **Segment 5 — Full Case Review Agent**: first real LangGraph
  agent — a fan-out/fan-in graph that plans which sub-tools are
  relevant, runs them, and synthesizes one verdict.
- [x] **Segment 6 — AI Debate Simulation**: second LangGraph agent — a
  true multi-agent graph (distinct Opponent + Judge agents), sequential
  turns, round-by-round scoring.
- [x] **Segment 7 — Presentation Analysis**: browser Web Speech API
  for capture, pace/filler-word/confidence/clarity/engagement scoring.
- [x] **Segment 8 — Performance Scoring Engine**: the weighted formula
  from spec (Argument Quality 30%, Evidence Usage 20%, Logical
  Consistency 20%, Rebuttal Effectiveness 15%, Communication Skills
  15%), always computed live, never stale.
- [x] **Segment 9 — Coaching & RAG**: genuine retrieval-augmented
  generation — Gemini embeddings, `pgvector` search over a seeded
  coaching-knowledge base, grounded recommendations.
- [x] **Segment 10 — Dashboards**: Learner, Coach, Educator (shared
  with Coach at this point), Admin dashboards.
- [x] **Segment 11 — Notifications**: debate reminders, coaching
  alerts, milestone notifications, announcements — polling-based.
- [x] **Segment 12 — Reports & Export**: aggregate PDF/Excel progress
  reports.
- [x] **Segment 13 — Profile Management**: Edit Profile page, shared
  password-checklist component.
- [x] **Segment 14 — Historical Tracking & Trend Analytics**:
  `performance_snapshots` table, written automatically after every
  scored activity.
- [x] **Segment 15 — Goals & Session Scheduling**: structured
  measurable goals, live progress; debate session scheduling.
- [x] **Segment 16 — Peer Comparison for Learners**: anonymous,
  opt-in-only percentile comparison.
- [x] **Segment 17 — Per-Item Reports**: PDF export for any single
  past analysis/session. Email notifications explicitly deferred.
- [x] **Bugfix Round 3**: goal editing, dashboard goal-progress widget,
  a real timezone bug in scheduled-debate reminders fixed, debate
  schedule editing, Peer Comparison chart-contrast bug fixed,
  configurable comparison pool size, PDF reports beautified and
  rebranded — first appearance of the ClashLab name.
- [x] **Segment 18 — Concurrent Data Fetching (performance)**: fixed
  the real cause of slow/failing loads — `db_select_async` was
  creating a brand-new `httpx.AsyncClient` on every call instead of
  reusing one, causing connection exhaustion under concurrent load.
- [x] **Segment 19 — Admin Real Features**: full user management, AI
  model monitoring (Gemini vs. Groq success/failure counters), Peer
  Comparison's minimum pool size moved to a database-backed setting.
- [x] **Segment 20 — Coach & Educator real features**: per-learner
  drill-down, manual feedback, goal assignment, class-wide trend
  chart, coach-level PDF report, topic suggestions.
- [x] **Bugfix round**: admin account editing extended to email/
  password; feedback notifications fixed to link to the *specific*
  item; feedback history enriched with who/what.
- [x] **Segment 21 — Classes & Cohorts**: a coach/educator can create a
  named class, scoped roster/trend/report — reusing (not duplicating)
  ranking and trend logic via two extracted shared helpers.
- [x] **Segment 22 — Usernames**: unique, case-insensitive usernames,
  exact-match search endpoint.
- [x] **Segment 23 — Human-vs-Human Debate Mode**: invite a specific
  person by username to a real, turn-based debate — creator opens
  each round, opponent responds, AI judges once both are in. The 5
  named formats got real distinct behavior (timers, round targets,
  judging emphasis). Includes a live round tally and an end-debate
  action.
- [x] **Post-Segment-23 bugfix rounds** (several real, distinct bugs,
  each fixed and verified against actual error output):
  - Wrong import path (`debate_agent` → real `debate_simulation_agent`)
    crashing the backend on startup.
  - `debate_rounds.opponent_argument`/`judge_feedback` needed to
    become nullable to support a round that opens now, completes
    later.
  - `supabase_client.py`'s error handling was discarding the actual
    Postgres error detail on every failure — fixed to surface it.
  - `debate_rounds.user_id` was a real `NOT NULL` column neither
    insert path was setting.
  - A frontend bug: `judge_feedback` defaults to `{}` (truthy in JS),
    not `null` — an unjudged round was read as "opponent won by
    default." Fixed by checking for `round_winner`'s actual presence.
  - No way to end a debate at all — added a live tally and an
    end-debate action.
  - `run_debate_round()`'s real call signature didn't match what was
    being called — fixed against the confirmed real function
    signature.
- [x] **Dummy data tooling**: a wipe script and a seed script creating
  a full realistic dataset (1 admin, 1 coach, 1 educator, 8 learners,
  classes, goals, peer-comparison opt-ins, coach feedback, both debate
  modes) — verified by running the full script against a mocked
  Supabase and inspecting the entire request log.
- [x] **Segment 24 — Agentic Debate Prep Research Assistant**: a
  genuine ReAct-style LangGraph loop (plan → search → decide whether
  to search again → synthesize) — the model itself controls how many
  times it searches, verified directly: sometimes 2 searches, sometimes
  0, with a hard safety cap forcing a stop if it would otherwise loop
  forever. Search backend is Wikipedia's public REST API via plain
  `requests`, a deliberate choice over a scraping-based search library
  (`ddgs`) whose Rust/C-extension dependencies (`lxml`, `primp`) carry
  the same install-risk category that broke CrewAI back in Segment 0
  on this project's unusual Python 3.14 + Windows setup.
- [x] **Segment 25 — Agentic Coaching Upgrade**: upgrades Coaching Plan
  into a genuine tool-calling agent choosing between 4 bound tools
  (performance history, coaching-knowledge search, active goals, goal
  proposal) rather than a fixed pipeline — verified chaining two
  different tools, deciding zero tools are needed, the safety cap, and
  a bad tool call being caught without crashing. The agent never
  silently creates a goal — it proposes one, and the learner has to
  explicitly accept it. The coaching-knowledge search tool was
  initially a guess (wrong RPC function name) and was corrected to
  directly reuse the real, confirmed `_retrieve_knowledge()` from
  Segment 9 rather than reimplementing it a second time.
- [x] **Segment 26 — Easy Wins Bundle**: practice streaks (live-
  computed, verified across 8 scenarios including the trickiest edge
  cases — a streak that doesn't reset just because today hasn't
  happened yet, and same-day activity across multiple tables correctly
  counting once, not stacking), an inactivity nudge, a browsable topic
  library with "surprise me" (reusing the existing suggested-topic
  mechanism rather than adding a new one), one-click "practice this
  topic again" and client-side history search on all 5 single-shot
  tools, and a full personal data export (verified to include
  human-vs-human sessions from both the creator and opponent side, and
  to survive one table failing without breaking the rest).
- [x] **Theme system fix**: discovered mid-build that the project
  already had a proper `ThemeContext`/`ThemeProvider`/`useTheme` system
  (revealed by a real crash on the Login page) that had never been
  wired up in `App.jsx` — fixed by reconstructing the real system
  (confirmed against the exact error message) rather than the
  disconnected local implementation used at first. Also fixed: the
  toggle showing the destination instead of the current state, and a
  layout-shift ("jitter") on click from the label's changing text
  width.
- [x] **Sidebar redesign**: icons on every nav link, a role badge
  under the profile name, a proper `h-screen` + independently-
  scrolling shell (the original `min-h-screen` let a tall page's
  content drag the whole sidebar's footer off-screen instead of
  keeping it pinned), and — most recently — an explicit, labeled
  "Dashboard" nav link (previously only reachable via the logo).
- [x] **Password validation bug**: `Register.jsx`/`EditProfile.jsx`
  assumed `PasswordChecklist` reported validity via an `onValidChange`
  callback prop that doesn't exist on the real component — silently
  never called, so `passwordValid` stayed `false` forever regardless
  of input. Fixed to call the real, separately-exported
  `isPasswordValid()` directly at submit time; reproduced the exact
  bug against the real component before confirming the fix.

---

## Remaining plan

- [ ] **Segment 27 — Full functional testing pass** *(reordered ahead
  of the UI revamp and deployment — moved up on your call, since
  there's real value in proving every feature actually works
  end-to-end before investing in a visual rebuild or shipping
  anywhere)*: a full data wipe, a rebuilt seed script covering every
  feature through Segment 26 (not just what existed when the original
  seed script was written — counterarguments, case reviews, research
  briefs, coaching agent sessions, and consecutive-day activity so
  streaks have something real to show), and a written manual test plan
  with concrete sample inputs per module per role, rather than testing
  ad hoc.
- [ ] **Segment 28 — Full UI/UX Revamp** *(was 27)*: rebrand to
  ClashLab across every page, replace the sidebar with a modern
  animated top nav, glassmorphism that adapts to both light and dark
  mode, a proper toast/snackbar notification system, modern loading
  states. Hard constraint: every existing feature must keep working
  exactly as-is. A fair amount of this sidebar's visual groundwork
  (icons, role badge, proper scroll architecture) is arguably already
  done ahead of schedule.
- [ ] **Segment 29 — Testing, polish, deployment** *(was 28)*:
  Vercel/Netlify + Render, Docker + GitHub Actions CI, final docs.

## Deferred until after deployment

- **Public debate rooms** (anyone joins, shares views, AI scores
  comments) — a genuinely bigger feature than 1-on-1 human-vs-human,
  with real moderation questions once anyone can post into a shared
  space.
- **Any open chat/DM system** beyond the narrow in-debate messaging
  already scoped into Segment 23 — real safety surface area (blocking,
  abuse reporting) a zero-budget solo project doesn't have
  infrastructure for yet.

## Bigger optional ideas, not currently planned

Saved audio playback for Presentation Analysis (needs actual audio
storage, not just the transcript kept today); short gamified drills
("spot the fallacy," timed mini-exercises); a structured Claim/
Evidence/Warrant guided template as an alternative to freeform text.

## Deliberately not built (documented simplifications, not oversights)

- Full email notifications (deferred per your call in Segment 17).
- MongoDB (Postgres JSONB substitutes — one database instead of two).
- LangChain, CrewAI, AutoGen, Hugging Face Transformers, self-hosted
  Whisper, Elasticsearch, FAISS, scikit-learn/TensorFlow/PyTorch —
  each has a documented free/lighter substitute already in use, or was
  evaluated and rejected for a specific reason.
- A password-reset-via-email flow (admin-set passwords take effect
  immediately instead).
