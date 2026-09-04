#!/usr/bin/env bash
set -e
cp -n .env.example .env || true
sed -i 's/^AI_PROVIDER=.*/AI_PROVIDER=demo/' .env 2>/dev/null || true
docker compose up --build
