# Build context: content-engine/ (so seed/data is available to the image).
FROM node:22-alpine AS build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev && npx prisma generate

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/backend
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY backend/prisma ./prisma
COPY backend/package.json ./
COPY backend/docker-entrypoint.sh ./
COPY seed/data /app/seed/data
RUN mkdir -p /data/inbox /data/persona /data/storage && chown -R node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
# Run with an init process (compose: `init: true`) so signals reach node.
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
