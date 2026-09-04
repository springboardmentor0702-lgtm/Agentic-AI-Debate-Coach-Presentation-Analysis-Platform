# Architecture

## Request path
React/Vite → FastAPI → service/agent orchestration → provider abstraction → Groq/Gemini/Demo.

## Data path
Structured entities are relational in PostgreSQL. Flexible AI artifacts are written to MongoDB when configured. The app remains demonstrable without external AI keys and safely tolerates an unconfigured MongoDB URI.

## Agent modules
Argument Analysis, Fallacy Detection, Counterargument, Evidence/Reasoning, Debate, Speech, Presentation, Coaching, Analytics and Report agents are represented as separate modules and service boundaries.

## Security boundaries
Browser never receives provider/database/JWT secrets. Every private endpoint derives the current user from JWT and role-specific endpoints enforce authorization server-side.

## Extensibility
Debate formats and AI providers are selected through abstractions so tournaments, teams, additional providers, multilingual coaching, video/gesture analysis and calendar/email integrations can be added without replacing core workflows.
