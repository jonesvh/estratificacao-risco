#!/bin/sh
set -e

DB_PATH="${JSON_DB_PATH:-/app/MEDPREV/db.json}"
DB_DIR="$(dirname "$DB_PATH")"

# ── 1. Ensure MEDPREV directory exists ────────────────────────────────────────
mkdir -p "$DB_DIR"

# ── 2. Initialize db.json if it doesn't exist ─────────────────────────────────
if [ ! -f "$DB_PATH" ]; then
  echo "[entrypoint] Initializing database at $DB_PATH..."
  node scripts/seed-json.js
  echo "[entrypoint] Database initialized."
else
  echo "[entrypoint] Database already exists at $DB_PATH — skipping seed."
fi

# ── 3. Start server ───────────────────────────────────────────────────────────
echo "[entrypoint] Starting server..."
exec node dist/main.js
