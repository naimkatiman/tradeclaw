# TradeClaw — Production Dockerfile
FROM node:22-alpine
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/

RUN npm ci

# Copy source
COPY . .

# Build (with standalone output enabled in next.config.ts)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Verify standalone was generated
RUN ls /app/apps/web/.next/standalone/apps/web/server.js

# Copy static assets into standalone
RUN cp -r /app/apps/web/public /app/apps/web/.next/standalone/apps/web/public && \
    cp -r /app/apps/web/.next/static /app/apps/web/.next/standalone/apps/web/.next/static

# Create symlinks for both possible Railway start paths
RUN mkdir -p /app/.next/standalone && \
    ln -sf /app/apps/web/.next/standalone/apps/web/server.js /app/.next/standalone/server.js

# Runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# Railway startCommand override uses node /app/.next/standalone/server.js
# Our symlink handles this path, and our CMD handles clean runs
CMD ["sh", "-c", "PORT=${PORT:-3000} node /app/apps/web/.next/standalone/apps/web/server.js"]
