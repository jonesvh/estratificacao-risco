#!/bin/sh
set -e

PRISMA="./node_modules/.bin/prisma"

# ── 1. Migrate ────────────────────────────────────────────────────────────────
echo "[entrypoint] Running database migrations..."
$PRISMA migrate deploy

# ── 2. Seed admin user ────────────────────────────────────────────────────────
echo "[entrypoint] Running admin seed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping.');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('[seed] Admin already exists:', email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, passwordHash } });
  console.log('[seed] Admin created:', email);
}

seed()
  .catch(e => { console.error('[seed] Error:', e.message); process.exit(1); })
  .finally(() => prisma.\$disconnect());
"

# ── 3. Seed questionnaire ─────────────────────────────────────────────────────
echo "[entrypoint] Running questionnaire seed..."
node prisma/seeds/questionnaire.seed.js

# ── 4. Start server ───────────────────────────────────────────────────────────
echo "[entrypoint] Starting server..."
exec node dist/main.js
