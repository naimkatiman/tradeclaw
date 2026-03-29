'use client';

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';

const SYMBOLS = [
  'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'XRPUSD',
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD',
  'NZDUSD', 'USDCHF',
];

const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'];

interface ExplainResult {
  markdown: string;
  summary: string;
  confluenceScore: number;
  riskReward: { tp1: string; tp2: string; tp3: string };
  timestamp: number;
  symbol: string;
  timeframe: string;
}

function renderInline(text: string): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = [];
  let remaining = text;
  let ki = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
      parts.push(<strong key={`b-${ki++}`} className="text-white font-semibold">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }
    parts.push(remaining);
    break;
  }
  return parts;
}

function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const elements: React.ReactElement[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableKey = 0;
  let blockquote: string[] = [];

  function flushTable() {
    if (tableRows.length === 0) return;
    const headers = tableRows[0];
    const body = tableRows.slice(2);
    elements.push(
      <div key={`t-${tableKey++}`} className="overflow-x-auto my-3">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-white/10">
              {headers.map((h, i) => (
                <th key={i} className="text-left py-1.5 px-2 text-zinc-500 font-medium text-[10px] uppercase tracking-wider">
                  {renderInline(h.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="border-b border-white/[0.03]">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-1.5 px-2 text-zinc-300 tabular-nums">
                    {renderInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  }

  function flushBlockquote() {
    if (blockquote.length === 0) return;
    elements.push(
      <div key={`bq-${elements.length}`} className="my-3 pl-3 border-l-2 border-emerald-500/30 bg-emerald-500/[0.03] rounded-r-lg py-2 pr-3">
        <p className="text-xs text-zinc-300 leading-relaxed">{renderInline(blockquote.join(' '))}</p>
      </div>
    );
    blockquote = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) { flushBlockquote(); inTable = true; }
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cells.every(c => /^[\s-:]+$/.test(c))) { tableRows.push(cells); continue; }
      tableRows.push(cells);
      continue;
    } else if (inTable) { flushTable(); }

    if (line.startsWith('> ')) { blockquote.push(line.slice(2)); continue; }
    else if (blockquote.length > 0) { flushBlockquote(); }

    if (/^---+$/.test(line.trim())) { elements.push(<hr key={`hr-${i}`} className="my-4 border-white/[0.06]" />); continue; }
    if (line.startsWith('## ') && elements.length === 0) continue;
    if (line.startsWith('## ')) { elements.push(<h2 key={`h2-${i}`} className="text-base font-semibold text-white mt-6 mb-2">{renderInline(line.slice(3))}</h2>); continue; }
    if (line.startsWith('### ')) { elements.push(<h3 key={`h3-${i}`} className="text-sm font-semibold text-white mt-5 mb-2">{renderInline(line.slice(4))}</h3>); continue; }

    const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) { elements.push(<div key={`li-${i}`} className="flex gap-2 my-1 pl-1"><span className="text-zinc-600 text-xs font-mono shrink-0">{numMatch[1]}.</span><p className="text-xs text-zinc-400 leading-relaxed">{renderInline(numMatch[2])}</p></div>); continue; }
    if (line.startsWith('✅') || line.startsWith('⚠️')) { elements.push(<p key={`ck-${i}`} className="text-xs text-zinc-400 leading-relaxed my-1">{renderInline(line)}</p>); continue; }
    if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) { elements.push(<p key={`em-${i}`} className="text-[10px] text-zinc-700 mt-4 font-mono">{line.replace(/^\*|\*$/g, '')}</p>); continue; }
    if (line.trim() === '') continue;
    elements.push(<p key={`p-${i}`} className="text-xs text-zinc-400 leading-relaxed my-1.5">{renderInline(line)}</p>);
  }

  if (inTable) flushTable();
  if (blockquote.length > 0) flushBlockquote();
  return elements;
}

export function ExplainClient() {
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<ExplainResult[]>([]);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symbol, timeframe }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setResult(null);
      } else {
        const r: ExplainResult = {
          markdown: data.markdown,
          summary: data.summary,
          confluenceScore: data.confluenceScore,
          riskReward: data.riskReward,
          timestamp: Date.now(),
          symbol,
          timeframe,
        };
        setResult(r);
        setHistory(prev => [r, ...prev.filter(h => !(h.symbol === symbol && h.timeframe === timeframe))].slice(0, 10));
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } catch {
      setError('Failed to load analysis. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  const loadFromHistory = useCallback((h: ExplainResult) => {
    setSymbol(h.symbol);
    setTimeframe(h.timeframe);
    setResult(h);
  }, []);

  const copyMarkdown = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 2v10M3 7l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-semibold">Trade<span className="text-emerald-400">Claw</span></span>
          </Link>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">Dashboard</Link>
            <Link href="/signals" className="hover:text-zinc-300 transition-colors">Signals</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10 pb-20 md:pb-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Signal Analysis</h1>
              <p className="text-xs text-zinc-600 mt-0.5">Select any asset and timeframe for instant AI-powered analysis</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-card rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Symbol selector */}
            <div className="flex-1">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-2">Asset</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {SYMBOLS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSymbol(s)}
                    className={`px-2 py-2 rounded-lg text-[11px] font-mono font-medium transition-all ${
                      symbol === s
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/[0.03] text-zinc-500 border border-white/5 hover:text-zinc-300 hover:border-white/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeframe selector */}
            <div className="sm:w-32">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-2">Timeframe</label>
              <div className="flex sm:flex-col gap-1.5">
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-mono font-medium transition-all ${
                      timeframe === tf
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/[0.03] text-zinc-500 border border-white/5 hover:text-zinc-300 hover:border-white/10'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Analyze button */}
          <button
            onClick={analyze}
            disabled={loading}
            className="w-full mt-4 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50
              bg-emerald-500/15 text-emerald-400 border border-emerald-500/30
              hover:bg-emerald-500/25 hover:border-emerald-500/50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-emerald-800 border-t-emerald-400 rounded-full animate-spin" />
                Analyzing {symbol} {timeframe}...
              </span>
            ) : (
              `Analyze ${symbol} · ${timeframe}`
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="glass-card rounded-2xl p-4 mb-6 border-red-500/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div ref={resultRef} className="glass-card rounded-2xl p-5 mb-6">
            {/* Summary header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white">{result.summary}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    result.confluenceScore >= 4 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/15'
                    : result.confluenceScore >= 3 ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/15'
                    : 'text-red-400 bg-red-500/10 border border-red-500/15'
                  }`}>
                    {result.confluenceScore}/5 confluence
                  </span>
                  <span className="text-[10px] text-zinc-700 font-mono">
                    R:R {result.riskReward.tp1} / {result.riskReward.tp2} / {result.riskReward.tp3}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:border-white/10 transition-all"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Rendered analysis */}
            <div className="prose-invert max-w-none">
              {renderMarkdown(result.markdown)}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-[11px] text-zinc-600 uppercase tracking-wider mb-3">Recent Analyses</h3>
            <div className="space-y-2">
<<<<<<< HEAD
              {history.map((h, i) => (
=======
              {history.map((h) => (
>>>>>>> origin/main
                <button
                  key={`${h.symbol}-${h.timeframe}-${h.timestamp}`}
                  onClick={() => loadFromHistory(h)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                    result && result.symbol === h.symbol && result.timeframe === h.timeframe && result.timestamp === h.timestamp
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-white'
                      : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold">{h.symbol}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">{h.timeframe}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      h.confluenceScore >= 4 ? 'text-emerald-400 bg-emerald-500/10'
                      : h.confluenceScore >= 3 ? 'text-yellow-400 bg-yellow-500/10'
                      : 'text-red-400 bg-red-500/10'
                    }`}>
                      {h.confluenceScore}/5
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-700 font-mono">
                    {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/dashboard" className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors">
            View All Signals →
          </Link>
        </div>
      </div>

      <footer className="pb-8 text-center">
        <p className="text-xs text-zinc-800 font-mono">TradeClaw Signal Scanner · Open Source · Self-Hosted</p>
        <p className="text-xs text-zinc-800 mt-1">Signal analysis is for educational purposes only. Not financial advice.</p>
      </footer>
    </div>
  );
}
