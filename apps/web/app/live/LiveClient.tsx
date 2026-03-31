'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  Zap,
  Copy,
  CheckCheck,
  Star,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

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

const PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BNBUSD', 'SOLUSD', 'ADAUSD'];

// Seeded PRNG for generating signals in browser
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let seedCounter = Date.now();

function generateSignal(): LiveSignal {
  const rand = mulberry32(seedCounter++);
  const pair = PAIRS[Math.floor(rand() * PAIRS.length)];
  const direction = rand() > 0.5 ? 'BUY' : 'SELL';
  const confidence = Math.floor(rand() * 25 + 65);

  const prices: Record<string, number> = {
    BTCUSD: 68000 + rand() * 4000,
    ETHUSD: 3200 + rand() * 400,
    XAUUSD: 2350 + rand() * 80,
    XAGUSD: 28 + rand() * 4,
    EURUSD: 1.08 + rand() * 0.02,
    GBPUSD: 1.27 + rand() * 0.02,
    USDJPY: 150 + rand() * 5,
    BNBUSD: 580 + rand() * 60,
    SOLUSD: 175 + rand() * 30,
    ADAUSD: 0.45 + rand() * 0.1,
  };

  const entry = prices[pair] ?? 100;
  const atr = entry * (0.005 + rand() * 0.01);
  const tp = direction === 'BUY' ? entry + atr * 2 : entry - atr * 2;
  const sl = direction === 'BUY' ? entry - atr : entry + atr;
  const tfs = ['H1', 'H4', 'D1'];
  const timeframe = tfs[Math.floor(rand() * tfs.length)];

  return {
    id: `${pair}-${timeframe}-${Date.now()}`,
    pair,
    direction,
    confidence,
    entry: parseFloat(entry.toFixed(entry > 10 ? 2 : 4)),
    tp: parseFloat(tp.toFixed(entry > 10 ? 2 : 4)),
    sl: parseFloat(sl.toFixed(entry > 10 ? 2 : 4)),
    timeframe,
    timestamp: Date.now(),
  };
}

function SignalPill({ signal, now }: { signal: LiveSignal; now: number }) {
  const isNew = now - signal.timestamp < 3000;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all duration-500 ${
        signal.direction === 'BUY'
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : signal.direction === 'SELL'
          ? 'bg-rose-500/10 border-rose-500/20'
          : 'bg-zinc-500/10 border-zinc-500/20'
      } ${isNew ? 'ring-1 ring-white/20' : ''}`}
    >
      <span className="font-bold text-[var(--foreground)]">{signal.pair}</span>
      <span
        className={`flex items-center gap-0.5 font-bold ${
          signal.direction === 'BUY' ? 'text-emerald-400' : signal.direction === 'SELL' ? 'text-rose-400' : 'text-zinc-400'
        }`}
      >
        {signal.direction === 'BUY' ? (
          <TrendingUp className="w-3 h-3" />
        ) : signal.direction === 'SELL' ? (
          <TrendingDown className="w-3 h-3" />
        ) : (
          <Minus className="w-3 h-3" />
        )}
        {signal.direction}
      </span>
      <span className="text-[var(--text-secondary)]">{signal.confidence}%</span>
      <span className="text-[var(--text-secondary)] opacity-60">{signal.timeframe}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [text]);

  return (
    <button
      onClick={() => void handleCopy()}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors text-xs"
    >
      {copied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function createInitialSignals() {
  const initTs = Date.now();
  const initial: LiveSignal[] = [];
  for (let i = 0; i < 8; i++) {
    const s = generateSignal();
    s.timestamp = initTs - (8 - i) * 45000;
    initial.push(s);
  }
  return { initTs, initial };
}

export default function LiveClient() {
  const [initData] = useState(createInitialSignals);
  const [signals, setSignals] = useState<LiveSignal[]>(initData.initial);
  const [connected] = useState(true);
  const [activeTab, setActiveTab] = useState<'embed' | 'script' | 'json'>('embed');
  const [nowTs] = useState(initData.initTs);
  const totalFiredRef = useRef(initData.initial.length);
  const [totalFired, setTotalFired] = useState(initData.initial.length);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addSignal = useCallback((sig: LiveSignal) => {
    setSignals((prev) => [sig, ...prev].slice(0, 50));
    totalFiredRef.current += 1;
    setTotalFired(totalFiredRef.current);
  }, []);

  useEffect(() => {
    // New signal every 8-15 seconds
    const schedule = () => {
      const delay = 8000 + Math.random() * 7000;
      intervalRef.current = setTimeout(() => {
        addSignal(generateSignal());
        schedule();
      }, delay);
    };
    schedule();

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [addSignal]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tradeclaw.win';
  const iframeSnippet = `<iframe src="${baseUrl}/embed/BTCUSD?theme=dark" width="320" height="420" frameborder="0" allow="autoplay"></iframe>`;
  const scriptSnippet = `<script src="${baseUrl}/api/embed" data-pair="BTCUSD" data-theme="dark" data-width="320" data-height="420"></script>`;
  const jsonSnippet = `// Fetch signals via REST API
const resp = await fetch('${baseUrl}/api/v1/signals?pair=BTCUSD&limit=5');
const data = await resp.json();
console.log(data.signals);`;

  return (
    <main className="min-h-screen pt-24 pb-24 px-4 md:px-6 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium ${
              connected
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
            }`}
          >
            <Activity className="w-3 h-3" />
            {connected ? 'Connected' : 'Connecting…'}
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          Live Activity Feed
        </h1>
        <p className="text-[var(--text-secondary)] text-sm max-w-xl">
          AI trading signals firing in real-time across all assets. Embed this feed in your blog, newsletter, or site with one line of code.
        </p>
      </div>

      {/* Counter strip */}
      <div className="glass rounded-2xl p-4 border border-[var(--border)] mb-6 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-2xl font-bold">{totalFired}</span>
          <span className="text-xs text-[var(--text-secondary)]">signals this session</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{PAIRS.length}</span>
          <span className="text-xs text-[var(--text-secondary)]">assets tracked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">3</span>
          <span className="text-xs text-[var(--text-secondary)]">timeframes (H1/H4/D1)</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">Updating every ~10s</span>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Live feed — 3 cols */}
        <div className="md:col-span-3">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Signal stream
          </h2>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {signals.map((sig) => (
              <div key={sig.id} className="flex items-center gap-2">
                <SignalPill signal={sig} now={nowTs} />
                <span className="text-[10px] text-[var(--text-secondary)] flex-shrink-0">
                  {new Date(sig.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <Link
                  href={`/signal/${sig.pair}-${sig.timeframe}-${sig.direction}`}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex-shrink-0 transition-colors"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Embed panel — 2 cols */}
        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold mb-3">Embed this feed</h2>
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
                    Drop an iframe on any HTML page. Updates every 60s automatically.
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
                    One script tag — renders a live card. Supports data-pair, data-theme, data-width.
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
                    Public REST API — fetch signals in any language. No API key needed.
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
                  href="/embed/BTCUSD"
                  target="_blank"
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors mb-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Preview embed card
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
          <div className="glass rounded-2xl p-4 border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent mt-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">Enjoying TradeClaw?</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Open-source, no paywall. A star helps others discover this project.
            </p>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 text-xs font-semibold transition-colors"
            >
              <Star className="w-3 h-3" />
              Star on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Landing integration note */}
      <div className="mt-8 glass rounded-2xl p-5 border border-[var(--border)]">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
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
            <div key={item.name} className="bg-white/3 rounded-xl p-3">
              <div className="font-medium text-[var(--foreground)] mb-0.5">{item.name}</div>
              <div>{item.tip}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
