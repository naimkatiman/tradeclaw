'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Star,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Clock,
  Zap,
  Shield,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
}

interface SyncState {
  lastSync: string | null;
  lastSynced: number;
  lastErrors: number;
}

/* ─── Schema table ───────────────────────────────────────────────────── */
const SCHEMA_ROWS = [
  { prop: 'Name', type: 'Title', example: 'BTCUSDT BUY 1h' },
  { prop: 'Pair', type: 'Select', example: 'BTCUSDT' },
  { prop: 'Direction', type: 'Select', example: 'BUY / SELL' },
  { prop: 'Confidence', type: 'Number (%)', example: '87' },
  { prop: 'Timeframe', type: 'Select', example: '1h / 4h / 1d' },
  { prop: 'Entry Price', type: 'Number', example: '67340.00' },
  { prop: 'MACD Signal', type: 'Select', example: 'bullish / bearish' },
  { prop: 'Outcome', type: 'Select', example: 'WIN / LOSS / PENDING' },
  { prop: 'Date', type: 'Date', example: '2026-04-02T02:51:00Z' },
  { prop: 'PnL %', type: 'Number (%)', example: '2.45' },
];

/* ─── Setup steps ────────────────────────────────────────────────────── */
const STEPS = [
  {
    num: '1',
    title: 'Create a Notion Integration',
    desc: 'Go to notion.so/my-integrations and create a new internal integration. Name it "TradeClaw Signals".',
    link: { href: 'https://www.notion.so/my-integrations', label: 'Open My Integrations' },
  },
  {
    num: '2',
    title: 'Copy Your Integration Token',
    desc: 'After creating the integration, copy the Internal Integration Token. It starts with ntn_ or secret_.',
  },
  {
    num: '3',
    title: 'Create & Share a Database',
    desc: 'Create a full-page database in Notion with the columns listed in the schema below. Share it with your integration (open DB → &quot;...&quot; menu → Add connections).',
    code: 'curl -s https://tradeclaw.win/api/notion/schema | jq .curl -r',
  },
  {
    num: '4',
    title: 'Copy the Database ID',
    desc: 'Open your database. The ID is in the URL: notion.so/YOUR_WORKSPACE/[DATABASE_ID]?v=... — it is the 32-character hex string.',
  },
];

/* ─── Helpers ────────────────────────────────────────────────────────── */
function useCopy(timeoutMs = 2000) {
  const [copied, setCopied] = useState('');
  const copy = useCallback(
    (text: string, key: string) => {
      void navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), timeoutMs);
    },
    [timeoutMs],
  );
  return { copied, copy };
}

const PAIRS = [
  'All', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT',
  'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'LTCUSDT', 'BCHUSDT',
  'NEARUSDT', 'SUIUSDT', 'INJUSDT', 'PEPEUSDT', 'SHIBUSDT',
  'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY',
];
const DIRECTIONS = ['All', 'BUY', 'SELL'];

/* ─── Main component ─────────────────────────────────────────────────── */
export function NotionSignalsClient() {
  const [token, setToken] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [pair, setPair] = useState('All');
  const [direction, setDirection] = useState('All');
  const [minConfidence, setMinConfidence] = useState(70);
  const [limit, setLimit] = useState(20);

  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [syncState, setSyncState] = useState<SyncState>({ lastSync: null, lastSynced: 0, lastErrors: 0 });
  const [showSchema, setShowSchema] = useState(false);
  const { copied, copy } = useCopy();

  // Restore from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('tc-notion-signals');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { token?: string; databaseId?: string; syncState?: SyncState };
        if (parsed.token) setToken(parsed.token);
        if (parsed.databaseId) setDatabaseId(parsed.databaseId);
        if (parsed.syncState) setSyncState(parsed.syncState);
      } catch {
        // ignore
      }
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('tc-notion-signals', JSON.stringify({ token, databaseId, syncState }));
  }, [token, databaseId, syncState]);

  const handleSync = async () => {
    if (!token.trim() || !databaseId.trim()) return;
    setSyncing(true);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        token: token.trim(),
        databaseId: databaseId.trim(),
        limit,
        minConfidence,
      };
      if (pair !== 'All') body.pair = pair;
      if (direction !== 'All') body.direction = direction;

      const res = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as SyncResult;
      setResult(data);
      if (data.success) {
        const newState: SyncState = {
          lastSync: new Date().toISOString(),
          lastSynced: data.synced,
          lastErrors: data.errors.length,
        };
        setSyncState(newState);
      }
    } catch {
      setResult({ success: false, synced: 0, errors: ['Network error — check your connection'] });
    } finally {
      setSyncing(false);
    }
  };

  const curlSnippet = `curl -X POST https://tradeclaw.win/api/notion/signal-sync \\
  -H 'Content-Type: application/json' \\
  -d '{
    "token": "YOUR_NOTION_TOKEN",
    "databaseId": "YOUR_DATABASE_ID",
    "limit": 20,
    "minConfidence": 70
  }'`;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Hero */}
      <div className="border-b border-[var(--border)] bg-gradient-to-b from-[#1a1a2e]/60 to-transparent">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-lg">
              N
            </div>
            <span className="text-[var(--text-secondary)] text-sm font-medium">Notion Integration</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Sync Signals to{' '}
            <span className="text-emerald-400">Notion</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl mb-8">
            Push live TradeClaw trading signals directly into your Notion database — no middleware, no API keys stored,
            just a one-click sync with full filter control.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              <Zap className="w-3.5 h-3.5" />
              One-click sync
            </div>
            <div className="flex items-center gap-1.5 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
              <Shield className="w-3.5 h-3.5" />
              Token never stored server-side
            </div>
            <div className="flex items-center gap-1.5 text-sm text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1">
              <Database className="w-3.5 h-3.5" />
              10 signal properties synced
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">

        {/* Status card (if synced before) */}
        {syncState.lastSync && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex flex-wrap gap-6 items-center">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Last successful sync</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {new Date(syncState.lastSync).toLocaleString()} — {syncState.lastSynced} signals synced
                {syncState.lastErrors > 0 && `, ${syncState.lastErrors} errors`}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <Clock className="w-3.5 h-3.5" />
              Auto-clear on next sync
            </div>
          </div>
        )}

        {/* Setup guide */}
        <section>
          <h2 className="text-lg font-semibold mb-6">Setup Guide</h2>
          <div className="space-y-4">
            {STEPS.map((step) => (
              <div key={step.num} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step.num}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">{step.title}</p>
                  <p
                    className="text-xs text-[var(--text-secondary)] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: step.desc }}
                  />
                  {step.link && (
                    <a
                      href={step.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-2"
                    >
                      {step.link.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {step.code && (
                    <div className="mt-2 bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg p-2 font-mono text-xs text-[var(--text-secondary)] overflow-x-auto">
                      {step.code}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sync form */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-400" />
            Sync Now
          </h2>

          <div className="space-y-4">
            {/* Token */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Notion Integration Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Stored in your browser only — never sent to our servers except for the Notion API call.
              </p>
            </div>

            {/* Database ID */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Database ID
              </label>
              <input
                type="text"
                value={databaseId}
                onChange={(e) => setDatabaseId(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Pair</label>
                <select
                  value={pair}
                  onChange={(e) => setPair(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                >
                  {PAIRS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Direction</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                >
                  {DIRECTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Min Confidence: {minConfidence}%
                </label>
                <input
                  type="range"
                  min={50}
                  max={95}
                  step={5}
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Limit: {limit}
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            {/* Sync button */}
            <button
              onClick={() => void handleSync()}
              disabled={syncing || !token.trim() || !databaseId.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-500 hover:bg-emerald-400 text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing signals to Notion&hellip;
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Sync {limit} Signals to Notion
                </>
              )}
            </button>

            {/* Result */}
            {result && (
              <div
                className={`rounded-lg border p-4 ${
                  result.success
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-rose-500/30 bg-rose-500/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className={`text-sm font-medium ${result.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.success
                      ? `${result.synced} signal${result.synced !== 1 ? 's' : ''} synced successfully`
                      : 'Sync failed'}
                  </span>
                </div>
                {result.errors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i} className="text-xs text-rose-300 font-mono">
                        {err}
                      </li>
                    ))}
                    {result.errors.length > 5 && (
                      <li className="text-xs text-[var(--text-secondary)]">
                        +{result.errors.length - 5} more errors
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Schema table */}
        <section>
          <button
            onClick={() => setShowSchema((s) => !s)}
            className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)] hover:text-emerald-400 transition-colors"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            Notion Database Schema
            {showSchema ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showSchema && (
            <div className="mt-4 rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--glass-bg)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">Property</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEMA_ROWS.map((row, i) => (
                    <tr key={row.prop} className={i % 2 === 0 ? '' : 'bg-[var(--glass-bg)]/30'}>
                      <td className="px-4 py-2.5 font-mono text-xs text-emerald-400">{row.prop}</td>
                      <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)]">{row.type}</td>
                      <td className="px-4 py-2.5 text-xs text-[var(--foreground)]">{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* cURL API reference */}
        <section>
          <h2 className="text-lg font-semibold mb-4">API Reference</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Use the sync endpoint directly from cron jobs, n8n, Make, or any HTTP client:
          </p>
          <div className="relative rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-4 font-mono text-xs text-[var(--text-secondary)] overflow-x-auto">
            <pre>{curlSnippet}</pre>
            <button
              onClick={() => copy(curlSnippet, 'curl')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              {copied === 'curl' ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Response: <code className="text-emerald-400">{'{ "success": true, "synced": 20, "errors": [] }'}</code>
          </p>
        </section>

        {/* Links */}
        <section className="flex flex-wrap gap-4">
          <Link
            href="/notion"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-emerald-400 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            Full Notion integration docs
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-emerald-400 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            More integrations
          </Link>
          <Link
            href="/api-docs"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-emerald-400 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            API docs
          </Link>
        </section>

        {/* GitHub star CTA */}
        <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-8 text-center">
          <Star className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Find this useful?</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6 max-w-md mx-auto">
            TradeClaw is open source. A GitHub star helps more traders discover it.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all duration-200"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </section>

      </div>
    </div>
  );
}
