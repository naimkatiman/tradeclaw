'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ClipboardCopy, CheckCircle, ExternalLink, TrendingUp, BarChart3, Code2, Download } from 'lucide-react';
import type { ProofResponse, ProofStats } from '../api/proof/route';
import { generateTradeClawPineScript } from '../../lib/tv-pine-export';

function formatTvPost(stats: ProofStats): string {
  const lines: string[] = [];
  lines.push('📊 TradeClaw Verified Signal Track Record');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(`Total Signals Emitted: ${stats.totalSignals}`);
  lines.push(`Real (Non-Simulated):  ${stats.realSignals}`);
  lines.push(`Resolved:              ${stats.resolvedSignals}`);
  lines.push(`Open:                  ${stats.openSignals}`);
  lines.push('');
  lines.push('Performance (24h outcomes)');
  lines.push(`  Win Rate:    ${stats.winRate24h}%`);
  lines.push(`  Wins/Losses: ${stats.totalWins} / ${stats.totalLosses}`);
  lines.push(`  Avg P&L:     ${stats.runningPnlPct >= 0 ? '+' : ''}${stats.runningPnlPct}%`);
  lines.push(`  Avg Confidence: ${stats.avgConfidence}%`);
  lines.push('');
  lines.push('All outcomes verified by live candle resolution.');
  lines.push('No cherry-picking. No hidden losses.');
  lines.push('');
  lines.push('🔗 tradeclaw.win/track-record');
  lines.push('');
  lines.push('#TradeClaw #TradingSignals #AITrading #VerifiedTrackRecord');
  return lines.join('\n');
}

export function TradingViewExportClient() {
  const [data, setData] = useState<ProofResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pineCopied, setPineCopied] = useState(false);

  useEffect(() => {
    fetch('/api/proof')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json as ProofResponse);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setLoading(false);
      });
  }, []);

  const handleCopy = useCallback(() => {
    if (!data) return;
    const text = formatTvPost(data.stats);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

  const pineScript = data ? generateTradeClawPineScript(data.stats) : generateTradeClawPineScript();

  const handleCopyPine = useCallback(() => {
    navigator.clipboard.writeText(pineScript).then(() => {
      setPineCopied(true);
      setTimeout(() => setPineCopied(false), 2000);
    });
  }, [pineScript]);

  const handleDownloadPine = useCallback(() => {
    const blob = new Blob([pineScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tradeclaw-signal-engine.pine';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [pineScript]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 mb-4">
            <BarChart3 className="w-3.5 h-3.5" />
            TradingView Integration
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Export Track Record for TradingView
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Copy TradeClaw&apos;s verified signal performance formatted for TradingView ideas
            and profile posts. Publish transparent proof with one click.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">Formatted for TradingView</span>
            </div>
            <button
              onClick={handleCopy}
              disabled={!data || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition disabled:opacity-40"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  Copy Text
                </>
              )}
            </button>
          </div>

          <div className="p-5">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-rose-400 text-sm">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 text-xs text-zinc-400 hover:text-white transition"
                >
                  Retry
                </button>
              </div>
            )}

            {data && (
              <div className="space-y-4">
                <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300 bg-black/30 rounded-xl p-4 border border-white/5 leading-relaxed">
                  {formatTvPost(data.stats)}
                </pre>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatPill label="Win Rate (24h)" value={`${data.stats.winRate24h}%`} />
                  <StatPill label="Total Signals" value={`${data.stats.totalSignals}`} />
                  <StatPill label="Resolved" value={`${data.stats.resolvedSignals}`} />
                  <StatPill label="Avg P&L" value={`${data.stats.runningPnlPct >= 0 ? '+' : ''}${data.stats.runningPnlPct}%`} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pine Script Export */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">TradingView Pine Script Indicator</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyPine}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition disabled:opacity-40"
              >
                {pineCopied ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="w-3.5 h-3.5" />
                    Copy Pine
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadPine}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-500/10 text-zinc-300 border border-zinc-500/20 hover:bg-zinc-500/20 transition disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                Download .pine
              </button>
            </div>
          </div>

          <div className="p-5">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {data && (
              <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-300 bg-black/30 rounded-xl p-4 border border-white/5 leading-relaxed max-h-96 overflow-y-auto">
                {pineScript}
              </pre>
            )}

            <p className="mt-3 text-xs text-zinc-500">
              Paste this into Pine Editor on TradingView to overlay TradeClaw signals on any chart.
              Includes RSI, MACD, EMA, Bollinger Bands, and Stochastic with the same weights used by
              the TradeClaw engine.
            </p>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-500">
          <Link
            href="/track-record"
            className="inline-flex items-center gap-1 hover:text-emerald-400 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Full Track Record
          </Link>
          <span className="hidden md:inline">·</span>
          <Link
            href="/proof"
            className="inline-flex items-center gap-1 hover:text-emerald-400 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Proof Surface
          </Link>
          <span className="hidden md:inline">·</span>
          <Link
            href="/vs-tradingview"
            className="inline-flex items-center gap-1 hover:text-emerald-400 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            vs TradingView
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center">
      <div className="text-xs text-zinc-500 mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
