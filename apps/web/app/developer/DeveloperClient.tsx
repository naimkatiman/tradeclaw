'use client';

import { useState, useEffect } from 'react';

interface ApiKey {
  id: string;
  name: string;
  key: string; // masked in list responses, full on creation
  email?: string;
  scopes?: string[];
  status?: 'active' | 'revoked';
  createdAt: number;
  lastUsedAt?: number | null;
  requestCount?: number;
  rateLimit?: number;
  // legacy fields kept for compatibility
  keyPreview?: string;
  lastUsed?: string | null;
  requestsToday?: number;
  requestsTotal?: number;
}

interface ApiResponse {
  keys: ApiKey[];
}

interface CreateResponse {
  key: ApiKey;
  message: string;
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100);
  const color = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-zinc-500' : 'bg-emerald-500';
  return (
    <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function DeveloperClient() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEmail, setNewKeyEmail] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/keys')
      .then((r) => r.json())
      .then((data: ApiResponse) => setKeys(data.keys ?? []))
      .catch(() => setError('Failed to load keys'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim() || !newKeyEmail.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const r = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), email: newKeyEmail.trim() }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? 'Failed to create key');
      }
      const data: CreateResponse = await r.json();
      // Full key string is in data.key.key on creation
      setNewKeyValue(data.key.key);
      setKeys((prev) => [data.key, ...prev]);
      setNewKeyName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  }

  const curlSnippet = `curl -H "X-API-Key: tc_live_YOUR_KEY" \\
  https://tradeclaw.win/api/signals`;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-emerald-400 mb-2 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Developer
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            TradeClaw <span className="text-emerald-400">Developer API</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-sm max-w-xl">
            Access real-time trading signals programmatically. Free tier includes 1,000 requests/day.
          </p>
        </div>

        {newKeyValue && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10">
            <p className="text-xs text-emerald-400 font-semibold mb-1">
              New API key — save it now, it won&apos;t be shown again:
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <code className="font-mono text-sm text-emerald-300 break-all">{newKeyValue}</code>
              <CopyButton text={newKeyValue} />
            </div>
            <button
              onClick={() => setNewKeyValue(null)}
              className="text-xs text-white/40 hover:text-white/70 mt-2 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="glass-card rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-3">Create API key</h2>
              <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g. my-bot)"
                  className="flex-1 min-w-[140px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
                  maxLength={64}
                />
                <input
                  type="email"
                  value={newKeyEmail}
                  onChange={(e) => setNewKeyEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 min-w-[160px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="submit"
                  disabled={creating || !newKeyName.trim() || !newKeyEmail.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-semibold transition-colors shrink-0"
                >
                  {creating ? 'Creating…' : 'Generate key'}
                </button>
              </form>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/6 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Your keys</h2>
                <span className="text-xs text-[var(--text-secondary)]">{keys.length} / 5</span>
              </div>

              {loading ? (
                <div className="px-5 py-8 text-center text-sm text-[var(--text-secondary)]">Loading…</div>
              ) : keys.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[var(--text-secondary)]">
                  No keys yet — generate one above.
                </div>
              ) : (
                <ul className="divide-y divide-white/6">
                  {keys.map((k) => (
                    <li key={k.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{k.name}</p>
                          <code className="text-xs text-[var(--text-secondary)] font-mono">{k.key}</code>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                          k.status === 'revoked'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {k.status ?? 'Free'}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                          <span>{(k.requestCount ?? 0).toLocaleString()} / {(k.rateLimit ?? 1000).toLocaleString()} req/hr</span>
                        </div>
                        <UsageBar used={k.requestCount ?? 0} limit={k.rateLimit ?? 1000} />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                        Created {new Date(k.createdAt).toLocaleDateString()}
                        {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-card rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-3">Quick start</h2>
              <div className="relative">
                <pre className="text-xs font-mono bg-black/30 rounded-lg p-3 overflow-x-auto text-emerald-300 leading-relaxed whitespace-pre-wrap break-all">
                  {curlSnippet}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={curlSnippet} />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-3">Endpoints</h2>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                {[
                  { method: 'GET', path: '/api/signals', desc: 'Latest signals' },
                  { method: 'GET', path: '/api/signals/:symbol', desc: 'Symbol signals' },
                  { method: 'GET', path: '/api/feed.json', desc: 'JSON feed' },
                  { method: 'GET', path: '/api/feed.rss', desc: 'RSS feed' },
                ].map((ep) => (
                  <li key={ep.path} className="flex flex-wrap gap-1.5 items-start">
                    <span className="font-mono text-emerald-400 shrink-0">{ep.method}</span>
                    <span className="font-mono break-all">{ep.path}</span>
                    <span className="text-white/30">— {ep.desc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-3">Free tier limits</h2>
              <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <li className="flex justify-between"><span>Requests / day</span><span className="text-white">1,000</span></li>
                <li className="flex justify-between"><span>Keys</span><span className="text-white">5</span></li>
                <li className="flex justify-between"><span>Rate limit</span><span className="text-white">10 req/s</span></li>
                <li className="flex justify-between"><span>History</span><span className="text-white">7 days</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
