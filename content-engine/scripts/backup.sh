#!/usr/bin/env bash
# Nightly backup of everything that can't be rebuilt from git:
#   - both Postgres databases (content + n8n), as pg_dump custom-format files
#   - storage/ (original CVs, generated resumes)
#   - n8n workflows and credentials (credentials stay encrypted with N8N_ENCRYPTION_KEY)
# Keeps KEEP_DAYS days of backups. Run from cron, e.g.:
#   15 3 * * * cd /srv/portfolio/content-engine && ./scripts/backup.sh >> backups/backup.log 2>&1
#
# N8N_ENCRYPTION_KEY and .env are NOT in the backup on purpose: store them separately
# (password manager). Without that key the n8n credentials in a backup are unreadable.
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
read -r -a COMPOSE <<< "${COMPOSE:-docker compose}"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/$stamp"
mkdir -p "$out"
log() { echo "[$(date -u +%FT%TZ)] $*"; }
# A failed run is renamed, not deleted, so it never counts as a good backup but can be inspected.
fail() { log "FAILED: $*"; mv "$out" "$out.failed"; exit 1; }

for db in content n8n; do
  log "dumping database $db"
  "${COMPOSE[@]}" exec -T postgres pg_dump -U postgres -d "$db" --format=custom > "$out/$db.dump" || fail "pg_dump $db"
  # A dump pg_restore can't list is not a backup.
  "${COMPOSE[@]}" exec -T postgres pg_restore --list < "$out/$db.dump" > /dev/null || fail "dump of $db is unreadable"
done

log "archiving storage"
"${COMPOSE[@]}" exec -T backend tar -C /data -czf - storage > "$out/storage.tar.gz" || fail "storage archive"

log "exporting n8n workflows and credentials"
# shellcheck disable=SC2016  # $d is meant to expand inside the n8n container, not here.
if "${COMPOSE[@]}" exec -T n8n sh -c 'd=$(mktemp -d) && mkdir -p "$d/n8n-export/workflows" "$d/n8n-export/credentials" \
    && (n8n export:workflow --all --separate --output="$d/n8n-export/workflows/" >/dev/null 2>&1 || true) \
    && (n8n export:credentials --all --separate --output="$d/n8n-export/credentials/" >/dev/null 2>&1 || true) \
    && tar -C "$d" -czf - n8n-export && find "$d" -delete' > "$out/n8n-export.tar.gz"; then
  :
else
  log "warning: n8n export failed (is n8n running?); the n8n database dump still has everything"
  mv "$out/n8n-export.tar.gz" "$out/n8n-export.tar.gz.skipped"
fi

(cd "$out" && sha256sum ./*.dump ./*.tar.gz > SHA256SUMS)
log "backup written to $out ($(du -sh "$out" | cut -f1))"

# Prune: only files directly inside backup folders older than KEEP_DAYS, then those emptied folders.
find "$BACKUP_DIR" -mindepth 2 -maxdepth 2 -type f -path '*/20*T*Z/*' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*T*Z' -empty -print -delete | sed 's/^/pruned /' || true
