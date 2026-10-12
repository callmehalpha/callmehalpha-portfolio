#!/bin/sh
# Creates the two databases and their owners on first start of the Postgres volume.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
CREATE USER content WITH PASSWORD '${CONTENT_DB_PASSWORD}';
CREATE DATABASE content OWNER content;
CREATE USER n8n WITH PASSWORD '${N8N_DB_PASSWORD}';
CREATE DATABASE n8n OWNER n8n;
SQL
