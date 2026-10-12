# Content Engine

The self-hosted system behind the portfolio's Technical Notes, Case Studies, Open Source
Projects and profile. The full design is in [`docs/content-automation-plan.md`](../docs/content-automation-plan.md).

```
inbox/*.md ──► backend (NestJS) ──► n8n (LLM + social) ──► backend ──► portfolio /api/*
inbox/cv/*      Postgres = system of record          approvals by email
persona/*.md
```

## What's built (phases 1–2)

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
| n8n workflows (router, generators, LinkedIn/X publishers) | ⏳ next |
| Portfolio pages reading from the API | ⏳ |
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

```bash
docker compose --profile production up -d --build
```

Caddy terminates TLS for `API_DOMAIN` and `N8N_DOMAIN`. The n8n editor sits behind basic auth;
its webhooks and the OAuth callback stay public so LinkedIn and X can reach them. The backend
container runs as `CONTENT_UID:CONTENT_GID`, which must own `./inbox` on the host.

Back up `N8N_ENCRYPTION_KEY` separately from the database: without it n8n can't decrypt any saved credential.

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
