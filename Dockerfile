# TradeClaw — Production Dockerfile
FROM node:22-alpine
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/

RUN npm ci

# Copy source code
COPY . .

# Build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

CMD ["sh", "-c", "cd /app/apps/web && PORT=${PORT:-3000} HOSTNAME=0.0.0.0 /app/node_modules/.bin/next start -p ${PORT:-3000}"]
