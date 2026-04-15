#!/usr/bin/env bash
# deploy.sh — Pull latest code, migrate, build, and restart PM2 processes.
# Run from the project root on the VPS: bash deploy.sh

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo ""
echo "=========================================="
echo "  SocialPulse — Deploy $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# ── 1. Pull latest code ───────────────────────────────────────────────────────
echo ""
echo "▶  Pulling latest code from origin/main…"
git pull origin main

# ── 2. Install dependencies (production only, skip devDeps) ──────────────────
echo ""
echo "▶  Installing dependencies…"
npm install --omit=dev

# ── 3. Generate Prisma client ─────────────────────────────────────────────────
echo ""
echo "▶  Generating Prisma client…"
npx prisma generate

# ── 4. Run database migrations ────────────────────────────────────────────────
echo ""
echo "▶  Running database migrations…"
npx prisma migrate deploy

# ── 5. Build Next.js app ──────────────────────────────────────────────────────
echo ""
echo "▶  Building Next.js application…"
npm run build

# ── 6. Create logs directory if it doesn't exist ─────────────────────────────
mkdir -p logs

# ── 7. Restart (or start) PM2 processes ──────────────────────────────────────
echo ""
echo "▶  Restarting PM2 processes…"
if pm2 list | grep -q "lionscore-comments"; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
fi

pm2 save

echo ""
echo "✅  Deploy complete!"
echo ""
pm2 status
