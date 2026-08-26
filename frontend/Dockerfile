# syntax=docker/dockerfile:1
# ─── Hotel Frontend (Next.js 16) — Production Image ────────────────────────────

FROM node:24-alpine AS base
WORKDIR /app

# ── Dependencies (full install — build needs devDependencies too) ────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── Build ──────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Baked into the client bundle at build time — safe to be a relative path
# since Nginx proxies /api on the same origin as the site in production.
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Runtime — uses the standalone output (minimal node_modules subset) ───────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
