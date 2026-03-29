# TradeClaw — Multi-stage Production Dockerfile

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/

RUN npm ci

# Copy source
COPY . .

# Build (standalone output enabled in next.config.ts)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Verify standalone was generated
RUN ls /app/apps/web/.next/standalone/apps/web/server.js

# Copy static assets into standalone
RUN cp -r /app/apps/web/public /app/apps/web/.next/standalone/apps/web/public && \
    cp -r /app/apps/web/.next/static /app/apps/web/.next/standalone/apps/web/.next/static

# ── Stage 2: production ───────────────────────────────────────────────────────
FROM node:22-alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

<<<<<<< HEAD
# Copy standalone output from builder
COPY --from=builder /app/apps/web/.next/standalone/apps/web ./
=======
# Copy standalone output from builder (includes node_modules at root)
COPY --from=builder /app/apps/web/.next/standalone ./
>>>>>>> origin/main

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

<<<<<<< HEAD
CMD ["sh", "-c", "PORT=${PORT:-3000} node server.js"]
=======
CMD ["sh", "-c", "PORT=${PORT:-3000} node apps/web/server.js"]
>>>>>>> origin/main
