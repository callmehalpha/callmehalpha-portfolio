# Go-live runbook

Everything you run on the VPS to put the content engine and the updated portfolio live.
Commands assume Ubuntu 22.04/24.04 and a user with `sudo`. Replace `usaiy.xyz` names if yours differ.

**After this you'll have:** `https://api.usaiy.xyz` (content API + approval links), `https://n8n.usaiy.xyz`
(n8n editor behind a password), the portfolio reading live content, nightly backups, and email alerts.

**Not live yet (later PRs):** the n8n workflows that write drafts and post to LinkedIn/X. Files dropped in the
inbox are stored and wait; nothing is lost.

---

## 1. Before you start

- [ ] **Server:** 2 vCPU / 4 GB RAM or more, ~20 GB free disk.
- [ ] **DNS:** `A` records for `api.usaiy.xyz` and `n8n.usaiy.xyz` pointing at the server's IP. Check with
      `dig +short api.usaiy.xyz`. Caddy can't get certificates until these resolve.
- [ ] **Ports:** 22, 80 and 443 open, everything else closed:
      ```bash
      sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
      ```
- [ ] **SMTP credentials** for approval and alert emails (host, port, user, password, from-address).
- [ ] **Decide who owns ports 80/443** (see step 4): if nginx already serves the portfolio, keep it and
      use option B; otherwise let Caddy serve everything (option A).

Install Docker and Node (skip what's already there):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER" && newgrp docker
docker compose version            # needs v2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs git
```

## 2. Get the code

```bash
sudo mkdir -p /srv && sudo chown "$USER" /srv
git clone https://github.com/callmehalpha/callmehalpha-portfolio.git /srv/portfolio
cd /srv/portfolio/content-engine
```

When you make the repo private again, add a read-only **deploy key** (`ssh-keygen -t ed25519`, paste the
public key in GitHub → Settings → Deploy keys) and switch the remote:
`git remote set-url origin git@github.com:callmehalpha/callmehalpha-portfolio.git`.

## 3. Configure `.env`

```bash
cp .env.example .env
chmod 600 .env
```

Fill in every blank. Generate each secret separately:

```bash
for k in POSTGRES_PASSWORD CONTENT_DB_PASSWORD N8N_DB_PASSWORD INTERNAL_SERVICE_TOKEN ADMIN_TOKEN \
         APPROVAL_LINK_SECRET N8N_WEBHOOK_SECRET N8N_ENCRYPTION_KEY; do
  echo "$k=$(openssl rand -hex 32)"
done
```

Then set:

| Variable | Value |
|---|---|
| `CONTENT_UID` / `CONTENT_GID` | output of `id -u` / `id -g` (the backend must own `inbox/`) |
| `PUBLIC_SITE_URL` | `https://abdulazeez.usaiy.xyz` (exact origin, no trailing slash: CORS checks it) |
| `PUBLIC_API_URL` | `https://api.usaiy.xyz` (approval links point here) |
| `NOTIFY_EMAIL_TO` | `abdulazeezyisau@gmail.com` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | your SMTP provider (`SMTP_SECURE=true` for port 465, `false` for 587) |
| `N8N_HOST`, `N8N_EDITOR_BASE_URL`, `N8N_WEBHOOK_URL` | `n8n.usaiy.xyz`, `https://n8n.usaiy.xyz`, `https://n8n.usaiy.xyz` |
| `API_DOMAIN`, `N8N_DOMAIN` | `api.usaiy.xyz`, `n8n.usaiy.xyz` |
| `N8N_EDITOR_PASSWORD_HASH` | `docker run --rm caddy:2-alpine caddy hash-password --plaintext 'your-password'`, pasted **in single quotes**: `N8N_EDITOR_PASSWORD_HASH='$2a$14$…'`. Unquoted, compose reads each `$…` as a variable and the hash breaks |

> **Save `.env` in your password manager now**, especially `N8N_ENCRYPTION_KEY`. Backups don't include it on
> purpose, and without it n8n can't decrypt any saved credential.

A blank required value stops `docker compose` with "required variable … is missing": that's deliberate.

## 4. Choose the proxy

**Option A: Caddy serves everything (simplest).** Also set in `.env`:

```
PORTFOLIO_DOMAIN=abdulazeez.usaiy.xyz
PORTFOLIO_UPSTREAM=host.docker.internal:3003
```

Stop whatever currently listens on 80/443 for the portfolio (e.g. `sudo systemctl disable --now nginx`).
Caddy runs inside Docker and reaches the portfolio on the host's port 3003, which ufw blocks by default.
Allow it from Docker networks only (the port stays closed to the internet):

```bash
sudo ufw allow from 172.16.0.0/12 to any port 3003 proto tcp
```

**Option B: keep your existing nginx.** Leave `PORTFOLIO_DOMAIN` empty, and *don't* use the
`production` profile (Caddy would fight nginx for port 443). Add two nginx sites with certificates
(certbot), proxying to the ports compose binds on localhost:

```nginx
server { server_name api.usaiy.xyz;  location / { proxy_pass http://127.0.0.1:3000; include proxy_params; } }
server { server_name n8n.usaiy.xyz;  location / { proxy_pass http://127.0.0.1:5678; include proxy_params;
         proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; } }
```

With option B, put basic auth on the n8n editor in nginx, except `/webhook/`, `/webhook-waiting/` and
`/rest/oauth2-credential/callback`, which must stay open.

## 5. Start the stack

```bash
cd /srv/portfolio/content-engine
docker compose --profile production up -d --build      # option B: drop --profile production
docker compose ps                                        # wait until backend and n8n are "healthy"
docker compose logs backend | tail -20                   # "Seed complete", "Watching /data/inbox …"
```

On first start the backend runs its migrations and seeds the 5 case studies, the "Modular Monoliths" note,
today's homepage copy, the channels (disabled) and the email notifier. The seed only fills what's missing,
so it's safe on every restart.

## 6. Point the portfolio at the API

```bash
cd /srv/portfolio
npm ci
VITE_CONTENT_API_URL=https://api.usaiy.xyz npm run build
```

Run `server.mjs` as a service (replace `youruser`):

```ini
# /etc/systemd/system/portfolio.service
[Unit]
Description=Portfolio (server.mjs)
After=network-online.target docker.service

[Service]
User=youruser
WorkingDirectory=/srv/portfolio
Environment=PORT=3003
Environment=CONTENT_API_URL=http://127.0.0.1:3000
ExecStart=/usr/bin/node server.mjs
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now portfolio
```

`CONTENT_API_URL` is what `server.mjs` uses for link previews; it talks to the backend over localhost.
`VITE_CONTENT_API_URL` is baked into the build for visitors' browsers.

## 7. Check it works

Load the two tokens into your shell. Don't `source .env`: the password hash's `$` signs would be expanded.

```bash
cd /srv/portfolio/content-engine
export ADMIN_TOKEN=$(grep '^ADMIN_TOKEN=' .env | cut -d= -f2-)
export INTERNAL_SERVICE_TOKEN=$(grep '^INTERNAL_SERVICE_TOKEN=' .env | cut -d= -f2-)
```

```bash
curl -s https://api.usaiy.xyz/health                       # {"status":"ok"}
curl -s https://api.usaiy.xyz/api/case-studies | head -c 200
curl -sI https://api.usaiy.xyz/health | grep -i x-content-type-options
curl -s -o /dev/null -w '%{http_code}\n' https://n8n.usaiy.xyz/      # 401 until you log in
curl -s https://abdulazeez.usaiy.xyz/notes/the-case-for-modular-monoliths | grep -o '<title>[^<]*'
```

Then in a browser:
- [ ] The homepage shows the case studies, the Technical Notes card opens `/notes/the-case-for-modular-monoliths`,
      and Open Source shows "The first projects are on their way".
- [ ] Share a note link in a LinkedIn post draft: the preview shows the note's title.
- [ ] Email works: `curl -s -X POST https://api.usaiy.xyz/internal/notify/email -H "authorization: Bearer $INTERNAL_SERVICE_TOKEN" -H 'content-type: application/json' -d '{"subject":"Go-live test","markdown":"It works."}'` arrives in your inbox.

## 8. First-time setup

**n8n owner account.** Open `https://n8n.usaiy.xyz`, pass the basic-auth prompt, create the owner account.
(The workflows come in a later PR.)

**Approve the CV-based profile** when you're happy with it. It switches the site to "Technical Product Builder":

```bash
curl -s https://api.usaiy.xyz/admin/profile/revisions -H "authorization: Bearer $ADMIN_TOKEN"
# read it in full first:
curl -s https://api.usaiy.xyz/admin/profile/revisions/<draft-id> -H "authorization: Bearer $ADMIN_TOKEN"
curl -s -X POST https://api.usaiy.xyz/admin/content/profile_revision/<draft-id> \
  -H "authorization: Bearer $ADMIN_TOKEN" -H 'content-type: application/json' -d '{"action":"approve"}'
```

Roll back the same way by publishing version 1 again (`{"action":"publish"}` on its id).

**First resume.** Builds run every 10 minutes when approved content has changed; trigger the first one now:

```bash
curl -s -X POST https://api.usaiy.xyz/admin/resume/build -H "authorization: Bearer $ADMIN_TOKEN" \
  -H 'content-type: application/json' -d '{}'
```

That builds the `default`, `backend` and `fullstack` versions. Each arrives by email with the PDF attached and
Approve/Reject buttons. Once `default` is approved, a **Download Resume** button appears on the homepage
(`/api/resume.pdf`, plus `?variant=backend` and `?variant=fullstack`). Turn the approval step off with
`approval.required.resume` if you'd rather have new builds go live directly.

**Approval toggles** (all on by default):
`curl -X PATCH https://api.usaiy.xyz/admin/settings/approval.required.note -H "authorization: Bearer $ADMIN_TOKEN" -H 'content-type: application/json' -d '{"value":false}'`

## 9. Backups

```bash
cd /srv/portfolio/content-engine
./scripts/backup.sh                       # try it once by hand
ls backups/                               # 20261012T031500Z/{content.dump,n8n.dump,storage.tar.gz,n8n-export.tar.gz,SHA256SUMS}
crontab -e
```

```cron
15 3 * * * cd /srv/portfolio/content-engine && ./scripts/backup.sh >> backups/backup.log 2>&1
```

- Keeps 14 days (`KEEP_DAYS=30 ./scripts/backup.sh` for longer).
- **Copy backups off the server.** A dead disk takes the backups with it. For example, `rclone sync backups remote:portfolio-backups` after the backup in the same cron line.
- **Test a restore once** so you know it works: `./scripts/restore.sh backups/<folder>` (asks you to type `restore`; it replaces the current data).

## 10. Token-expiry reminders

When you connect LinkedIn or X in n8n (later PR), record when the token expires. You'll get emails 7 days and
1 day before, and on expiry:

```bash
curl -X PATCH https://api.usaiy.xyz/admin/channels/linkedin -H "authorization: Bearer $ADMIN_TOKEN" \
  -H 'content-type: application/json' -d '{"enabled":true,"config":{"tokenExpiresAt":"2026-12-11T00:00:00Z"}}'
```

The channel's other settings are kept (config updates merge; `null` removes a key). The check runs hourly;
`POST /admin/ops/token-expiry/check` runs it now.

## 11. Day-2 operations

| Task | Command |
|---|---|
| Deploy an update | `cd /srv/portfolio && git pull && cd content-engine && docker compose --profile production up -d --build` (migrations run on start), then rebuild the portfolio (`npm ci && VITE_CONTENT_API_URL=… npm run build && sudo systemctl restart portfolio`) |
| Feed it a project's history | `node content-engine/scripts/export-commits.mjs ~/code/atlax --project atlax-exchange --since "2 weeks ago"`, add your notes under `## Notes`, and it lands in `inbox/` |
| Drop a CV | copy the PDF/DOCX into `content-engine/inbox/cv/` |
| Logs | `docker compose logs -f backend` (rotated: 5 × 10 MB per container) |
| Retry a failed source | `curl -X POST https://api.usaiy.xyz/admin/sources/<id>/retry -H "authorization: Bearer $ADMIN_TOKEN"` |
| Roll back a bad deploy | `git checkout <previous-sha> && docker compose --profile production up -d --build`; if a migration ran, restore the backup from before it |

## 12. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `required variable … is missing` | a blank value in `.env` (step 3) |
| Caddy logs `obtaining certificate … failed` | DNS doesn't point at the server yet, or port 80 is blocked |
| Backend restarts with `EACCES … /data/inbox` | `CONTENT_UID`/`CONTENT_GID` don't own `content-engine/inbox` (`sudo chown -R $(id -u):$(id -g) content-engine/inbox`) |
| Homepage shows the old copy | API unreachable from the browser: check `VITE_CONTENT_API_URL` at build time and `PUBLIC_SITE_URL` (CORS) in `.env` |
| Note previews show the default title | `CONTENT_API_URL` not set for `portfolio.service` |
| No approval/alert emails | SMTP values; send the test email from step 7 and check `docker compose logs backend` |
| Sources stay `RECEIVED` | expected until the n8n workflows exist; they're retried automatically |
| n8n "address '::' not available" | IPv6 disabled on the host; `N8N_LISTEN_ADDRESS=0.0.0.0` is already set in compose |
