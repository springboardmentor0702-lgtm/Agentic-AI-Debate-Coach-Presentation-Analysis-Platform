# Real Product Rules

This build follows a strict data-integrity rule: the product never presents fabricated activity as real user activity.

- New users start with empty states and zero completed activity.
- Registration captures full name, email, password and a non-admin role.
- Dashboard scores come from stored Score records.
- Debate messages are persisted in PostgreSQL and AI responses are stored with their actual provider.
- Debate scoring is derived from the learner's submitted debate text, not fixed demo numbers.
- Analytics explicitly reports `REAL USER DATA` or a no-data state.
- Human live rooms require an authenticated participant and a real debate join code.
- Friend invitations require an accepted friendship.
- Presentation analysis is tied to the uploaded PPTX and captured slide speech.
- Groq is primary, Gemini fallback, Demo final fallback. Ollama is not required.

## Fresh local data

For a clean development database after upgrading from an older build:

```powershell
docker compose down -v
docker compose up --build -d
docker compose exec backend python scripts/migrate.py
docker compose exec backend python scripts/seed.py
```

The seed creates only optional demo identities; it does not create fabricated debates, scores, classes or activity.
