'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Zap,
  Copy,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Star,
  FileJson,
  Code,
  Webhook,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DigestPayload {
  date: string;
  generatedAt: string;
  version: string;
  summary: {
    totalSignals: number;
    topSignalsCount: number;
    buyCount: number;
    sellCount: number;
    avgConfidence: number;
    marketBias: string;
  };
  topSignals: {
    id: string;
    symbol: string;
    direction: string;
    confidence: number;
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    timeframe: string;
    timestamp: string;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Copy Button                                                        */
/* ------------------------------------------------------------------ */

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
      {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
      {label || 'Copy'}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Code Block                                                         */
/* ------------------------------------------------------------------ */

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="relative rounded-lg overflow-hidden" style={{ background: '#0a0a0a' }}>
      {lang && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: '#1a1a1a' }}>
          <span className="text-[10px] uppercase tracking-wider text-emerald-500">{lang}</span>
          <CopyBtn text={code} />
        </div>
      )}
      <pre className="p-3 text-xs font-mono overflow-x-auto" style={{ color: '#a1a1aa' }}>
        {code}
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Integration Guides                                                 */
/* ------------------------------------------------------------------ */

const INTEGRATIONS = [
  {
    name: 'n8n',
    icon: <Webhook size={18} />,
    color: '#ea4b71',
    code: `// n8n HTTP Request node
URL: https://your-tradeclaw.com/api/digest/daily
Method: GET
Schedule: Every day at 08:00 UTC
// Parse JSON → filter → send to Slack/Email/Notion`,
  },
  {
    name: 'Zapier',
    icon: <Zap size={18} />,
    color: '#ff4a00',
    code: `Trigger: Schedule by Zapier (Every Day)
Action 1: Webhooks by Zapier → GET
URL: https://your-tradeclaw.com/api/digest/daily
Action 2: Gmail → Send Email
Subject: TradeClaw Daily Digest - {{date}}
Body: {{topSignals}}`,
  },
  {
    name: 'Make.com',
    icon: <RefreshCw size={18} />,
    color: '#6d28d9',
    code: `Module 1: HTTP → Make a request
URL: https://your-tradeclaw.com/api/digest/daily
Method: GET
Schedule: Once a day

Module 2: Iterator → topSignals array
Module 3: Slack/Discord → Post message`,
  },
  {
    name: 'cURL / Cron',
    icon: <Terminal size={18} />,
    color: '#10b981',
    code: `# Add to crontab (runs daily at 8am)
0 8 * * * curl -s https://your-tradeclaw.com/api/digest/daily \\
  | jq '.topSignals[] | "\\(.symbol) \\(.direction) \\(.confidence)%"' \\
  | mail -s "TradeClaw Digest" you@email.com`,
  },
];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function DigestClient() {
  const [digest, setDigest] = useState<DigestPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/digest/daily')
      .then(r => r.json())
      .then(d => { setDigest(d); setLoading(false); })
      .catch(() => { setError('Failed to load digest'); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
          <Link href="/" className="text-xs font-medium flex items-center gap-1.5 mb-4" style={{ color: 'var(--text-secondary)' }}>
            ← Back to TradeClaw
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-muted)' }}>
              <Clock size={20} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Signal Digest</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            A JSON daily digest of top signals, ready to be consumed by any cron job — n8n, Make, Zapier, or a simple curl.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* API endpoint */}
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileJson size={16} className="text-emerald-500" />
            API Endpoint
          </h2>
          <div className="flex items-center gap-2 rounded-lg p-3 font-mono text-sm" style={{ background: '#0a0a0a' }}>
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-400">GET</span>
            <code className="flex-1" style={{ color: '#a1a1aa' }}>/api/digest/daily</code>
            <CopyBtn text="curl -s https://tradeclaw.com/api/digest/daily | jq ." label="Copy curl" />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--glass-bg)' }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Cache</p>
              <p className="text-sm font-mono font-semibold">5 min</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--glass-bg)' }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>CORS</p>
              <p className="text-sm font-mono font-semibold">Open</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--glass-bg)' }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Auth</p>
              <p className="text-sm font-mono font-semibold">None</p>
            </div>
          </div>
        </div>

        {/* Live payload preview */}
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Code size={16} style={{ color: 'var(--text-secondary)' }} />
              Live Payload Preview
            </h2>
            {digest && <CopyBtn text={JSON.stringify(digest, null, 2)} label="Copy JSON" />}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-emerald-500" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-400 py-4">{error}</p>
          ) : digest ? (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--accent-muted)' }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1 text-emerald-500">Total Signals</p>
                  <p className="text-lg font-bold text-emerald-500">{digest.summary.totalSignals}</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--accent-muted)' }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1 text-emerald-500">Avg Confidence</p>
                  <p className="text-lg font-bold text-emerald-500">{digest.summary.avgConfidence}%</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--accent-muted)' }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1 text-emerald-500">Market Bias</p>
                  <p className="text-lg font-bold text-emerald-500">{digest.summary.marketBias}</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--accent-muted)' }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1 text-emerald-500">Top Signals</p>
                  <p className="text-lg font-bold text-emerald-500">{digest.summary.topSignalsCount}</p>
                </div>
              </div>

              {/* JSON preview (truncated) */}
              <CodeBlock
                lang="JSON Response"
                code={JSON.stringify(digest, null, 2).slice(0, 1200) + (JSON.stringify(digest, null, 2).length > 1200 ? '\n  ...' : '')}
              />
            </div>
          ) : null}
        </div>

        {/* Setup guides */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Setup Guides</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {INTEGRATIONS.map(int => (
              <div key={int.name} className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: int.color }}>{int.icon}</span>
                  <h3 className="text-sm font-semibold">{int.name}</h3>
                </div>
                <CodeBlock code={int.code} />
              </div>
            ))}
          </div>
        </div>

        {/* Use cases */}
        <div className="rounded-xl p-5" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
          <h3 className="text-sm font-semibold mb-3 text-purple-400">What People Build With This</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { title: 'Morning Briefing Email', desc: 'Daily email with top signals at 8am' },
              { title: 'Slack/Discord Bot', desc: 'Post daily digest to your trading channel' },
              { title: 'Notion Database', desc: 'Auto-append signals to a Notion table' },
              { title: 'Google Sheets Logger', desc: 'Track signals over time in a spreadsheet' },
              { title: 'Telegram Alert', desc: 'Push top signals to your Telegram group' },
              { title: 'Custom Dashboard', desc: 'Feed signals into your own trading UI' },
            ].map(uc => (
              <div key={uc.title} className="rounded-lg p-3" style={{ background: 'rgba(168,85,247,0.06)' }}>
                <p className="text-xs font-semibold text-purple-400">{uc.title}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Star CTA */}
        <div className="text-center py-6">
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Star size={16} className="text-amber-400" /> Star TradeClaw on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
