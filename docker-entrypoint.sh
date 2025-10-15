#!/bin/sh
set -e

# Small startup banner for easier debugging
echo "[entrypoint] running /app/docker-entrypoint.sh (pid $$)"

# Ensure we have a DATABASE_URL at runtime
if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint][error] DATABASE_URL is not set. Set DATABASE_URL in your environment (Railway -> Variables)."
  echo "Example: DATABASE_URL=postgresql://user:pass@host:5432/dbname?schema=public"
  exit 1
fi

# Generate Prisma client (required for runtime)
if [ -f ./prisma/schema.prisma ]; then
  echo "[entrypoint] Generating Prisma client..."
  if ! npx prisma generate --schema=./prisma/schema.prisma; then
    echo "[entrypoint][error] prisma generate failed"
    exit 1
  fi

  echo "[entrypoint] Running Prisma migrations (deploy)..."
  if ! npx prisma migrate deploy --schema=./prisma/schema.prisma; then
    echo "[entrypoint][error] prisma migrate deploy failed"
    exit 1
  fi
else
  echo "[entrypoint] No prisma/schema.prisma found, skipping generate/migrate"
fi

# Start the app
echo "[entrypoint] Starting application..."
exec node dist/main.js
