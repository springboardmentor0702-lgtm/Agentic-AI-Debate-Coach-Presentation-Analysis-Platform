# MASTER BUILD SPECIFICATION — LATEST PROVIDER CONFIGURATION

**Product:** Agentic AI Debate Coach & Presentation Intelligence Platform

This project combines the attached official project specification PDF with the supplied Master Build Specification. The official PDF is the foundation; the master specification extends it with social, voice, presentation, analytics, agentic, testing and deployment requirements.

## AI provider strategy — NON-NEGOTIABLE

**PRIMARY AI: GROQ**

**FALLBACK AI: GEMINI**

**FINAL FALLBACK: DEMO MODE**

**NO OLLAMA**  
**DO NOT REQUIRE OLLAMA**  
**DO NOT REQUIRE LOCAL LLM INSTALLATION**

Provider flow:

`AI REQUEST → GROQ → GEMINI → DEMO MODE`

The backend supports explicit `AI_PROVIDER=groq|gemini|demo` and automatic fallback through `AI_FALLBACK_ENABLED=true`. Provider failures, rate limits, timeouts, malformed responses and network failures must degrade safely to the next provider. Demo Mode is clearly labeled and deterministic.

## Required environment variables

```dotenv
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here

POSTGRES_DATABASE_URL=your_postgresql_connection_string
MONGODB_URI=your_mongodb_connection_string
```

See `.env.example` for the complete configuration, including AI models, JWT secrets, CORS and upload storage.

## Security

Secrets remain backend-only. Real credentials must never be committed or packaged. `.env` is ignored by Git.

## Scope

All requirements from the official PDF and Master Build Specification are represented in the implementation, including four role experiences, authentication/RBAC, custom and suggested debates, multiple formats, adaptive AI debate, argument/fallacy/counterargument engines, universal voice path, speech metrics with estimated/unavailable labeling, PPTX parsing and slide analysis, live WebSocket debate rooms, AI referee/scoring, replay, skill graph, personalized coaching and training plans, social/friend workflows, notifications, rankings, dashboards, analytics, reports, PostgreSQL/MongoDB architecture, Docker, health/observability, seed data, API docs, tests and mentor-demo flows.
