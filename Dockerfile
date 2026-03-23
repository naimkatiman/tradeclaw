# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
RUN npm ci --production=false

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production
FROM node:22-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S tradeclaw && \
    adduser -S tradeclaw -u 1001

# Copy standalone output
COPY --from=builder --chown=tradeclaw:tradeclaw /app/apps/web/.next/standalone ./
COPY --from=builder --chown=tradeclaw:tradeclaw /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=tradeclaw:tradeclaw /app/apps/web/public ./apps/web/public

USER tradeclaw
EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["node", "apps/web/server.js"]
