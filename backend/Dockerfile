# syntax=docker/dockerfile:1
# ─── Hotel Backend (Express + Sequelize) — Production Image ───────────────────

FROM node:24-alpine AS base
WORKDIR /app

# ── Dependencies (production only — no sqlite3/pg-mem/nodemon dev deps) ──────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Runtime ────────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

# tini handles SIGTERM/SIGINT correctly as PID 1 for graceful shutdown
RUN apk add --no-cache tini \
  && addgroup -S nodejs \
  && adduser -S nodejs -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p uploads data \
  && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
