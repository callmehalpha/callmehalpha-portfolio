#!/bin/sh
set -e
npx prisma migrate deploy
node dist/seed/run.js
exec node dist/main.js
