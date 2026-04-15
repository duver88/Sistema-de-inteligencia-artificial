# SocialPulse — VPS Deployment Guide

## Prerequisites on the server

| Requirement | Minimum version | Install command |
|---|---|---|
| Node.js | 20 LTS | `nvm install 20` |
| npm | 10+ | bundled with Node |
| PostgreSQL | 15+ | `apt install postgresql` |
| Redis | 7+ | `apt install redis-server` |
| PM2 | latest | `npm install -g pm2` |
| Nginx | 1.18+ | `apt install nginx` |
| Certbot | latest | `apt install certbot python3-certbot-nginx` |

---

## 1 — Clone the repository

```bash
# On the server, as the deploy user
cd /var/www
git clone https://github.com/TU_USUARIO/TU_REPO.git socialpulse
cd socialpulse
```

---

## 2 — Configure environment variables

```bash
cp .env.example .env.local
nano .env.local
```

Fill in every value. Key notes:

- **DATABASE_URL** — PostgreSQL connection string:
  ```
  postgresql://socialpulse:PASSWORD@localhost:5432/socialpulse
  ```
- **NEXTAUTH_SECRET** — generate with:
  ```bash
  openssl rand -base64 32
  ```
- **ENCRYPTION_KEY** — 64-char hex, generate with:
  ```bash
  openssl rand -hex 32
  ```
- **META_WEBHOOK_VERIFY_TOKEN** — any random string you choose; must match what you set in the Meta Developer portal.
- **REDIS_URL** — `redis://localhost:6379` (or with password: `redis://:PASSWORD@localhost:6379`)
- **NEXTAUTH_URL** — full HTTPS URL of the app, e.g. `https://comments.tudominio.com`
- **NEXT_PUBLIC_APP_URL** — same value as `NEXTAUTH_URL`

---

## 3 — Create the PostgreSQL database

```bash
sudo -u postgres psql <<'SQL'
CREATE USER socialpulse WITH PASSWORD 'YOUR_STRONG_PASSWORD';
CREATE DATABASE socialpulse OWNER socialpulse;
GRANT ALL PRIVILEGES ON DATABASE socialpulse TO socialpulse;
SQL
```

---

## 4 — Install dependencies and run migrations

```bash
# Install all deps (including devDeps needed for build)
npm install

# Generate Prisma client
npx prisma generate

# Apply all migrations to the live database
npx prisma migrate deploy
```

---

## 5 — Build the application

```bash
npm run build
```

This produces an optimised `.next/` bundle.

---

## 6 — Create the PM2 log directory

```bash
mkdir -p logs
```

---

## 7 — Start with PM2

```bash
# Start both the web app (port 3002) and the BullMQ worker
pm2 start ecosystem.config.js

# Persist PM2 processes across reboots
pm2 save
pm2 startup   # follow the printed command, e.g.: sudo env PATH=... pm2 startup systemd
```

Verify the processes are running:

```bash
pm2 status
pm2 logs lionscore-comments --lines 30
```

---

## 8 — Configure Nginx

```bash
# Copy the example config
sudo cp nginx.conf.example /etc/nginx/sites-available/socialpulse

# Replace TU_DOMINIO with your actual domain (run twice — HTTP and HTTPS blocks)
sudo sed -i 's/TU_DOMINIO/comments.tudominio.com/g' /etc/nginx/sites-available/socialpulse

# Enable the site
sudo ln -sf /etc/nginx/sites-available/socialpulse /etc/nginx/sites-enabled/socialpulse

# Test config
sudo nginx -t

# Reload Nginx (HTTP only at this point)
sudo systemctl reload nginx
```

---

## 9 — Provision SSL with Certbot

```bash
sudo certbot --nginx -d comments.tudominio.com
```

Certbot will modify the Nginx config to add the SSL certificate paths automatically. After it completes:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 10 — Configure the Meta Webhook

In the [Meta Developer Portal](https://developers.facebook.com):

1. Go to your app → **Webhooks**
2. Subscribe to `feed` (Facebook) and `comments` (Instagram)
3. Callback URL: `https://comments.tudominio.com/api/webhooks/meta`
4. Verify token: the value you set in `META_WEBHOOK_VERIFY_TOKEN`

---

## Routine deployments (after the first)

SSH into the server and run:

```bash
cd /var/www/socialpulse
bash deploy.sh
```

This will: pull → install → generate → migrate → build → reload PM2.

---

## Useful PM2 commands

```bash
pm2 status                          # Show all processes
pm2 logs lionscore-comments         # Tail Next.js app logs
pm2 logs lionscore-worker           # Tail BullMQ worker logs
pm2 restart lionscore-comments      # Restart web process
pm2 restart lionscore-worker        # Restart worker process
pm2 reload ecosystem.config.js      # Zero-downtime reload
pm2 monit                           # Real-time dashboard
```

---

## Useful diagnostic commands

```bash
# Check Nginx errors
sudo tail -f /var/log/nginx/socialpulse-error.log

# Check PostgreSQL connectivity
psql "$DATABASE_URL" -c "SELECT version();"

# Check Redis
redis-cli ping

# Check the app is listening on port 3002
ss -tlnp | grep 3002
```
