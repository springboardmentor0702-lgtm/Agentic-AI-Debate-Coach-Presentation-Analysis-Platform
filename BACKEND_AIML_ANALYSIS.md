# Backend and AI/ML Analysis — LOGOS.AI Debate Coach

**Target branch:** `SriRam-Kunamsetty`  
**Repository:** [Agentic-AI-Debate-Coach-Presentation-Analysis-Platform](https://github.com/springboardmentor0702-lgtm/Agentic-AI-Debate-Coach-Presentation-Analysis-Platform)  
**Prepared by:** Manus AI  
**Date:** 2026-08-17

## Executive summary

The supplied project specification describes an agentic debate-coaching platform with role-based authentication, debate-session management, argument mining, fallacy detection, counterargument generation, AI debate simulation, presentation prosody analysis, adaptive coaching, scoring, reporting, and a PostgreSQL/MongoDB persistence strategy. The original `SriRam-Kunamsetty` branch contained the specification PDF but was **31 commits behind `main` and did not contain the application source tree**. The current application baseline was therefore merged into the branch before implementation.

The upgrade focuses on the internship workstreams most relevant to backend and AI/ML engineering. The backend now has explicit authentication and ownership boundaries, persisted multi-turn simulation, validated request contracts, deterministic explainable scoring, optional FAISS semantic memory, local database fallbacks, an operational health endpoint, and test coverage. The frontend simulation and presentation requests were updated to send the JWT required by the protected endpoints.

## Specification-to-implementation map

| Required capability | Existing baseline | Updated implementation | Primary files |
|---|---|---|---|
| User registration, login, roles, and profile | JWT route existed, but demo fallback used `user_id=1` and authentication code was fragile | PBKDF2 password hashing, JWT validation, legacy SHA-256 migration, OAuth2 token endpoint, strict current-user lookup, role helper | `backend/routers/auth.py`, `backend/config.py` |
| Debate-session management | Sessions could be created for an arbitrary query-string user and completion wrote fixed demo scores | Sessions are owned by the JWT user; reads and completion enforce ownership; completion is idempotent and derives scores from stored analysis/metrics | `backend/routers/sessions.py`, `backend/models.py` |
| Argument mining and logical analysis | Heuristic service returned random scores and generic fallacies | Deterministic claim extraction, evidence signals, bounded scores, explainable fallacy metadata, counterargument structures, and input validation | `backend/services/ai_engine.py`, `backend/routers/argument_analysis.py` |
| Fallacy detection | Pattern-based behavior existed but output and scoring were not stable | Named, explainable, corrective fallacy detections are persisted with each argument analysis | `backend/services/ai_engine.py`, `backend/models.py` |
| Semantic memory | In-memory list with Python’s process-randomized `hash()` | Deterministic SHA-256 hashing embeddings, optional FAISS inner-product index, NumPy brute-force fallback, similarity search API in the service | `backend/services/ai_engine.py`, `backend/requirements.txt` |
| AI debate simulation | Every request returned `turn_index=1`; no database record was created | Persona normalization, deterministic rebuttal, persisted `SimulationTurn` rows, count-based turn indexing, stored fallacy JSON and coaching tip | `backend/routers/simulation.py`, `backend/models.py`, `backend/schemas.py` |
| Presentation analysis | Basic text metrics existed but filler phrase counting could overlap and duration was not validated | Validated duration, phrase-safe filler counting, normalized pace/confidence/clarity/engagement calculations, authenticated session ownership | `backend/services/speech_engine.py`, `backend/routers/presentation_analysis.py` |
| Weighted performance score | Scores were accepted without bounds and assigned to arbitrary users | All components are constrained to 0–100 and computed through one deterministic weighting function | `backend/services/ai_engine.py`, `backend/routers/scoring.py` |
| Adaptive coaching | Coaching plans accepted any `user_id` path value | Existing dynamic recommendations remain, but the endpoint checks that the path user matches the JWT user | `backend/routers/coaching.py` |
| Operations and deployment | No explicit health signal; wildcard CORS was enabled | `/health` endpoint and environment-driven CORS allowlist | `backend/main.py`, `backend/config.py` |

## Backend architecture

The FastAPI application is assembled in `backend/main.py`. Routers are separated by domain: authentication, sessions, argument analysis, fallacy detection, counterarguments, presentation analysis, simulation, scoring, coaching, dashboards, reports, and notifications. SQLAlchemy models are initialized through `Base.metadata.create_all`, with PostgreSQL preferred through `DATABASE_URL` and SQLite used as a local fallback when PostgreSQL is unavailable. MongoDB remains an optional secondary integration for transcript and audit workloads.

The most important request flow is now:

> **JWT authentication → authenticated user lookup → owned debate session → deterministic AI/ML analysis → persisted domain records → adaptive score/coaching output**

`ArgumentAnalysis`, `FallacyLog`, `Counterargument`, `PresentationMetric`, `PerformanceScore`, and the new `SimulationTurn` entities provide a durable record of the analysis pipeline. A simulation turn is linked to both a session and user, so a later report can reconstruct the interaction instead of relying on transient server memory.

## AI/ML implementation details

The local AI engine is intentionally provider-neutral. It does not pretend that regex heuristics are equivalent to a production LLM; instead, it exposes stable structured outputs that can later be enriched by a model adapter. The service extracts the first sentence as a working proposition, counts evidence signals such as studies, data, percentages, citations, and reports, calculates bounded metrics, and detects a defined set of fallacy patterns with an explanation and correction suggestion.

The semantic memory uses a deterministic hashing embedding. Each normalized token maps through SHA-256 to a fixed 128-dimensional vector, which is L2-normalized before indexing. When FAISS is installed, `IndexFlatIP` performs similarity retrieval; otherwise, the service uses a NumPy dot-product fallback. This is appropriate for a reproducible local baseline and avoids the unstable behavior of Python’s built-in `hash()` across processes. For production quality, this layer should later be replaced or augmented with a managed embedding model and persistent vector store.

Simulation responses are deterministic by persona. `The Contrarian` challenges the premise, `The Academic` requests definitions and evidence, and `The Strategist` focuses on implementation and trade-offs. Each turn stores the user argument, persona, opponent rebuttal, fallacy metadata, rebuttal strength, coaching tip, and sequential turn index.

## Security and correctness improvements

The earlier application allowed several routers to infer the acting user from a default or query parameter. The upgraded session, argument-analysis, presentation-analysis, simulation, scoring, and coaching flows derive identity from a signed JWT and enforce session ownership. Registration writes PBKDF2 hashes. Existing 64-character SHA-256 password records remain readable and are transparently migrated to PBKDF2 on successful login.

CORS is no longer wildcarded while credentials are enabled. Origins are read from `CORS_ORIGINS`, defaulting to `http://localhost:3000` for local development. The default development JWT secret remains intentionally visible as a fallback so the sample can start, but deployments must provide a strong `SECRET_KEY` through the environment.

## Validation performed

| Validation | Result |
|---|---|
| Python compilation of the full backend tree | Passed |
| FastAPI import and route registration | Passed; 18 routes registered and `/health` present |
| Deterministic AI analysis test | Passed |
| Authenticated session creation and owned analysis | Passed |
| Presentation metric persistence | Passed |
| Multi-turn simulation persistence and indexing | Passed; turns indexed 1 and 2 |
| Cross-user session access test | Passed; returns 404 for an unowned session |
| Isolated backend integration suite | Passed; 5 tests |
| Standalone HTTP smoke suite against Uvicorn | Passed; 7 tests |
| Next.js production build | Passed; all 11 routes compiled and statically generated |
| `git diff --check` | Passed |

The local environment still reports optional warnings when PostgreSQL and MongoDB servers or their drivers are absent. The dependency manifest now declares `psycopg2-binary` and `pymongo`; deployments should install the manifest and configure real services rather than relying on SQLite/`None` fallbacks.

## Recommended next steps

The next production increment should add database migrations, preferably Alembic, because `create_all` is not a replacement for controlled schema evolution. The platform should also move long-running speech transcription and LLM calls to background jobs, add request correlation IDs and structured logs, persist embeddings in a durable vector store, and add rate limiting and refresh-token rotation.

The current heuristic engine should be evaluated against a labeled argument/fallacy dataset before it is presented as a trained ML model. A model-evaluation harness should report precision, recall, F1, calibration, and false-positive rates by fallacy type. For speech analytics, audio ingestion, transcription, prosody extraction, and confidence calibration should be added as separate adapters rather than conflated with transcript-only metrics.

Finally, the remaining legacy routers—especially notifications, dashboards, and report exports—should be migrated to the same authenticated ownership pattern. The present update secures the core internship workstream while keeping the branch’s wider UI and report surface operational.

## References

[1]: https://github.com/springboardmentor0702-lgtm/Agentic-AI-Debate-Coach-Presentation-Analysis-Platform "Project repository"

[2]: https://github.com/springboardmentor0702-lgtm/Agentic-AI-Debate-Coach-Presentation-Analysis-Platform/tree/SriRam-Kunamsetty "SriRam-Kunamsetty branch"
