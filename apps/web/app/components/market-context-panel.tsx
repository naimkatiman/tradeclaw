'use client';

import { useEffect, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SentimentData {
  current: {
    value: number;
    label: string;
    bias: 'bullish' | 'bearish' | 'neutral';
    description: string;
    timestamp: number;
    source: string;
  };
}

interface OnChainData {
  mempoolSize: number;
  feeEstimate: { fast: number; medium: number; slow: number };
  blockHeight: number;
  timestamp: number;
  source: string;
}

interface DeFiData {
  tvl: { total: number; chains: Array<{ name: string; tvl: number }> } | null;
  topProtocols: Array<{ name: string; tvl: number; change24h: number; category: string }>;
}

interface MarketContext {
  sentiment: SentimentData | null;
  onchain: OnChainData | null;
  defi: DeFiData | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTVL(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

function formatNumber(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

// ─── Sentiment Gauge ────────────────────────────────────────────────────────

function SentimentGauge({ value, label, bias }: { value: number; label: string; bias: 'bullish' | 'bearish' | 'neutral' }) {
  const gaugeColor =
    value <= 25 ? '#EF4444' :
    value <= 45 ? '#F97316' :
    value <= 55 ? '#a1a1aa' :
    value <= 75 ? '#84CC16' :
    '#10B981';

  const biasLabel = bias === 'bullish' ? 'Contrarian Bullish' : bias === 'bearish' ? 'Contrarian Bearish' : 'Neutral';
  const biasColor = bias === 'bullish' ? 'text-emerald-400' : bias === 'bearish' ? 'text-red-400' : 'text-[var(--text-secondary)]';

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Circular gauge */}
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="var(--glass-bg)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="32" fill="none"
            stroke={gaugeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(value / 100) * 201} 201`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-mono tabular-nums" style={{ color: gaugeColor }}>{value}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[11px] font-semibold" style={{ color: gaugeColor }}>{label}</div>
        <div className={`text-[9px] font-mono ${biasColor}`}>{biasLabel}</div>
      </div>
    </div>
  );
}

// ─── Fee Bar ────────────────────────────────────────────────────────────────

function FeeBar({ label, sats, maxSats }: { label: string; sats: number; maxSats: number }) {
  const pct = Math.min((sats / maxSats) * 100, 100);
  const color = sats > 50 ? '#EF4444' : sats > 20 ? '#a1a1aa' : '#10B981';
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className="text-[var(--text-secondary)] w-10 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--glass-bg)]">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="tabular-nums w-12 text-right" style={{ color }}>{sats} sat/vB</span>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export function MarketContextPanel() {
  const [data, setData] = useState<MarketContext>({ sentiment: null, onchain: null, defi: null });
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function fetchContext() {
      const [sentimentRes, onchainRes, defiRes] = await Promise.allSettled([
        fetch('/api/data/sentiment').then(r => r.ok ? r.json() : null),
        fetch('/api/data/onchain').then(r => r.ok ? r.json() : null),
        fetch('/api/data/defi?view=overview').then(r => r.ok ? r.json() : null),
      ]);

      setData({
        sentiment: sentimentRes.status === 'fulfilled' ? sentimentRes.value : null,
        onchain: onchainRes.status === 'fulfilled' ? onchainRes.value : null,
        defi: defiRes.status === 'fulfilled' ? defiRes.value : null,
      });
      setLoading(false);
    }

    fetchContext();
    // Refresh every 5 minutes
    const interval = setInterval(fetchContext, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-4 animate-pulse mb-6">
        <div className="h-4 bg-[var(--glass-bg)] rounded w-40 mb-3" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-[var(--glass-bg)] rounded-xl" />
          <div className="h-24 bg-[var(--glass-bg)] rounded-xl" />
          <div className="h-24 bg-[var(--glass-bg)] rounded-xl" />
        </div>
      </div>
    );
  }

  const { sentiment, onchain, defi } = data;
  const hasData = sentiment || onchain || defi;
  if (!hasData) return null;

  const maxFee = Math.max(onchain?.feeEstimate.fast ?? 10, 10);

  return (
    <div className="glass-card rounded-2xl overflow-hidden mb-6">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Market Context
          </span>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
            LIVE
          </span>
        </div>
        <span className="text-[var(--text-secondary)] text-xs">{collapsed ? '▾' : '▴'}</span>
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ── Fear & Greed ── */}
          <div className="bg-white/[0.02] rounded-xl p-4 border border-[var(--border)]">
            <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-3 font-semibold">
              Crypto Fear & Greed
            </div>
            {sentiment?.current ? (
              <SentimentGauge
                value={sentiment.current.value}
                label={sentiment.current.label}
                bias={sentiment.current.bias}
              />
            ) : (
              <div className="text-[11px] text-[var(--text-secondary)] text-center py-4">Unavailable</div>
            )}
          </div>

          {/* ── Bitcoin On-Chain ── */}
          <div className="bg-white/[0.02] rounded-xl p-4 border border-[var(--border)]">
            <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-3 font-semibold">
              Bitcoin Network
            </div>
            {onchain ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] text-[var(--text-secondary)] uppercase">Mempool</div>
                    <div className="text-sm font-bold font-mono tabular-nums text-[var(--foreground)]">
                      {formatNumber(onchain.mempoolSize)} tx
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-[var(--text-secondary)] uppercase">Block</div>
                    <div className="text-sm font-bold font-mono tabular-nums text-[var(--foreground)]">
                      #{onchain.blockHeight.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[9px] text-[var(--text-secondary)] uppercase">Fee Estimates</div>
                  <FeeBar label="Fast" sats={onchain.feeEstimate.fast} maxSats={maxFee} />
                  <FeeBar label="Med" sats={onchain.feeEstimate.medium} maxSats={maxFee} />
                  <FeeBar label="Slow" sats={onchain.feeEstimate.slow} maxSats={maxFee} />
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-[var(--text-secondary)] text-center py-4">Unavailable</div>
            )}
          </div>

          {/* ── DeFi Overview ── */}
          <div className="bg-white/[0.02] rounded-xl p-4 border border-[var(--border)]">
            <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-3 font-semibold">
              DeFi Overview
            </div>
            {defi?.tvl ? (
              <div className="space-y-3">
                <div>
                  <div className="text-[9px] text-[var(--text-secondary)] uppercase">Total TVL</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-[var(--foreground)]">
                    {formatTVL(defi.tvl.total)}
                  </div>
                </div>
                {/* Top chains */}
                <div className="space-y-1">
                  <div className="text-[9px] text-[var(--text-secondary)] uppercase">Top Chains</div>
                  {defi.tvl.chains.slice(0, 5).map((chain) => (
                    <div key={chain.name} className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[var(--text-secondary)]">{chain.name}</span>
                      <span className="text-[var(--foreground)] tabular-nums">{formatTVL(chain.tvl)}</span>
                    </div>
                  ))}
                </div>
                {/* Top protocols */}
                {defi.topProtocols.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                    <div className="text-[9px] text-[var(--text-secondary)] uppercase">Top Protocols</div>
                    {defi.topProtocols.slice(0, 3).map((p) => (
                      <div key={p.name} className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-[var(--text-secondary)]">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--foreground)] tabular-nums">{formatTVL(p.tvl)}</span>
                          <span className={`tabular-nums ${p.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {p.change24h >= 0 ? '+' : ''}{p.change24h}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-[var(--text-secondary)] text-center py-4">Unavailable</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
