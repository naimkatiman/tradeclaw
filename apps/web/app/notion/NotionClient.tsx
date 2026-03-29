'use client';

import { useState } from 'react';
import Link from 'next/link';

/* ── Setup steps ─────────────────────────────────────────────── */
const STEPS = [
  {
    num: '1',
    title: 'Create a Notion Integration',
    desc: 'Go to notion.so/my-integrations and create a new internal integration. Give it a name like "TradeClaw Signals".',
    code: 'https://www.notion.so/my-integrations',
  },
  {
    num: '2',
    title: 'Copy Your Integration Token',
    desc: 'After creating the integration, copy the Internal Integration Token. It starts with ntn_ or secret_.',
  },
  {
    num: '3',
    title: 'Create a Database',
    desc: 'Create a full-page database in Notion with the required columns. Use our schema endpoint to get the exact structure, or copy the curl command below to create it via API.',
    code: 'curl -s https://your-tradeclaw.com/api/notion/schema | jq .curl -r',
  },
  {
    num: '4',
    title: 'Share Database with Integration',
    desc: 'Open your database, click the "..." menu in the top-right, select "Add connections", and find your integration name. Then copy the database ID from the URL.',
  },
];

/* ── Feature list ────────────────────────────────────────────── */
const FEATURES = [
  {
    title: 'Auto-Sync Signals',
    desc: 'Push your latest trading signals to Notion with a single API call. Each signal becomes a row in your database.',
  },
  {
    title: 'Configurable Filters',
    desc: 'Filter by pair, direction (BUY/SELL), and minimum confidence level. Export only what matters to you.',
  },
  {
    title: 'Scheduled Exports',
    desc: 'Set up a cron job or webhook to auto-sync on new signals. Keep your Notion database always up to date.',
  },
  {
    title: 'Full Signal Data',
    desc: 'Every signal includes pair, direction, confidence, timeframe, entry price, MACD signal, outcome, date, and PnL %.',
  },
];

/* ── Mock Notion table data ──────────────────────────────────── */
const MOCK_ROWS = [
  { pair: 'BTCUSDT', dir: 'BUY', conf: 87, tf: '4h', price: 67250.0, macd: 'bullish', outcome: 'WIN', date: '2026-03-28', pnl: 2.4 },
  { pair: 'ETHUSDT', dir: 'SELL', conf: 72, tf: '1h', price: 3420.5, macd: 'bearish', outcome: 'LOSS', date: '2026-03-28', pnl: -1.1 },
  { pair: 'XAUUSD', dir: 'BUY', conf: 91, tf: '1d', price: 2185.3, macd: 'bullish', outcome: 'WIN', date: '2026-03-27', pnl: 1.8 },
  { pair: 'SOLUSDT', dir: 'BUY', conf: 65, tf: '4h', price: 142.8, macd: 'bullish', outcome: 'PENDING', date: '2026-03-29', pnl: 0 },
];

/* ── Copy button helper ──────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

/* ── Pill helper for Notion-style selects ────────────────────── */
function Pill({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-500/15 text-emerald-400',
    red: 'bg-red-500/15 text-red-400',
    gray: 'bg-zinc-500/15 text-zinc-400',
    blue: 'bg-blue-500/15 text-blue-400',
    purple: 'bg-purple-500/15 text-purple-400',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {label}
    </span>
  );
}

/* ── Sync form section ───────────────────────────────────────── */
function SyncForm() {
  const [token, setToken] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [pair, setPair] = useState('');
  const [direction, setDirection] = useState('');
  const [minConfidence, setMinConfidence] = useState('');
  const [limit, setLimit] = useState('50');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ synced?: number; errors?: string[]; error?: string } | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = { token, databaseId };
      if (pair) body.pair = pair;
      if (direction) body.direction = direction;
      if (minConfidence) body.minConfidence = Number(minConfidence);
      if (limit) body.limit = Number(limit);

      const res = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(data as { synced?: number; errors?: string[]; error?: string });
    } catch {
      setResult({ error: 'Request failed. Check your connection.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Integration Token *</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ntn_..."
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--border)] text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Database ID *</label>
          <input
            type="text"
            value={databaseId}
            onChange={(e) => setDatabaseId(e.target.value)}
            placeholder="abc123..."
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--border)] text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Pair</label>
          <input
            type="text"
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            placeholder="BTCUSDT"
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--border)] text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Direction</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--border)] text-sm focus:outline-none focus:border-zinc-500"
          >
            <option value="">All</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Min Confidence</label>
          <input
            type="number"
            value={minConfidence}
            onChange={(e) => setMinConfidence(e.target.value)}
            placeholder="0"
            min={0}
            max={100}
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--border)] text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Limit</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="50"
            min={1}
            max={100}
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--border)] text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>
      <p className="text-xs text-zinc-600">Your token is sent only to the server-side API route and is not stored.</p>
      <button
        onClick={handleSync}
        disabled={!token || !databaseId || loading}
        className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
      >
        {loading ? 'Syncing...' : 'Sync Now'}
      </button>
      {result && (
        <div className={`rounded-lg p-4 text-sm ${result.error ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {result.error ? (
            <p>{result.error}</p>
          ) : (
            <>
              <p>Synced {result.synced} signal{result.synced === 1 ? '' : 's'} to Notion.</p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 text-red-400">
                  <p className="font-medium">{result.errors.length} error{result.errors.length === 1 ? '' : 's'}:</p>
                  <ul className="mt-1 list-disc list-inside text-xs">
                    {result.errors.slice(0, 5).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
const CURL_EXAMPLE = `curl -X POST https://your-tradeclaw.com/api/notion/sync \\
  -H 'Content-Type: application/json' \\
  -d '{
  "token": "ntn_YOUR_TOKEN",
  "databaseId": "YOUR_DATABASE_ID",
  "pair": "BTCUSDT",
  "minConfidence": 70,
  "limit": 25
}'`;

export function NotionClient() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-500/5 via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto">
          {/* Notion-style icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 mb-8">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14a9 3 0 0 0 18 0V5" />
              <path d="M3 12a9 3 0 0 0 18 0" />
            </svg>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Export TradeClaw Signals to{' '}
            <span className="text-zinc-400">Notion</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Sync your trading signals to a Notion database. Filter by pair, direction, and confidence. Automate with cron or webhooks.
          </p>

          <Link
            href="#sync"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-black font-semibold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/10"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 hover:border-zinc-600 transition-colors"
            >
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mock Notion Database Preview */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-2">What Your Notion Database Looks Like</h2>
        <p className="text-center text-sm text-[var(--text-secondary)] mb-8">
          Each synced signal becomes a row with full trading data.
        </p>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Pair</th>
                <th className="px-4 py-3 text-left font-medium">Direction</th>
                <th className="px-4 py-3 text-left font-medium">Confidence</th>
                <th className="px-4 py-3 text-left font-medium">Timeframe</th>
                <th className="px-4 py-3 text-left font-medium">Entry Price</th>
                <th className="px-4 py-3 text-left font-medium">MACD</th>
                <th className="px-4 py-3 text-left font-medium">Outcome</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">PnL %</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ROWS.map((r, i) => (
                <tr key={i} className={i < MOCK_ROWS.length - 1 ? 'border-b border-[var(--border)]' : ''}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{r.pair} {r.dir} {r.tf}</td>
                  <td className="px-4 py-3"><Pill label={r.pair} color="blue" /></td>
                  <td className="px-4 py-3"><Pill label={r.dir} color={r.dir === 'BUY' ? 'green' : 'red'} /></td>
                  <td className="px-4 py-3">{r.conf}%</td>
                  <td className="px-4 py-3"><Pill label={r.tf} color="purple" /></td>
                  <td className="px-4 py-3 font-mono">{r.price.toLocaleString()}</td>
                  <td className="px-4 py-3"><Pill label={r.macd} color={r.macd === 'bullish' ? 'green' : 'red'} /></td>
                  <td className="px-4 py-3">
                    <Pill
                      label={r.outcome}
                      color={r.outcome === 'WIN' ? 'green' : r.outcome === 'LOSS' ? 'red' : 'gray'}
                    />
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{r.date}</td>
                  <td className={`px-4 py-3 text-right font-mono ${r.pnl > 0 ? 'text-emerald-400' : r.pnl < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                    {r.pnl > 0 ? '+' : ''}{r.pnl}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Setup Steps */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Setup in 4 Steps</h2>
        <div className="space-y-6">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-full bg-white/5 text-white font-bold text-sm flex items-center justify-center border border-white/10">
                  {step.num}
                </span>
                <h3 className="font-semibold">{step.title}</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] ml-11 mb-3">{step.desc}</p>
              {step.code && (
                <div className="relative ml-11">
                  <pre className="bg-black/40 rounded-lg px-4 py-3 text-sm font-mono text-emerald-400 overflow-x-auto">
                    {step.code}
                  </pre>
                  <CopyButton text={step.code} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Sync Form */}
      <section id="sync" className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-2">Sync Your Signals</h2>
        <p className="text-center text-sm text-[var(--text-secondary)] mb-8">
          Enter your Notion credentials and configure filters. Signals are sent from the server — your token is never exposed client-side.
        </p>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <SyncForm />
        </div>
      </section>

      {/* curl Example */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">API Usage</h2>
        <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="px-4 py-2 border-b border-[var(--border)] text-xs text-zinc-500 font-mono">
            curl — POST /api/notion/sync
          </div>
          <pre className="p-4 text-sm font-mono text-zinc-300 overflow-x-auto">{CURL_EXAMPLE}</pre>
          <CopyButton text={CURL_EXAMPLE} />
        </div>
      </section>

      {/* Star CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-32 text-center">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
          <p className="text-[var(--text-secondary)] mb-4">
            TradeClaw is free and open source. Star us on GitHub to support the project.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-[var(--border)] font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Star on GitHub
          </a>
        </div>
      </section>
    </main>
  );
}
