import type { Metadata } from 'next';
import { CodeBlock } from '../components/code-block';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'API Reference',
  description: 'Complete REST API reference — all 42 endpoints with parameters, responses, and examples.',
};

function EndpointBadge({ method }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE' }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    PATCH: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/25',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${colors[method]} shrink-0`}>
      {method}
    </span>
  );
}

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  desc: string;
  params?: string[];
  response?: string;
}

function EndpointRow({ ep }: { ep: Endpoint }) {
  return (
    <div className="p-4 border-b border-white/4 last:border-0">
      <div className="flex items-center gap-2.5 mb-1.5">
        <EndpointBadge method={ep.method} />
        <code className="text-sm font-mono text-zinc-200">{ep.path}</code>
      </div>
      <p className="text-sm text-zinc-500">{ep.desc}</p>
      {ep.params && ep.params.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ep.params.map(p => (
            <code key={p} className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] border border-white/6 px-2 py-0.5 rounded">
              {p}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApiPage() {
  const { prev, next } = getPrevNext('/docs/api');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Integrations</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">API Reference</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          TradeClaw exposes a REST API with 42 endpoints. All endpoints return JSON.
          An OpenAPI 3.0 spec is available at{' '}
          <code className="text-emerald-400 text-base">/api/openapi</code>.
        </p>
      </div>

      {/* Base URL */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Base URL</h2>
        <CodeBlock language="bash" code={`https://your-instance.com/api`} />
        <p className="text-sm text-zinc-500 mt-2">
          All endpoints are relative to your deployment URL.
          Set <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_BASE_URL</code> in your environment.
        </p>
      </section>

      {/* Authentication */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4">Authentication</h2>
        <p className="text-zinc-400 mb-3 leading-relaxed">
          Public endpoints (signals, prices, health) require no authentication.
          Tier-gated endpoints check the <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">Authorization</code> header
          or a session cookie set by the Stripe checkout flow.
        </p>
        <CodeBlock
          language="bash"
          code={`curl https://your-instance.com/api/signals \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
        />
      </section>

      {/* Signals */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4" id="signals">Signals</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden mb-4">
          {([
            {
              method: 'GET', path: '/api/signals',
              desc: 'List trading signals with optional filtering.',
              params: ['symbol', 'timeframe', 'direction', 'minConfidence', 'limit'],
            },
            {
              method: 'GET', path: '/api/signals/history',
              desc: 'Historical signal archive with export support (CSV/JSON).',
              params: ['symbol', 'from', 'to', 'format'],
            },
            {
              method: 'GET', path: '/api/signals/multi-tf',
              desc: 'Multi-timeframe consensus — returns M15/H1/H4/D1 alignment for each symbol.',
              params: ['symbol'],
            },
          ] as Endpoint[]).map(ep => <EndpointRow key={ep.path} ep={ep} />)}
        </div>
        <CodeBlock
          language="bash"
          filename="Example: fetch high-confidence BUY signals on H1"
          code={`curl "https://your-instance.com/api/signals?direction=BUY&timeframe=H1&minConfidence=80"

# Response
{
  "signals": [
    {
      "id": "sig_abc123",
      "symbol": "XAUUSD",
      "timeframe": "H1",
      "direction": "BUY",
      "confidence": 87,
      "entryPrice": 2345.50,
      "tp1": 2360.00,
      "tp2": 2374.50,
      "tp3": 2389.00,
      "sl": 2331.00,
      "timestamp": "2026-03-27T12:00:00Z",
      "status": "active"
    }
  ],
  "total": 1
}`}
        />
      </section>

      {/* Prices */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4" id="prices">Prices</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden mb-4">
          {([
            {
              method: 'GET', path: '/api/prices',
              desc: 'Fetch current prices. Crypto from CoinGecko, Forex/Metals from Stooq.',
              params: ['symbols'],
            },
            {
              method: 'GET', path: '/api/prices/stream',
              desc: 'Server-Sent Events stream. Emits price updates and new signals in real time.',
            },
          ] as Endpoint[]).map(ep => <EndpointRow key={ep.path} ep={ep} />)}
        </div>
        <CodeBlock
          language="javascript"
          filename="SSE client example"
          code={`const es = new EventSource('/api/prices/stream');

es.addEventListener('price', (e) => {
  const { symbol, price, change } = JSON.parse(e.data);
  console.log(\`\${symbol}: \${price} (\${change > 0 ? '+' : ''}\${change}%)\`);
});

es.addEventListener('signal', (e) => {
  const signal = JSON.parse(e.data);
  console.log('New signal:', signal.symbol, signal.direction, signal.confidence);
});`}
        />
      </section>

      {/* Alerts */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4" id="alerts">Price Alerts</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          {([
            { method: 'GET', path: '/api/alerts', desc: 'List all price alerts.', params: ['status', 'symbol'] },
            {
              method: 'POST', path: '/api/alerts',
              desc: 'Create a price alert. Triggers a browser notification when price crosses the threshold.',
              params: ['symbol (required)', 'price (required)', 'direction (above|below)', 'note'],
            },
            { method: 'GET', path: '/api/alerts/[id]', desc: 'Get a single alert by ID.' },
            { method: 'GET', path: '/api/alerts/check', desc: 'Poll for triggered alerts. Call this to update alert status.' },
            { method: 'GET', path: '/api/alerts/stats', desc: 'Alert statistics — total, triggered, pending.' },
          ] as Endpoint[]).map(ep => <EndpointRow key={`${ep.method}${ep.path}`} ep={ep} />)}
        </div>
      </section>

      {/* Paper Trading */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4" id="paper-trading">Paper Trading</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden mb-4">
          {([
            { method: 'GET', path: '/api/paper-trading', desc: 'Get portfolio — balance, open positions, history, equity curve.' },
            {
              method: 'POST', path: '/api/paper-trading/open',
              desc: 'Open a simulated position.',
              params: ['symbol', 'direction', 'quantity', 'sl', 'tp1', 'tp2', 'tp3'],
            },
            { method: 'POST', path: '/api/paper-trading/close', desc: 'Close a specific position by ID.', params: ['positionId'] },
            { method: 'POST', path: '/api/paper-trading/close-all', desc: 'Close all open positions.' },
            { method: 'POST', path: '/api/paper-trading/follow-signal', desc: 'Auto-open a position from a signal.', params: ['signalId', 'quantity'] },
            { method: 'POST', path: '/api/paper-trading/reset', desc: 'Reset portfolio to $10,000 starting balance.' },
            { method: 'GET', path: '/api/paper-trading/stats', desc: 'P&L stats — win rate, Sharpe ratio, max drawdown, profit factor.' },
          ] as Endpoint[]).map(ep => <EndpointRow key={`${ep.method}${ep.path}`} ep={ep} />)}
        </div>
        <CodeBlock
          language="bash"
          filename="Open a position"
          code={`curl -X POST https://your-instance.com/api/paper-trading/open \\
  -H "Content-Type: application/json" \\
  -d '{
    "symbol": "BTCUSD",
    "direction": "BUY",
    "quantity": 500,
    "sl": 65000,
    "tp1": 70000,
    "tp2": 75000,
    "tp3": 80000
  }'`}
        />
      </section>

      {/* Screener */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4" id="screener">Screener</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden mb-4">
          {([
            {
              method: 'GET', path: '/api/screener',
              desc: 'Market screener with composite TA filters.',
              params: ['minRSI', 'maxRSI', 'macdSignal', 'emaTrend', 'minVolatility', 'minConfidence'],
            },
          ] as Endpoint[]).map(ep => <EndpointRow key={ep.path} ep={ep} />)}
        </div>
      </section>

      {/* Webhooks */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4" id="webhooks">Webhooks</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          {([
            { method: 'GET', path: '/api/webhooks', desc: 'List all webhooks (secrets redacted).' },
            {
              method: 'POST', path: '/api/webhooks',
              desc: 'Create a webhook.',
              params: ['url (required)', 'name', 'secret'],
            },
            { method: 'PATCH', path: '/api/webhooks', desc: 'Update webhook URL, name, or enabled state.', params: ['id', 'url', 'name', 'enabled'] },
            { method: 'DELETE', path: '/api/webhooks', desc: 'Delete a webhook.', params: ['id'] },
            { method: 'POST', path: '/api/webhooks/[id]/test', desc: 'Send a test payload to the webhook.' },
            { method: 'GET', path: '/api/webhooks/[id]/deliveries', desc: 'View delivery history for a webhook.' },
            { method: 'POST', path: '/api/webhooks/deliver', desc: 'Manually trigger a delivery.', params: ['id', 'payload'] },
            { method: 'POST', path: '/api/webhooks/dispatch', desc: 'Broadcast a payload to all enabled webhooks.' },
          ] as Endpoint[]).map(ep => <EndpointRow key={`${ep.method}${ep.path}`} ep={ep} />)}
        </div>
      </section>

      {/* Plugins */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4" id="plugins">Plugins</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          {([
            { method: 'GET', path: '/api/plugins', desc: 'List all installed plugins.' },
            {
              method: 'POST', path: '/api/plugins',
              desc: 'Install a new plugin. Pass indicator metadata and JS code.',
              params: ['name', 'description', 'version', 'category', 'code', 'params'],
            },
            { method: 'GET', path: '/api/plugins/[id]', desc: 'Get plugin details and code.' },
            { method: 'GET', path: '/api/plugins/test', desc: 'Test a plugin with dummy OHLCV data.', params: ['id'] },
          ] as Endpoint[]).map(ep => <EndpointRow key={`${ep.method}${ep.path}`} ep={ep} />)}
        </div>
      </section>

      {/* Telegram */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4" id="telegram">Telegram</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          {([
            { method: 'POST', path: '/api/telegram/webhook', desc: 'Telegram update receiver. Set this as your bot webhook URL.' },
            { method: 'POST', path: '/api/telegram/send', desc: 'Send a message to a chat.', params: ['chatId', 'text', 'parseMode'] },
            { method: 'GET', path: '/api/telegram/status', desc: 'Check bot connection status and webhook info.' },
          ] as Endpoint[]).map(ep => <EndpointRow key={`${ep.method}${ep.path}`} ep={ep} />)}
        </div>
      </section>

      {/* Utility */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4" id="utility">Utility</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          {([
            { method: 'GET', path: '/api/health', desc: 'Health check. Returns status, version, uptime, and Node version.' },
            { method: 'GET', path: '/api/openapi', desc: 'OpenAPI 3.0 specification in JSON format.' },
            { method: 'GET', path: '/api/embed', desc: 'Generate embeddable widget script.', params: ['pair', 'theme', 'width', 'height'] },
            { method: 'GET', path: '/api/explain', desc: 'AI explanation of a signal\'s reasoning.', params: ['signalId'] },
            { method: 'GET', path: '/api/mtf', desc: 'Detailed multi-timeframe analysis for a symbol.', params: ['symbol'] },
            { method: 'GET', path: '/api/tpsl', desc: 'TP/SL calculator using ATR and Fibonacci extensions.', params: ['symbol', 'direction', 'entryPrice', 'risk'] },
            { method: 'GET', path: '/api/leaderboard', desc: 'Signal accuracy leaderboard by symbol and timeframe.' },
          ] as Endpoint[]).map(ep => <EndpointRow key={ep.path} ep={ep} />)}
        </div>
      </section>

      {/* Error format */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Error Format</h2>
        <p className="text-zinc-400 mb-3">All errors return a JSON body with an <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">error</code> field.</p>
        <CodeBlock
          language="json"
          code={`// 400 Bad Request
{ "error": "symbol is required" }

// 404 Not Found
{ "error": "signal not found" }

// 429 Too Many Requests
{ "error": "rate limit exceeded", "retryAfter": 60 }

// 500 Internal Server Error
{ "error": "internal server error" }`}
        />
      </section>

      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/api/page.tsx" />
    </article>
  );
}
