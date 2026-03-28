import type { Metadata } from 'next';
import { Globe, Lock, Database, Radio } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CodeBlock } from '../components/code-block';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'Self-Hosting',
  description: 'Production deployment guide for TradeClaw — nginx reverse proxy, SSL, monitoring, and scaling.',
};

export default function SelfHostingPage() {
  const { prev, next } = getPrevNext('/docs/self-hosting');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Getting Started</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Self-Hosting Guide</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          Run TradeClaw in production on your own server with Docker, nginx, SSL certificates,
          and proper monitoring. This guide covers a production-grade deployment from scratch.
        </p>
      </div>

      {/* Architecture */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Architecture Overview</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          A production TradeClaw deployment consists of:
        </p>
        <div className="grid gap-3">
          {([
            { name: 'Web App', desc: 'Next.js standalone server on port 3000', icon: Globe },
            { name: 'Reverse Proxy', desc: 'nginx handling TLS termination and compression', icon: Lock },
            { name: 'Data Store', desc: 'File-based JSON in /data directory (no external DB required)', icon: Database },
            { name: 'SSE Stream', desc: 'Server-Sent Events for live price feed on /api/prices/stream', icon: Radio },
          ] as { name: string; desc: string; icon: LucideIcon }[]).map(item => (
            <div key={item.name} className="flex items-start gap-3 p-4 rounded-xl border border-white/6 bg-white/[0.02]">
              <item.icon className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-zinc-200">{item.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Server Requirements */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Server Requirements</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[400px] rounded-xl border border-white/8 bg-white/[0.02] divide-y divide-white/5">
            {[
              { spec: 'CPU', min: '1 vCPU', rec: '2+ vCPU' },
              { spec: 'RAM', min: '512 MB', rec: '1 GB+' },
              { spec: 'Disk', min: '1 GB', rec: '5 GB+' },
              { spec: 'OS', min: 'Any Linux', rec: 'Ubuntu 22.04 / Debian 12' },
              { spec: 'Docker', min: '24.0+', rec: 'Latest stable' },
              { spec: 'Node.js', min: '22.0+', rec: '22 LTS (if running without Docker)' },
            ].map(row => (
              <div key={row.spec} className="flex items-center px-4 py-3">
                <span className="text-sm text-zinc-300 font-medium w-24">{row.spec}</span>
                <span className="text-sm text-zinc-500 w-32">{row.min}</span>
                <span className="text-sm text-zinc-400 flex-1">{row.rec}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Docker Production Setup */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Docker Production Setup</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          The recommended approach. Uses the multi-stage Dockerfile with a minimal production image.
        </p>

        <h3 className="text-lg font-semibold text-zinc-200 mb-3">1. Clone and configure</h3>
        <CodeBlock language="bash" code={`git clone https://github.com/naimkatiman/tradeclaw.git
cd tradeclaw
cp .env.example .env`} />

        <h3 className="text-lg font-semibold text-zinc-200 mb-3 mt-6">2. Edit environment variables</h3>
        <CodeBlock language="bash" filename=".env" code={`# Required
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional — enable features
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook

# Alpha Screener (SaaS upsell, optional)
NEXT_PUBLIC_ALPHA_SCREENER_URL=https://alpha-screener.com
ALPHA_SCREENER_API_KEY=your_key`} />

        <h3 className="text-lg font-semibold text-zinc-200 mb-3 mt-6">3. Build and run</h3>
        <CodeBlock language="bash" code={`docker compose up -d --build

# Verify health
curl http://localhost:3000/api/health`} />
      </section>

      {/* Nginx Reverse Proxy */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Nginx Reverse Proxy</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          Place nginx in front of TradeClaw for TLS termination, compression, and caching.
        </p>
        <CodeBlock language="nginx" filename="/etc/nginx/sites-available/tradeclaw" code={`server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    gzip_min_length 1000;

    # SSE support — disable buffering for stream endpoints
    location /api/prices/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }

    # All other requests
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache static assets
        location /_next/static/ {
            proxy_pass http://127.0.0.1:3000;
            expires 365d;
            add_header Cache-Control "public, immutable";
        }
    }
}`} />
      </section>

      {/* SSL with Let's Encrypt */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">SSL with Let&apos;s Encrypt</h2>
        <CodeBlock language="bash" code={`# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (certbot adds a systemd timer automatically)
sudo certbot renew --dry-run`} />
      </section>

      {/* Monitoring */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Health Monitoring</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          TradeClaw exposes a <code className="text-emerald-400 text-sm">/api/health</code> endpoint
          that returns uptime, version, and build status. Use it for uptime checks.
        </p>
        <CodeBlock language="json" filename="GET /api/health" code={`{
  "status": "ok",
  "version": "0.5.0",
  "uptime": 86400,
  "node": "v22.0.0",
  "build": "standalone",
  "timestamp": "2026-03-27T10:00:00.000Z"
}`} />
        <p className="text-zinc-400 leading-relaxed mt-4">
          Pair with services like <span className="text-zinc-200">UptimeRobot</span>,{' '}
          <span className="text-zinc-200">Better Uptime</span>, or a simple cron curl:
        </p>
        <CodeBlock language="bash" code={`# crontab -e
*/5 * * * * curl -sf https://your-domain.com/api/health || echo "TradeClaw down" | mail -s "Alert" you@email.com`} />
      </section>

      {/* Updating */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Updating TradeClaw</h2>
        <CodeBlock language="bash" code={`cd tradeclaw
git pull origin main
docker compose down
docker compose up -d --build

# Verify
curl http://localhost:3000/api/health`} />
        <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-sm text-amber-200">
            <strong>Data persistence:</strong> Signal history, paper trading positions, and plugin
            configurations are stored in <code className="text-amber-300">data/</code>. This directory
            is volume-mounted in Docker and survives rebuilds.
          </p>
        </div>
      </section>

      {/* Running without Docker */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Running Without Docker</h2>
        <CodeBlock language="bash" code={`# Install dependencies
pnpm install

# Build production
pnpm build

# Start (uses Next.js standalone output)
cd apps/web
node .next/standalone/apps/web/server.js`} />
        <p className="text-zinc-400 leading-relaxed mt-4">
          Use a process manager like <span className="text-zinc-200">PM2</span> or{' '}
          <span className="text-zinc-200">systemd</span> to keep the process alive:
        </p>
        <CodeBlock language="ini" filename="/etc/systemd/system/tradeclaw.service" code={`[Unit]
Description=TradeClaw Trading Platform
After=network.target

[Service]
Type=simple
User=tradeclaw
WorkingDirectory=/opt/tradeclaw/apps/web
ExecStart=/usr/bin/node .next/standalone/apps/web/server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target`} />
      </section>

      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/self-hosting/page.tsx" />
    </article>
  );
}
