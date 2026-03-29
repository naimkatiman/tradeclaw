'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, KeyRound, BarChart2, Container } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Scope = 'signals' | 'leaderboard' | 'screener';

interface ApiKeyMasked {
  id: string;
  key: string; // masked
  name: string;
  email: string;
  description: string;
  scopes: Scope[];
  createdAt: number;
  lastUsedAt: number | null;
  requestCount: number;
  rateLimit: number;
  status: 'active' | 'revoked';
}

interface CreateResponse {
  key: ApiKeyMasked & { key: string }; // full key on creation
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors shrink-0"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}

function ScopeBadge({ scope }: { scope: Scope }) {
  const colors: Record<Scope, string> = {
    signals: 'bg-emerald-500/20 text-emerald-400',
    leaderboard: 'bg-blue-500/20 text-blue-400',
    screener: 'bg-purple-500/20 text-purple-400',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${colors[scope]}`}>
      {scope}
    </span>
  );
}

function StatusBadge({ status }: { status: 'active' | 'revoked' }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        status === 'active'
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'bg-red-500/20 text-red-400'
      }`}
    >
      {status}
    </span>
  );
}

// ─── Code Examples ────────────────────────────────────────────────────────────

const CODE_TABS = ['curl', 'JavaScript', 'Python'] as const;
type CodeTab = typeof CODE_TABS[number];

const CODE_EXAMPLES: Record<CodeTab, string> = {
  curl: `curl -H "X-API-Key: tc_live_YOUR_KEY" \\
  https://tradeclaw.win/api/signals

# With filters
curl -H "X-API-Key: tc_live_YOUR_KEY" \\
  "https://tradeclaw.win/api/signals?symbol=XAUUSD&direction=BUY"`,

  JavaScript: `const res = await fetch('https://tradeclaw.win/api/signals', {
  headers: {
    'X-API-Key': 'tc_live_YOUR_KEY',
  },
});
const { signals } = await res.json();
console.log(signals);`,

  Python: `import requests

headers = {'X-API-Key': 'tc_live_YOUR_KEY'}
r = requests.get('https://tradeclaw.win/api/signals', headers=headers)
signals = r.json()['signals']
print(signals)`,
};

// ─── Sections ─────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <div className="mb-12 text-center">
      <div className="inline-flex items-center gap-2 text-xs text-emerald-400 mb-4 font-mono px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
        Free API Keys
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
        Get your free{' '}
        <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          API key
        </span>
      </h1>
      <p className="text-[var(--text-secondary)] text-base max-w-xl mx-auto mb-6">
        Access real-time trading signals, leaderboard data, and screener results
        programmatically. 1,000 requests/hour free.{' '}
        <Link href="/docs/self-hosting" className="text-emerald-400 hover:underline">
          Self-host for unlimited.
        </Link>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--text-secondary)]">
        {([
          { icon: Zap, text: '1,000 req/hour free' },
          { icon: KeyRound, text: 'Scoped permissions' },
          { icon: BarChart2, text: 'Usage dashboard' },
          { icon: Container, text: 'Self-host for unlimited' },
        ] as const).map(({ icon: Icon, text }) => (
          <span key={text} className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" /> {text}
          </span>
        ))}
      </div>
    </div>
  );
}

function CreateKeyForm({
  onCreated,
}: {
  onCreated: (key: ApiKeyMasked & { key: string }) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [scopes, setScopes] = useState<Scope[]>(['signals', 'leaderboard', 'screener']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleScope = (s: Scope) => {
    setScopes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (scopes.length === 0) {
      setError('Select at least one scope.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), description: description.trim(), scopes }),
      });
      const data: CreateResponse | { error: string } = await r.json();
      if (!r.ok) {
        throw new Error('error' in data ? data.error : 'Failed to create key');
      }
      const created = data as CreateResponse;
      onCreated(created.key);
      setName('');
      setEmail('');
      setDescription('');
      setScopes(['signals', 'leaderboard', 'screener']);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const scopeOptions: { value: Scope; label: string; desc: string }[] = [
    { value: 'signals', label: 'Signals', desc: '/api/signals' },
    { value: 'leaderboard', label: 'Leaderboard', desc: '/api/leaderboard' },
    { value: 'screener', label: 'Screener', desc: '/api/screener' },
  ];

  return (
    <div className="glass-card rounded-xl p-6">
      <h2 className="text-base font-semibold mb-4">Create API key</h2>
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Key name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. my-trading-bot"
              maxLength={64}
              required
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Description <span className="text-white/30">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will you use this key for?"
            maxLength={200}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-2">
            Scopes <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {scopeOptions.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleScope(value)}
                className={`flex flex-col items-start px-3 py-2 rounded-lg border text-xs transition-colors ${
                  scopes.includes(value)
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20'
                }`}
              >
                <span className="font-medium">{label}</span>
                <span className="font-mono opacity-60">{desc}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !name.trim() || !email.trim()}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-semibold transition-colors"
        >
          {loading ? 'Generating…' : 'Generate API key'}
        </button>
      </form>
    </div>
  );
}

function KeyRevealBanner({
  apiKey,
  onDismiss,
}: {
  apiKey: string;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border-2 border-emerald-500/60 bg-emerald-500/10 p-5">
      <div className="flex items-start gap-3 mb-3">
        <KeyRound className="w-5 h-5 text-emerald-300 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-300">Your new API key</p>
          <p className="text-xs text-emerald-400/70 mt-0.5">
            Save this key now — we will not show it again.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 bg-black/30 rounded-lg px-4 py-3 mb-3">
        <code className="font-mono text-sm text-emerald-300 break-all flex-1">{apiKey}</code>
        <CopyButton text={apiKey} label="Copy key" />
      </div>
      <button
        onClick={onDismiss}
        className="text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        I&apos;ve saved it — dismiss
      </button>
    </div>
  );
}

function UsageTable({ email }: { email: string }) {
  const [keys, setKeys] = useState<ApiKeyMasked[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupEmail, setLookupEmail] = useState(email);
  const [searched, setSearched] = useState(false);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupEmail.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(false);
    try {
      const r = await fetch(`/api/keys?email=${encodeURIComponent(lookupEmail.trim())}`);
      const data = await r.json() as { keys?: ApiKeyMasked[]; error?: string };
      if (!r.ok) throw new Error(data.error ?? 'Lookup failed');
      setKeys(data.keys ?? []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/6">
        <h2 className="text-base font-semibold mb-3">Lookup your keys</h2>
        <form onSubmit={lookup} className="flex gap-2">
          <input
            type="email"
            value={lookupEmail}
            onChange={(e) => setLookupEmail(e.target.value)}
            placeholder="Enter your email to see your keys"
            className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
          />
          <button
            type="submit"
            disabled={loading || !lookupEmail.trim()}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-sm font-medium transition-colors shrink-0"
          >
            {loading ? 'Searching…' : 'Lookup'}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </div>

      {searched && keys.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">
          No keys found for {lookupEmail}.
        </div>
      )}

      {keys.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/6 text-[var(--text-secondary)]">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Key</th>
                <th className="px-4 py-3 text-left font-medium">Scopes</th>
                <th className="px-4 py-3 text-right font-medium">Requests</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--foreground)]">{k.name}</p>
                    {k.description && (
                      <p className="text-[var(--text-secondary)] truncate max-w-[160px]">{k.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-[var(--text-secondary)]">{k.key}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <ScopeBadge key={s} scope={s} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[var(--foreground)]">{k.requestCount.toLocaleString()}</span>
                    <span className="text-[var(--text-secondary)]"> / {k.rateLimit.toLocaleString()}/hr</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={k.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CodeExamples() {
  const [activeTab, setActiveTab] = useState<CodeTab>('curl');

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between">
        <h2 className="text-base font-semibold">Quick start</h2>
        <div className="flex gap-1">
          {CODE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="relative p-4">
        <pre className="text-xs font-mono bg-black/30 rounded-lg p-4 overflow-x-auto text-emerald-300 leading-relaxed whitespace-pre">
          {CODE_EXAMPLES[activeTab]}
        </pre>
        <div className="absolute top-6 right-6">
          <CopyButton text={CODE_EXAMPLES[activeTab]} />
        </div>
      </div>
    </div>
  );
}

function RateLimitCard() {
  return (
    <div className="glass-card rounded-xl p-6">
      <h2 className="text-base font-semibold mb-4">Rate limits</h2>
      <div className="space-y-3">
        {[
          { label: 'Requests / hour', value: '1,000', highlight: true },
          { label: 'Keys per email', value: 'Unlimited' },
          { label: 'Auth header', value: 'X-API-Key' },
          { label: 'Self-hosted', value: 'Unlimited' },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">{label}</span>
            <span className={highlight ? 'text-emerald-400 font-semibold' : 'text-[var(--foreground)]'}>
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-white/6 text-xs text-[var(--text-secondary)]">
        Exceeded the limit?{' '}
        <Link href="/docs/self-hosting" className="text-emerald-400 hover:underline">
          Self-host TradeClaw
        </Link>{' '}
        for unlimited access.
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ApiKeysClient() {
  const [newKey, setNewKey] = useState<(ApiKeyMasked & { key: string }) | null>(null);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <Hero />

        {newKey && (
          <div className="mb-8">
            <KeyRevealBanner
              apiKey={newKey.key}
              onDismiss={() => setNewKey(null)}
            />
          </div>
        )}

        <div className="space-y-6">
          <CreateKeyForm onCreated={(k) => setNewKey(k)} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <UsageTable email="" />
            </div>
            <div>
              <RateLimitCard />
            </div>
          </div>

          <CodeExamples />

          {/* API Endpoints reference */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-base font-semibold mb-4">Available endpoints</h2>
            <div className="space-y-2">
              {[
                { method: 'GET', path: '/api/signals', scope: 'signals', desc: 'Real-time trading signals (BUY/SELL)' },
                { method: 'GET', path: '/api/signals/multi-tf', scope: 'signals', desc: 'Multi-timeframe signal analysis' },
                { method: 'GET', path: '/api/leaderboard', scope: 'leaderboard', desc: 'Strategy performance leaderboard' },
                { method: 'GET', path: '/api/screener', scope: 'screener', desc: 'Instrument screener results' },
                { method: 'GET', path: '/api/feed.json', scope: 'signals', desc: 'JSON signal feed' },
                { method: 'GET', path: '/api/feed.rss', scope: 'signals', desc: 'RSS signal feed' },
              ].map((ep) => (
                <div key={ep.path} className="flex flex-wrap items-center gap-2 text-xs py-1.5 border-b border-white/5 last:border-0">
                  <span className="font-mono text-emerald-400 w-8 shrink-0">{ep.method}</span>
                  <code className="font-mono text-[var(--foreground)] flex-1 min-w-0">{ep.path}</code>
                  <ScopeBadge scope={ep.scope as Scope} />
                  <span className="text-[var(--text-secondary)] hidden sm:block">{ep.desc}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-[var(--text-secondary)]">
              Full API reference →{' '}
              <Link href="/api-docs" className="text-emerald-400 hover:underline">
                tradeclaw.win/api-docs
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
