# TradeClaw — Production Dockerfile
# Single-stage build to avoid layer cache issues

FROM node:22-alpine
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/

RUN npm ci

# Copy source code
COPY . .

# Build the Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runtime settings
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/apps/web
CMD ["node_modules/.bin/next", "start"]
