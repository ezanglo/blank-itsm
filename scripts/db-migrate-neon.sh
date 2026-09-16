#!/usr/bin/env bash
# Run Drizzle migrations against Neon using direct (non-pooled) URL when available.
# Usage: export DATABASE_URL_DIRECT='...'  # optional but preferred
#        export DATABASE_URL='...'        # fallback
#        ./scripts/db-migrate-neon.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -n "${DATABASE_URL_DIRECT:-}" ]]; then
  export DATABASE_URL="$DATABASE_URL_DIRECT"
  echo "db-migrate-neon: using DATABASE_URL_DIRECT (non-pooled) for migrate."
elif [[ -n "${DATABASE_URL:-}" ]]; then
  echo "db-migrate-neon: DATABASE_URL_DIRECT unset; using DATABASE_URL for migrate."
else
  echo "db-migrate-neon: set DATABASE_URL_DIRECT or DATABASE_URL." >&2
  exit 1
fi

exec npm run db:migrate
