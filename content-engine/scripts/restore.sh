#!/usr/bin/env bash
# Restores a backup made by backup.sh:  ./scripts/restore.sh backups/20261012T031500Z
# Stops the backend and n8n, replaces both databases and storage/, then starts them again.
# This overwrites current data. Pass --yes to skip the confirmation prompt.
set -euo pipefail

cd "$(dirname "$0")/.."
dir="${1:?usage: restore.sh <backup-dir> [--yes]}"
read -r -a COMPOSE <<< "${COMPOSE:-docker compose}"
log() { echo "[$(date -u +%FT%TZ)] $*"; }

if [ ! -f "$dir/content.dump" ] || [ ! -f "$dir/n8n.dump" ]; then
  echo "Not a backup directory: $dir" >&2
  exit 1
fi
(cd "$dir" && sha256sum --check --quiet SHA256SUMS) || { echo "Checksums don't match: refusing to restore" >&2; exit 1; }

if [ "${2:-}" != "--yes" ]; then
  read -r -p "This replaces ALL current content and n8n data with $dir. Type 'restore' to continue: " answer
  [ "$answer" = "restore" ] || { echo "Aborted."; exit 1; }
fi

log "stopping backend and n8n"
"${COMPOSE[@]}" stop backend n8n

for db in content n8n; do
  log "restoring database $db"
  "${COMPOSE[@]}" exec -T postgres pg_restore -U postgres -d "$db" --clean --if-exists --no-owner --role="$db" < "$dir/$db.dump"
done

log "starting backend and n8n"
"${COMPOSE[@]}" start backend n8n

log "restoring storage"
for _ in $(seq 1 30); do "${COMPOSE[@]}" exec -T backend true 2>/dev/null && break; sleep 2; done
"${COMPOSE[@]}" exec -T backend sh -c 'find /data/storage -mindepth 1 -delete && tar -C /data -xzf -' < "$dir/storage.tar.gz"

log "restore complete"
