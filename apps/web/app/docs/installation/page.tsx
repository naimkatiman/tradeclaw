import type { Metadata } from 'next';
import { CodeBlock } from '../components/code-block';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'Installation',
  description: 'Deploy TradeClaw with Docker Compose, Railway, Vercel, or run locally with npm.',
};

export default function InstallationPage() {
  const { prev, next } = getPrevNext('/docs/installation');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Getting Started</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Installation</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          TradeClaw runs anywhere Node.js 22 and Docker are available. The recommended
          path is Docker Compose — it brings up the app, scanner, database, and cache
          with a single command.
        </p>
      </div>

      {/* Prerequisites */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Prerequisites</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { name: 'Docker ≥ 24', desc: 'For the containerized stack', required: true },
            { name: 'Node.js 22+', desc: 'For local development', required: false },
            { name: 'pnpm 9+', desc: 'Monorepo package manager', required: false },
            { name: 'PostgreSQL 16', desc: 'Provided by Docker Compose', required: false },
          ].map(item => (
            <div key={item.name} className="flex items-start gap-3 p-4 rounded-xl border border-white/6 bg-white/[0.02]">
              <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${item.required ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              <div>
                <p className="text-sm font-medium text-zinc-200">{item.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Option 1: Docker Compose */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-2">Option 1 — Docker Compose</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          Starts four services: the Next.js app, a background signal scanner, TimescaleDB, and Redis.
          This is the production-grade path and the one we recommend for self-hosting.
        </p>

        <h3 className="text-base font-semibold text-zinc-200 mb-2">1. Clone & configure</h3>
        <CodeBlock
          language="bash"
          filename="terminal"
          code={`git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw

# Copy the example env file
cp apps/web/.env.example apps/web/.env.local`}
        />

        <h3 className="text-base font-semibold text-zinc-200 mt-6 mb-2">2. Edit .env.local</h3>
        <p className="text-sm text-zinc-500 mb-3">
          At minimum, set <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_BASE_URL</code> to your domain or <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">http://localhost:3000</code>.
          All other variables are optional for a basic run.
        </p>

        <h3 className="text-base font-semibold text-zinc-200 mt-6 mb-2">3. Start the stack</h3>
        <CodeBlock
          language="bash"
          filename="terminal"
          code={`docker compose up -d

# Tail logs
docker compose logs -f app

# Open the app
open http://localhost:3000`}
        />

        <h3 className="text-base font-semibold text-zinc-200 mt-6 mb-2">docker-compose.yml</h3>
        <CodeBlock
          language="yaml"
          filename="docker-compose.yml"
          code={`services:
  db:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_DB: \${DB_NAME:-tradeclaw}
      POSTGRES_USER: \${DB_USER:-tradeclaw}
      POSTGRES_PASSWORD: \${DB_PASSWORD:-changeme}
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./scripts/init-db.sh:/docker-entrypoint-initdb.d/init.sh
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DB_USER:-tradeclaw}"]
      interval: 5s
      timeout: 3s
      retries: 10
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
    restart: unless-stopped

  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "\${APP_PORT:-3000}:3000"
    environment:
      DATABASE_URL: postgres://\${DB_USER:-tradeclaw}:\${DB_PASSWORD:-changeme}@db:5432/\${DB_NAME:-tradeclaw}
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 10s
    restart: unless-stopped

  scanner:
    build:
      context: .
      dockerfile: Dockerfile.scanner
    environment:
      DATABASE_URL: postgres://\${DB_USER:-tradeclaw}:\${DB_PASSWORD:-changeme}@db:5432/\${DB_NAME:-tradeclaw}
      SCAN_INTERVAL: \${SCAN_INTERVAL:-60}
      SCAN_INSTRUMENTS: \${SCAN_INSTRUMENTS:-all}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

volumes:
  db_data:
  redis_data:`}
        />
      </section>

      {/* Option 2: Railway */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-2">Option 2 — Railway</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          Railway auto-provisions PostgreSQL and Redis. It&apos;s the easiest path if you don&apos;t want
          to manage infrastructure.
        </p>
        <ol className="space-y-3 text-sm text-zinc-400">
          <li className="flex gap-3">
            <span className="text-emerald-400 font-mono font-bold shrink-0">1.</span>
            Fork the <a href="https://github.com/naimkatiman/tradeclaw" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">tradeclaw repo</a> to your GitHub account.
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-400 font-mono font-bold shrink-0">2.</span>
            Create a new Railway project and choose <strong className="text-zinc-200">&quot;Deploy from GitHub repo&quot;</strong>.
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-400 font-mono font-bold shrink-0">3.</span>
            Add a <strong className="text-zinc-200">PostgreSQL</strong> and <strong className="text-zinc-200">Redis</strong> plugin from the Railway dashboard.
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-400 font-mono font-bold shrink-0">4.</span>
            Set environment variables in Railway&apos;s Variables panel (see <a href="/docs/configuration" className="text-emerald-400 hover:underline">Configuration</a>).
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-400 font-mono font-bold shrink-0">5.</span>
            Railway injects <code className="text-emerald-400 bg-white/5 px-1 py-0.5 rounded text-xs">DATABASE_URL</code> and <code className="text-emerald-400 bg-white/5 px-1 py-0.5 rounded text-xs">REDIS_URL</code> automatically from the plugins.
          </li>
        </ol>
      </section>

      {/* Option 3: Vercel */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-2">Option 3 — Vercel</h2>
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 mb-5">
          <p className="text-sm text-amber-300">
            <strong>Note:</strong> Vercel is serverless — the background scanner service won&apos;t run continuously.
            Signals update only on API request. For live scanning, use Docker or Railway.
          </p>
        </div>
        <CodeBlock
          language="bash"
          filename="terminal"
          code={`# Install Vercel CLI
npm i -g vercel

# Deploy from the apps/web directory
cd apps/web
vercel deploy

# Add env variables via Vercel dashboard or CLI
vercel env add NEXT_PUBLIC_BASE_URL
vercel env add DATABASE_URL`}
        />
      </section>

      {/* Option 4: Local dev */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-2">Option 4 — Local Development</h2>
        <CodeBlock
          language="bash"
          filename="terminal"
          code={`# Install dependencies (from monorepo root)
pnpm install

# Start local DB and Redis via Docker (optional)
docker compose up -d db redis

# Copy and edit env
cp apps/web/.env.example apps/web/.env.local

# Start the Next.js dev server
pnpm --filter web dev

# In a second terminal, start the scanner
pnpm --filter scanner dev`}
        />
        <p className="text-sm text-zinc-500 mt-3">
          The dev server runs at <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">http://localhost:3000</code> with
          hot-reload via Turbopack.
        </p>
      </section>

      {/* Health check */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-2">Verify the Installation</h2>
        <CodeBlock
          language="bash"
          filename="terminal"
          code={`curl http://localhost:3000/api/health

# Expected response:
# { "status": "ok", "version": "1.0.0", "uptime": 42, "node": "22.x" }`}
        />
      </section>

      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/installation/page.tsx" />
    </article>
  );
}
