# LOGOS.AI Deployment & Operations

## Local production-like stack

```bash
docker compose up --build
```

Services:
- Frontend: http://localhost:3000
- FastAPI: http://localhost:8000
- Swagger: http://localhost:8000/docs
- PostgreSQL: localhost:5432
- MongoDB: localhost:27017

## Cloud readiness

The containers are stateless at application level and use environment variables for database, secret and CORS configuration. They can be deployed as container services on AWS ECS/App Runner or Azure Container Apps, with managed PostgreSQL and MongoDB-compatible storage. Set a strong `SECRET_KEY`, production `CORS_ORIGINS`, and managed database URLs before public exposure.

## Monitoring

- `/health` basic service health
- `/api/v1/operations/health` database-aware health
- `/api/v1/operations/metrics` operational component status
- Docker healthchecks for database/backend/frontend dependencies
- GitHub Actions CI validates Python compilation, AI tests and Next.js build

## Security checklist

- JWT authentication required for protected APIs.
- Role guards protect coach, educator and administrator dashboards.
- Users can only access their own debate sessions and reports.
- Audio uploads are size/type limited and temporary files are removed.
- Replace development secret and OAuth handoff with provider-token verification before production.
