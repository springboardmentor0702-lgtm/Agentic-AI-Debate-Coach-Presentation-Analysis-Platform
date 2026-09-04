Copy-Item .env.example .env -ErrorAction SilentlyContinue
(Get-Content .env) -replace '^AI_PROVIDER=.*','AI_PROVIDER=demo' | Set-Content .env
docker compose up --build
