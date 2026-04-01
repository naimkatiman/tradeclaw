'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Share2,
  Star,
  CheckCircle,
  BarChart2,
  Activity,
  Layers,
} from 'lucide-react';
import type { TradingPattern, PatternCategory, SignalDirection } from '../api/patterns/route';
import { PATTERNS } from '../api/patterns/route';

// ── SVG Pattern Diagrams ──────────────────────────────────────────────────────

function PatternSVG({ type, direction }: { type: string; direction: SignalDirection }) {
  const bullColor = '#10b981';
  const bearColor = '#f43f5e';
  const neutralColor = '#a1a1aa';
  const gridColor = '#27272a';
  const mainColor =
    direction === 'BUY' ? bullColor : direction === 'SELL' ? bearColor : neutralColor;

  const style = `
    @keyframes drawLine {
      from { stroke-dashoffset: 300; }
      to { stroke-dashoffset: 0; }
    }
    .draw { stroke-dasharray: 300; stroke-dashoffset: 300; animation: drawLine 1.5s ease forwards; }
    .draw2 { stroke-dasharray: 300; stroke-dashoffset: 300; animation: drawLine 1.5s ease 0.3s forwards; }
    .draw3 { stroke-dasharray: 300; stroke-dashoffset: 300; animation: drawLine 1.5s ease 0.6s forwards; }
  `;

  const base = (
    <rect width="100%" height="100%" fill="#18181b" rx="6" />
  );

  if (type === 'divergence') {
    return (
      <svg viewBox="0 0 80 56" width={80} height={56}>
        <style>{style}</style>
        {base}
        <line x1="0" y1="30" x2="80" y2="30" stroke={gridColor} strokeWidth="0.5" />
        {/* Price: lower lows */}
        <polyline className="draw" points="5,20 20,30 35,20 50,34 65,22 75,38"
          fill="none" stroke={bearColor} strokeWidth="1.5" />
        {/* RSI: higher lows (divergence) */}
        <polyline className="draw2" points="5,45 20,48 35,44 50,50 65,42 75,46"
          fill="none" stroke={bullColor} strokeWidth="1.5" strokeDasharray="3,2" />
        <text x="4" y="10" fontSize="4" fill={bearColor}>Price</text>
        <text x="4" y="54" fontSize="4" fill={bullColor}>RSI</text>
      </svg>
    );
  }

  if (type === 'macd-cross-bull') {
    return (
      <svg viewBox="0 0 80 56" width={80} height={56}>
        <style>{style}</style>
        {base}
        <line x1="0" y1="28" x2="80" y2="28" stroke={gridColor} strokeWidth="0.5" />
        <polyline className="draw" points="5,40 20,38 35,32 50,26 65,18 75,14"
          fill="none" stroke={bullColor} strokeWidth="1.5" />
        <polyline className="draw2" points="5,44 20,42 35,36 50,30 65,24 75,20"
          fill="none" stroke={neutralColor} strokeWidth="1.5" strokeDasharray="3,2" />
        <circle cx="42" cy="29" r="3" fill={bullColor} opacity="0.9" />
        <text x="4" y="10" fontSize="4" fill={bullColor}>MACD</text>
        <text x="44" y="26" fontSize="4" fill={bullColor}>✕</text>
      </svg>
    );
  }

  if (type === 'macd-cross-bear') {
    return (
      <svg viewBox="0 0 80 56" width={80} height={56}>
        <style>{style}</style>
        {base}
        <line x1="0" y1="28" x2="80" y2="28" stroke={gridColor} strokeWidth="0.5" />
        <polyline className="draw" points="5,14 20,18 35,24 50,32 65,40 75,44"
          fill="none" stroke={bearColor} strokeWidth="1.5" />
        <polyline className="draw2" points="5,10 20,14 35,20 50,26 65,34 75,38"
          fill="none" stroke={neutralColor} strokeWidth="1.5" strokeDasharray="3,2" />
        <circle cx="42" cy="29" r="3" fill={bearColor} opacity="0.9" />
        <text x="4" y="10" fontSize="4" fill={bearColor}>MACD</text>
      </svg>
    );
  }

  if (type === 'ema-cross') {
    return (
      <svg viewBox="0 0 80 56" width={80} height={56}>
        <style>{style}</style>
        {base}
        <polyline className="draw" points="5,42 20,38 35,30 50,22 65,16 75,12"
          fill="none" stroke={bullColor} strokeWidth="1.5" />
        <polyline className="draw2" points="5,48 20,44 35,38 50,32 65,28 75,26"
          fill="none" stroke={neutralColor} strokeWidth="1.5" strokeDasharray="4,2" />
        <circle cx="38" cy="34" r="3" fill={bullColor} opacity="0.9" />
        <text x="4" y="10" fontSize="4" fill={bullColor}>EMA20</text>
        <text x="42" y="54" fontSize="4" fill={neutralColor}>EMA50</text>
      </svg>
    );
  }

  if (type === 'head-shoulders') {
    return (
      <svg viewBox="0 0 80 56" width={80} height={56}>
        <style>{style}</style>
        {base}
        {/* Neckline */}
        <line x1="10" y1="40" x2="70" y2="40" stroke={neutralColor} strokeWidth="0.8" strokeDasharray="3,2" />
        {/* L shoulder */}
        <polyline className="draw" points="5,40 15,26 22,36"
          fill="none" stroke={bearColor} strokeWidth="1.5" />
        {/* Head */}
        <polyline className="draw2" points="22,36 35,12 48,36"
          fill="none" stroke={bearColor} strokeWidth="1.5" />
        {/* R shoulder */}
        <polyline className="draw3" points="48,36 58,28 65,40 72,42"
          fill="none" stroke={bearColor} strokeWidth="1.5" />
        <text x="32" y="10" fontSize="4" fill={bearColor}>HEAD</text>
        <text x="44" y="52" fontSize="4" fill={neutralColor}>Neckline</text>
      </svg>
    );
  }

  if (type === 'double-bottom') {
    return (
      <svg viewBox="0 0 80 56" width={80} height={56}>
        <style>{style}</style>
        {base}
        <line x1="10" y1="26" x2="68" y2="26" stroke={neutralColor} strokeWidth="0.8" strokeDasharray="3,2" />
        <polyline className="draw" points="5,14 18,44 30,26 50,44 65,14"
          fill="none" stroke={bullColor} strokeWidth="1.5" />
        <text x="30" y="54" fontSize="4" fill={neutralColor}>Neckline</text>
        <text x="6" y="10" fontSize="4" fill={bullColor}>↑ BUY</text>
      </svg>
    );
  }

  if (type === 'double-top') {
    return (
      <svg viewBox="0 0 80 56" width={80} height={56}>
        <style>{style}</style>
        {base}
        <line x1="10" y1="30" x2="68" y2="30" stroke={neutralColor} strokeWidth="0.8" strokeDasharray="3,2" />
        <polyline className="draw" points="5,44 18,12 30,30 50,12 65,44"
          fill="none" stroke={bearColor} strokeWidth="1.5" />
        <text x="30" y="10" fontSize="4" fill={neutralColor}>Neckline</text>
        <text x="6" y="54" fontSize="4" fill={bearColor}>↓ SELL</text>
      </svg>
    );
  }

  if (type === 'bb-squeeze') {
    return (
      <svg viewBox="0 0 80 56" width={80} height={56}>
        <style>{style}</style>
        {base}
        {/* Upper band */}
        <polyline className="draw" points="5,10 25,14 42,22 52,20 65,10 75,8"
          fill="none" stroke={neutralColor} strokeWidth="1" strokeDasharray="2,2" />
        {/* Lower band */}
        <polyline className="draw" points="5,46 25,42 42,34 52,36 65,46 75,48"
          fill="none" stroke={neutralColor} strokeWidth="1" strokeDasharray="2,2" />
        {/* Price */}
        <polyline className="draw2" points="5,28 25,28 42,28 52,28 65,28 75,18"
          fill="none" stroke={mainColor} strokeWidth="1.5" />
        <text x="38" y="10" fontSize="4" fill={mainColor}>Squeeze →</text>
      </svg>
    );
  }

  if (type === 'rsi-oversold') {
    return (
      <svg viewBox="0 0 80 56" width={80} height={56}>
        <style>{style}</style>
        {base}
        <line x1="0" y1="42" x2="80" y2="42" stroke={bearColor} strokeWidth="0.6" strokeDasharray="2,2" />
        <line x1="0" y1="14" x2="80" y2="14" stroke={bullColor} strokeWidth="0.6" strokeDasharray="2,2" />
        <polyline className="draw" points="5,20 20,32 35,44 40,50 50,46 62,34 72,22"
          fill="none" stroke={bullColor} strokeWidth="1.5" />
        <text x="2" y="12" fontSize="4" fill={bullColor}>70</text>
        <text x="2" y="44" fontSize="4" fill={bearColor}>30</text>
        <circle cx="42" cy="49" r="2.5" fill={bearColor} />
        <text x="44" y="52" fontSize="4" fill={bullColor}>↑</text>
      </svg>
    );
  }

  if (type === 'rsi-overbought') {
    return (
      <svg viewBox="0 0 80 56" width={80} height={56}>
        <style>{style}</style>
        {base}
        <line x1="0" y1="42" x2="80" y2="42" stroke={bearColor} strokeWidth="0.6" strokeDasharray="2,2" />
        <line x1="0" y1="14" x2="80" y2="14" stroke={bullColor} strokeWidth="0.6" strokeDasharray="2,2" />
        <polyline className="draw" points="5,36 20,24 35,12 40,8 50,12 62,22 72,36"
          fill="none" stroke={bearColor} strokeWidth="1.5" />
        <text x="2" y="12" fontSize="4" fill={bullColor}>70</text>
        <text x="2" y="44" fontSize="4" fill={bearColor}>30</text>
        <circle cx="42" cy="7" r="2.5" fill={bullColor} />
        <text x="44" y="12" fontSize="4" fill={bearColor}>↓</text>
      </svg>
    );
  }

  if (type === 'stochastic') {
    return (
      <svg viewBox="0 0 80 56" width={80} height={56}>
        <style>{style}</style>
        {base}
        <line x1="0" y1="14" x2="80" y2="14" stroke={neutralColor} strokeWidth="0.6" strokeDasharray="2,2" />
        <line x1="0" y1="42" x2="80" y2="42" stroke={neutralColor} strokeWidth="0.6" strokeDasharray="2,2" />
        {/* %K fast */}
        <polyline className="draw" points="5,10 20,28 35,46 45,50 55,38 65,20 75,14"
          fill="none" stroke={bullColor} strokeWidth="1.5" />
        {/* %D slow */}
        <polyline className="draw2" points="5,14 20,34 35,48 45,48 55,40 65,24 75,18"
          fill="none" stroke={neutralColor} strokeWidth="1.2" strokeDasharray="3,2" />
        <text x="2" y="12" fontSize="4" fill={neutralColor}>80</text>
        <text x="2" y="44" fontSize="4" fill={neutralColor}>20</text>
      </svg>
    );
  }

  if (type === 'breakout') {
    return (
      <svg viewBox="0 0 80 56" width={80} height={56}>
        <style>{style}</style>
        {base}
        {/* Resistance line */}
        <line x1="5" y1="24" x2="55" y2="24" stroke={neutralColor} strokeWidth="1" strokeDasharray="3,2" />
        {/* Price consolidation */}
        <polyline className="draw" points="5,36 15,30 20,34 28,28 34,32 40,26 46,30 52,26"
          fill="none" stroke={neutralColor} strokeWidth="1.2" />
        {/* Breakout */}
        <polyline className="draw2" points="52,26 58,20 65,14 72,8"
          fill="none" stroke={mainColor} strokeWidth="2" />
        <circle cx="56" cy="21" r="2.5" fill={mainColor} />
        <text x="56" y="10" fontSize="4" fill={mainColor}>BREAK</text>
      </svg>
    );
  }

  // Fallback
  return (
    <svg viewBox="0 0 80 56" width={80} height={56}>
      <style>{style}</style>
      {base}
      <polyline className="draw" points="5,40 20,32 35,20 50,28 65,15 75,20"
        fill="none" stroke={mainColor} strokeWidth="1.5" />
    </svg>
  );
}

// ── Direction Badge ────────────────────────────────────────────────────────────

function DirectionBadge({ dir }: { dir: SignalDirection }) {
  if (dir === 'BUY') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-0.5">
        <TrendingUp size={10} /> BUY
      </span>
    );
  }
  if (dir === 'SELL') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded px-2 py-0.5">
        <TrendingDown size={10} /> SELL
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-zinc-400 bg-zinc-700/50 border border-zinc-600/40 rounded px-2 py-0.5">
      <ArrowUpDown size={10} /> EITHER
    </span>
  );
}

// ── Category Badge ─────────────────────────────────────────────────────────────

const CAT_STYLES: Record<PatternCategory, string> = {
  Candlestick: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Indicator: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'Price Action': 'bg-sky-500/10 text-sky-400 border-sky-500/30',
};

function CategoryBadge({ cat }: { cat: PatternCategory }) {
  return (
    <span className={`text-xs font-medium border rounded px-2 py-0.5 ${CAT_STYLES[cat]}`}>
      {cat}
    </span>
  );
}

// ── Reliability Bar ────────────────────────────────────────────────────────────

function ReliabilityBar({ score }: { score: number }) {
  const color =
    score >= 72 ? 'bg-emerald-500' : score >= 67 ? 'bg-amber-500' : 'bg-zinc-500';
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400">
      <span className="w-16 shrink-0">Reliability</span>
      <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-8 text-right font-mono">{score}%</span>
    </div>
  );
}

// ── Pattern Card ───────────────────────────────────────────────────────────────

function PatternCard({ pattern }: { pattern: TradingPattern }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const tweet = encodeURIComponent(
    `📊 ${pattern.name} — ${pattern.reliability}% reliable ${pattern.direction === 'BUY' ? '🟢' : pattern.direction === 'SELL' ? '🔴' : '🟡'} signal pattern\n\n${pattern.shortDesc}\n\nLearn more: https://tradeclaw.win/patterns\n\n#TradeClaw #Trading #TechnicalAnalysis`
  );

  function handleCopy() {
    navigator.clipboard.writeText(`https://tradeclaw.win/patterns#${pattern.id}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      id={pattern.id}
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
    >
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* SVG diagram */}
          <div className="shrink-0 rounded-lg overflow-hidden border border-zinc-800">
            <PatternSVG type={pattern.svgType} direction={pattern.direction} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <CategoryBadge cat={pattern.category} />
              <DirectionBadge dir={pattern.direction} />
              {pattern.tradeClawDetects && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                  <CheckCircle size={9} />
                  <span>Auto-detected</span>
                </span>
              )}
            </div>
            <h3 className="font-semibold text-white text-sm leading-tight mb-1">{pattern.name}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{pattern.shortDesc}</p>
          </div>
        </div>

        {/* Reliability bar */}
        <div className="mt-3">
          <ReliabilityBar score={pattern.reliability} />
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800 pt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-zinc-300 mb-1">About this pattern</p>
            <p className="text-xs text-zinc-400 leading-relaxed">{pattern.fullDesc}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-300 mb-1">How to trade it</p>
            <p className="text-xs text-zinc-400 leading-relaxed">{pattern.howToTrade}</p>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="px-4 py-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Less' : 'Learn more'}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy link'}
          </button>
          <a
            href={`https://twitter.com/intent/tweet?text=${tweet}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-sky-400 transition-colors"
          >
            <Share2 size={11} />
            Share
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

type FilterType = 'All' | PatternCategory;

const FILTERS: FilterType[] = ['All', 'Indicator', 'Price Action', 'Candlestick'];

const FILTER_ICONS: Record<FilterType, React.ReactNode> = {
  All: <Layers size={14} />,
  Indicator: <Activity size={14} />,
  'Price Action': <TrendingUp size={14} />,
  Candlestick: <BarChart2 size={14} />,
};

export default function PatternsClient() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [dirFilter, setDirFilter] = useState<'All' | SignalDirection>('All');

  const filtered = PATTERNS.filter((p) => {
    if (activeFilter !== 'All' && p.category !== activeFilter) return false;
    if (dirFilter !== 'All' && p.direction !== dirFilter) return false;
    return true;
  });

  const detectedCount = PATTERNS.filter((p) => p.tradeClawDetects).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            <BookOpen size={12} />
            Pattern Library
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Trading Pattern Library
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
            {PATTERNS.length} classic technical patterns with animated diagrams, reliability scores,
            and trade setup guides.{' '}
            <span className="text-emerald-400 font-medium">{detectedCount} auto-detected</span> by
            TradeClaw.
          </p>

          {/* Quick stats */}
          <div className="flex justify-center gap-6 mt-5 text-sm">
            {[
              { label: 'Total Patterns', value: PATTERNS.length },
              { label: 'Auto-Detected', value: detectedCount },
              { label: 'Avg Reliability', value: `${Math.round(PATTERNS.reduce((a, p) => a + p.reliability, 0) / PATTERNS.length)}%` },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-zinc-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {/* Category filter */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeFilter === f
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {FILTER_ICONS[f]}
                {f}
              </button>
            ))}
          </div>

          {/* Direction filter */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {(['All', 'BUY', 'SELL', 'EITHER'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDirFilter(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  dirFilter === d
                    ? d === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : d === 'SELL'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-zinc-700/50 text-zinc-300'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <span className="text-xs text-zinc-500 ml-auto">
            {filtered.length} of {PATTERNS.length} patterns
          </span>
        </div>

        {/* Pattern grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            No patterns match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <PatternCard key={p.id} pattern={p} />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star size={16} className="text-amber-400 fill-amber-400" />
            <span className="text-sm font-semibold text-white">Like what you see?</span>
          </div>
          <p className="text-xs text-zinc-400 mb-4">
            TradeClaw detects {detectedCount} of these patterns automatically in live markets.
            Self-host it free — no subscription needed.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <Star size={14} className="fill-black" />
              Star on GitHub
            </a>
            <Link
              href="/signals"
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg transition-colors border border-zinc-700"
            >
              <Activity size={14} />
              Live Signals
            </Link>
            <Link
              href="/explain"
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg transition-colors border border-zinc-700"
            >
              <BookOpen size={14} />
              AI Explanation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
