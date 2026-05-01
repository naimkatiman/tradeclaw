'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  Zap,
  Radio,
  TrendingUp,
  Copy,
  Check,
  Star,
  ExternalLink,
  TrendingDown,
  Minus,
  BarChart3,
  Clock,
} from 'lucide-react';
import LiveActivityWidget from '../../components/live-activity-widget';
import { PageNavBar } from '../../components/PageNavBar';
import { BackgroundDecor } from '../../components/background/BackgroundDecor';

interface LiveSignal {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entry: number;
  tp: number;
  sl: number;
  timeframe: string;
  timestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function timeAgo(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function normalizeSignal(raw: Record<string, unknown>): LiveSignal {
  const pair = (raw.symbol as string) ?? (raw.pair as string) ?? 'BTCUSD';
  const direction = ((raw.direction as string) ?? 'HOLD').toUpperCase() as LiveSignal['direction'];
  const confidence = typeof raw.confidence === 'number' ? raw.confidence : 75;
  const entry = typeof raw.entry === 'number' ? raw.entry : 0;
  const tp = typeof raw.tp === 'number' ? raw.tp : typeof raw.takeProfit1 === 'number' ? raw.takeProfit1 : entry;
  const sl = typeof raw.sl === 'number' ? raw.sl : typeof raw.stopLoss === 'number' ? raw.stopLoss : entry;
  const timeframe = (raw.timeframe as string) ?? 'H1';
  const timestamp =
    typeof raw.timestamp === 'number'
      ? raw.timestamp
      : typeof raw.timestamp === 'string'
        ? new Date(raw.timestamp).getTime()
        : Date.now();

  return {
    id: `${pair}-${timeframe}-${timestamp}`,
    pair,
    direction,
    confidence: Math.round(confidence),
    entry,
    tp,
    sl,
    timeframe,
    timestamp,
  };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function DirectionBadge({ direction }: { direction: LiveSignal['direction'] }) {
  const cls =
    direction === 'BUY'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
      : direction === 'SELL'
        ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
        : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25';

  const Icon = direction === 'BUY' ? TrendingUp : direction === 'SELL' ? TrendingDown : Minus;

  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${cls}`}>
      <Icon className="w-3 h-3" />
      {direction}
    </span>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }, [text]);

  return (
    <button
      onClick={() => void handleCopy()}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors text-xs"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : label ?? 'Copy'}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function LiveClient() {
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [hourCount, setHourCount] = useState(0);
  const nowRef = useRef(0);
  const [now, setNow] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [activeTab, setActiveTab] = useState<'embed' | 'script' | 'json'>('embed');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const counterPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Fetch signals from /api/signals */
  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/signals');
      if (!res.ok) return;
      const json = await res.json();
      const raw: Record<string, unknown>[] = json.signals ?? [];
      const normalized = raw.map(normalizeSignal);

      normalized.sort((a, b) => b.timestamp - a.timestamp);

      // Fade animation on data refresh
      setFadeIn(false);
      setTimeout(() => {
        setSignals(normalized.slice(0, 20));
        setFadeIn(true);
        setLastFetchedAt(Date.now());
      }, 150);
    } catch {
      /* network error — keep existing signals */
    }
  }, []);

  /* Fetch hour count separately at 30s interval */
  const fetchHourCount = useCallback(async () => {
    try {
      const res = await fetch('/api/signals');
      if (!res.ok) return;
      const json = await res.json();
      const raw: Record<string, unknown>[] = json.signals ?? [];
      const normalized = raw.map(normalizeSignal);
      const oneHourAgo = Date.now() - 3600000;
      setHourCount(normalized.filter((s) => s.timestamp > oneHourAgo).length);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    nowRef.current = Date.now();
    setNow(nowRef.current);

    void fetchSignals();
    void fetchHourCount();

    // Table refreshes every 10s
    pollRef.current = setInterval(() => void fetchSignals(), 10_000);
    // Hour counter refreshes every 30s
    counterPollRef.current = setInterval(() => void fetchHourCount(), 30_000);
    // Clock tick every second
    tickRef.current = setInterval(() => {
      nowRef.current = Date.now();
      setNow(nowRef.current);
    }, 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (counterPollRef.current) clearInterval(counterPollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [fetchSignals, fetchHourCount]);

  /* Computed stats */
  const buyCount = signals.filter((s) => s.direction === 'BUY').length;
  const sellCount = signals.filter((s) => s.direction === 'SELL').length;
  const avgConfidence =
    signals.length > 0 ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length) : 0;
  const mostActivePair = signals.length > 0
    ? Object.entries(
        signals.reduce<Record<string, number>>((acc, s) => {
          acc[s.pair] = (acc[s.pair] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    : '—';

  const lastUpdatedSeconds = lastFetchedAt > 0 ? Math.floor((now - lastFetchedAt) / 1000) : 0;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tradeclaw.win';
  const iframeSnippet = `<iframe src="${baseUrl}/embed/live" width="400" height="120" frameborder="0" style="border:none;border-radius:12px"></iframe>`;
  const scriptSnippet = `<script src="${baseUrl}/api/widget/live"></script>`;
  const jsonSnippet = `// Fetch live signals via REST API\nconst resp = await fetch('${baseUrl}/api/live-feed');\nconst data = await resp.json();\n// data.signals — array of last 20 signals`;

  const tweetText = `Check out TradeClaw — free, self-hosted AI trading signals firing in real-time\n\n${baseUrl}/live`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  return (
    <div className="relative isolate min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <BackgroundDecor variant="minimal" />
      <PageNavBar />
      <main className="relative pb-24">
        {/* Marquee ticker */}
        <LiveActivityWidget apiUrl="/api/live-feed" refreshInterval={30000} height={48} />

      <div className="pt-12 px-4 md:px-6 max-w-5xl mx-auto">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <Radio className="w-3 h-3" />
              Connected
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Live Signal Activity Feed
          </h1>
          <p className="text-[var(--text-secondary)] text-sm max-w-xl">
            Watch TradeClaw analyze markets in real time. Embed this feed in your blog, newsletter, or site with one line of code.
          </p>
        </div>

        {/* Counter strip */}
        <div className="glass rounded-2xl p-4 border border-[var(--border)] mb-6 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-zinc-400" />
            <span className="text-2xl font-bold">{hourCount}</span>
            <span className="text-xs text-[var(--text-secondary)]">signals fired in last hour</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-2xl font-bold">{signals.length}</span>
            <span className="text-xs text-[var(--text-secondary)]">in feed</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Auto-refreshing</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="glass rounded-2xl p-4 border border-[var(--border)]">
            <div className="text-xs text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              BUY vs SELL
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-emerald-400">{buyCount}</span>
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${buyCount + sellCount > 0 ? (buyCount / (buyCount + sellCount)) * 100 : 50}%` }}
                />
              </div>
              <span className="text-lg font-bold text-rose-400">{sellCount}</span>
            </div>
          </div>
          <div className="glass rounded-2xl p-4 border border-[var(--border)]">
            <div className="text-xs text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Most Active Pair
            </div>
            <span className="text-lg font-bold">{mostActivePair}</span>
          </div>
          <div className="glass rounded-2xl p-4 border border-[var(--border)]">
            <div className="text-xs text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Avg Confidence
            </div>
            <span className="text-lg font-bold">{avgConfidence}%</span>
          </div>
        </div>

        {/* Share bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-400 hover:bg-sky-500/25 text-xs font-semibold transition-colors"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            Share on X
          </Link>
          <CopyButton text={`${baseUrl}/live`} label="Copy link" />
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Activity table — 3 cols */}
          <div className="md:col-span-3">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Signal Activity
            </h2>

            {signals.length === 0 && (
              <div className="text-center py-12 text-[var(--text-secondary)] text-sm">
                Loading signals&hellip;
              </div>
            )}

            {signals.length > 0 && (
              <>
                <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white/[0.02]">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        {['Time', 'Pair', 'Direction', 'Timeframe', 'Confidence', 'Entry', 'TP', 'SL'].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody
                      className="transition-opacity duration-300"
                      style={{ opacity: fadeIn ? 1 : 0.3 }}
                    >
                      {signals.map((sig) => (
                        <tr
                          key={sig.id}
                          className="border-b border-[var(--border)] last:border-b-0 hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="px-3 py-2 text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                            {timeAgo(sig.timestamp, now)}
                          </td>
                          <td className="px-3 py-2 text-sm font-bold whitespace-nowrap">{sig.pair}</td>
                          <td className="px-3 py-2">
                            <DirectionBadge direction={sig.direction} />
                          </td>
                          <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">{sig.timeframe}</td>
                          <td className="px-3 py-2 text-xs tabular-nums">{sig.confidence}%</td>
                          <td className="px-3 py-2 text-xs tabular-nums text-[var(--text-secondary)]">
                            {formatPrice(sig.entry)}
                          </td>
                          <td className="px-3 py-2 text-xs tabular-nums text-emerald-400">
                            {formatPrice(sig.tp)}
                          </td>
                          <td className="px-3 py-2 text-xs tabular-nums text-rose-400">
                            {formatPrice(sig.sl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Last updated indicator */}
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[var(--text-secondary)]">
                  <Clock className="w-3 h-3" />
                  Last updated {lastUpdatedSeconds}s ago
                </div>
              </>
            )}
          </div>

          {/* Embed panel — 2 cols */}
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold mb-3">Embed on Your Site</h2>
            <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-[var(--border)]">
                {(['embed', 'script', 'json'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                        : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {tab === 'embed' ? 'iFrame' : tab === 'script' ? 'Script' : 'JSON API'}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {activeTab === 'embed' && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-3">
                      Drop an iframe on any HTML page for a live signal marquee widget.
                    </p>
                    <div className="bg-black/40 rounded-lg p-3 mb-3 overflow-x-auto">
                      <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">
                        {iframeSnippet}
                      </pre>
                    </div>
                    <CopyButton text={iframeSnippet} />
                  </div>
                )}

                {activeTab === 'script' && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-3">
                      One script tag — renders a live signal ticker. Auto-refreshes every 30s.
                    </p>
                    <div className="bg-black/40 rounded-lg p-3 mb-3 overflow-x-auto">
                      <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">
                        {scriptSnippet}
                      </pre>
                    </div>
                    <CopyButton text={scriptSnippet} />
                  </div>
                )}

                {activeTab === 'json' && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-3">
                      Public REST API — fetch the last 20 signals. No API key needed. CORS enabled.
                    </p>
                    <div className="bg-black/40 rounded-lg p-3 mb-3 overflow-x-auto">
                      <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">
                        {jsonSnippet}
                      </pre>
                    </div>
                    <CopyButton text={jsonSnippet} />
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <Link
                    href="/embed/live"
                    target="_blank"
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors mb-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Preview live embed card
                  </Link>
                  <Link
                    href="/api-docs"
                    className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Full API docs
                  </Link>
                </div>
              </div>
            </div>

            {/* Star CTA */}
            <div className="glass rounded-2xl p-4 border border-zinc-500/20 bg-gradient-to-br from-zinc-500/5 to-transparent mt-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Star className="w-3.5 h-3.5 text-zinc-400 fill-zinc-400" />
                <span className="text-sm font-medium">Enjoying TradeClaw?</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                Open-source, no paywall. A star helps others discover this project.
              </p>
              <Link
                href="https://github.com/naimkatiman/tradeclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-500/20 border border-zinc-500/30 text-zinc-400 hover:bg-zinc-500/30 text-xs font-semibold transition-colors"
              >
                <Star className="w-3 h-3" />
                Star on GitHub
              </Link>
            </div>
          </div>
        </div>

        {/* Landing integration note */}
        <div className="mt-8 glass rounded-2xl p-5 border border-[var(--border)]">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-zinc-400" />
            Add to your landing page
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Embed the live signal stream directly in your site&apos;s hero section. Works with any framework.
          </p>
          <div className="grid md:grid-cols-3 gap-3 text-xs text-[var(--text-secondary)]">
            {[
              { name: 'WordPress', tip: 'Use Custom HTML block, paste the script tag' },
              { name: 'Ghost', tip: 'Add HTML card in post editor, paste iframe' },
              { name: 'Substack', tip: 'Use the HTML embed feature in settings' },
            ].map((item) => (
              <div key={item.name} className="bg-white/[0.03] rounded-xl p-3">
                <div className="font-medium text-[var(--foreground)] mb-0.5">{item.name}</div>
                <div>{item.tip}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
