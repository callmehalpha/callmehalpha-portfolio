# Content Engine

The self-hosted system behind the portfolio's Technical Notes, Case Studies, Open Source
Projects and profile. The full design is in [`docs/content-automation-plan.md`](../docs/content-automation-plan.md).

```
inbox/*.md ──► backend (NestJS) ──► n8n (LLM + social) ──► backend ──► portfolio /api/*
inbox/cv/*      Postgres = system of record          approvals by email
persona/*.md
```

## What's built

| Area | Status |
|---|---|
| Docker stack: Postgres 17 (two databases), backend, n8n 2.42, Caddy (production profile), Mailpit (dev) | ✅ |
| Folder watcher for `inbox/`, `inbox/cv/` and `persona/` (polling, dedupe by content hash, moves to `processed/` / `failed/`) | ✅ |
| CV text extraction (PDF, DOCX, Markdown), originals kept privately in `storage/cv/` | ✅ |
| n8n webhook client with retries, plus a sweeper that re-delivers stuck documents | ✅ |
| Notes, living case studies (versioned, rollback), open-source entries, profile (privacy-filtered) | ✅ |
| Approvals: signed single-use links, confirm page (safe against email link scanners), expiry, n8n resume | ✅ |
| Runtime approval toggles, channel and notifier registries, idempotent per-channel publications | ✅ |
| Email via SMTP from `.env`, HTML template with action buttons and attachments | ✅ |
| Seed of today's 5 case studies, the existing note (with its LinkedIn post) and the current hero copy | ✅ |
| Portfolio reads notes, case studies, open source and profile from the API (phase 3) | ✅ |
| Hardening: nightly backups + restore, token-expiry emails, security headers, per-client rate limits behind Caddy, log rotation, `export-commits` | ✅ |
| n8n workflows (router, generators, LinkedIn/X publishers) | ⏳ next |
| Resume PDF builds (Gotenberg) | ⏳ |

## Run it locally

```bash
cd content-engine
cp .env.example .env                     # fill in the blanks: openssl rand -hex 32
cp docker-compose.override.example.yml docker-compose.override.yml
# in .env for local use: SMTP_HOST=mailpit, CONTENT_UID=$(id -u), CONTENT_GID=$(id -g)
docker compose up -d --build
```

| URL | What |
|---|---|
| http://localhost:3000/health | Backend health |
| http://localhost:3000/api/case-studies | Public API (also `/api/notes`, `/api/oss`, `/api/profile`) |
| http://localhost:5678 | n8n editor |
| http://localhost:8025 | Mailpit: every email the backend sends |

Drop a file into `inbox/` and it shows up as a source within one poll interval:

```bash
printf -- '---\nproject: atlax-exchange\n---\n- feat: provider failover\n' > inbox/atlax-week-41.md
curl -s -H "authorization: Bearer $ADMIN_TOKEN" localhost:3000/admin/notes
```

Until the n8n workflows are imported, sources stay `RECEIVED` (the webhook returns 404) and the
sweeper retries them; nothing is lost.

## Production

Step-by-step deploy: **[docs/GO-LIVE.md](../docs/GO-LIVE.md)**.

```bash
docker compose --profile production up -d --build
```

Caddy terminates TLS for `API_DOMAIN` and `N8N_DOMAIN`. The n8n editor sits behind basic auth;
its webhooks and the OAuth callback stay public so LinkedIn and X can reach them. The backend
container runs as `CONTENT_UID:CONTENT_GID`, which must own `./inbox` on the host.

Back up `N8N_ENCRYPTION_KEY` separately from the database: without it n8n can't decrypt any saved credential.

## Operations

| Script | What it does |
|---|---|
| `scripts/backup.sh` | Dumps both databases, archives `storage/`, exports n8n workflows and (still encrypted) credentials into `backups/<UTC timestamp>/` with checksums; keeps `KEEP_DAYS` (14). Run nightly from cron. |
| `scripts/restore.sh <dir>` | Verifies checksums, stops backend and n8n, restores both databases and `storage/`, starts them again. Asks for confirmation (`--yes` to skip). |
| `scripts/export-commits.mjs <repo> --project <slug>` | Turns a repo's recent git history into an inbox file (frontmatter, commits, files touched, a Notes section for you to fill in). |

Also built in:
- **Token-expiry emails:** record `config.tokenExpiresAt` on a channel; you're emailed 7 days and 1 day before, and on expiry.
- **Behind Caddy:** `TRUST_PROXY=1` so rate limits apply per visitor, not to Caddy's single IP.
- **Every response** carries `nosniff`, `DENY` framing, `no-referrer` and a strict CSP.
- **Container logs** rotate at 5 × 10 MB.

## Tests

```bash
cd backend
npm ci && npx prisma generate
npm run typecheck
npm run test:unit      # pure logic: tokens, privacy, frontmatter, status machine, settings, templates…
npm run test:e2e       # full app against a real Postgres (Docker, or TEST_DATABASE_URL), fake n8n + SMTP
```

The e2e suite starts a throwaway `postgres:17-alpine` container unless `TEST_DATABASE_URL` is set
(CI uses a service container). CI runs both suites, builds the image and validates the compose
file on every PR that touches `content-engine/`.

## API map

| Prefix | Auth | Used by |
|---|---|---|
| `/api/*` (GET) | none, rate limited | the portfolio |
| `/approvals/confirm`, `/approvals/decide` | signed token | links in approval emails |
| `/api/ingest`, `/internal/*` | `Bearer INTERNAL_SERVICE_TOKEN` | n8n |
| `/admin/*` | `Bearer ADMIN_TOKEN` | me |
