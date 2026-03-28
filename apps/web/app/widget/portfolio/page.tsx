'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

interface PositionSummary {
  symbol: string;
  direction: 'BUY' | 'SELL';
  unrealisedPnl: number;
}

interface PortfolioData {
  balance: number;
  equity: number;
  openPnl: number;
  totalReturn: number;
  winRate: number;
  openPositions: number;
  top3Positions: PositionSummary[];
  lastUpdated: string;
}

export default function PortfolioWidgetPage() {
  const searchParams = useSearchParams();
  const theme = searchParams.get('theme') === 'light' ? 'light' : 'dark';
  const compact = searchParams.get('compact') === 'true';

  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/widget/portfolio');
      if (!res.ok) throw new Error('fetch failed');
      setData(await res.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0d1117' : '#ffffff';
  const cardBg = isDark ? '#161b22' : '#f6f8fa';
  const border = isDark ? '#30363d' : '#d0d7de';
  const textPrimary = isDark ? '#e6edf3' : '#1f2328';
  const textSecondary = isDark ? '#8b949e' : '#656d76';
  const brand = '#3fb950';

  if (error && !data) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
          color: textSecondary,
          fontSize: 13,
        }}
      >
        Unable to load portfolio data
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
          color: textSecondary,
          fontSize: 13,
        }}
      >
        Loading...
      </div>
    );
  }

  const isPositive = data.totalReturn >= 0;
  const pnlColor = isPositive ? '#3fb950' : '#f85149';
  const arrow = isPositive ? '\u25B2' : '\u25BC';
  const sign = isPositive ? '+' : '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: bg,
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
        color: textPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        minWidth: 300,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: compact ? 320 : 400,
          background: cardBg,
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: compact ? 14 : 18,
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? 10 : 14,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Portfolio
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: pnlColor }}>
            {arrow} {sign}{data.totalReturn.toFixed(1)}%
          </span>
        </div>

        {/* Balance & Equity */}
        <div>
          <div style={{ fontSize: compact ? 20 : 24, fontWeight: 700, letterSpacing: -0.5 }}>
            ${data.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
            Equity: ${data.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: bg, borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Win Rate
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{data.winRate.toFixed(0)}%</div>
          </div>
          <div style={{ background: bg, borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Open Positions
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{data.openPositions}</div>
          </div>
        </div>

        {/* Top 3 open positions */}
        {!compact && data.top3Positions.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 9,
                color: textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              Top Positions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.top3Positions.map((pos) => {
                const posPositive = pos.unrealisedPnl >= 0;
                return (
                  <div
                    key={pos.symbol}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: bg,
                      borderRadius: 6,
                      padding: '6px 10px',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: pos.direction === 'BUY' ? '#3fb950' : '#f85149',
                          marginRight: 6,
                        }}
                      />
                      {pos.symbol}
                    </span>
                    <span style={{ fontWeight: 600, color: posPositive ? '#3fb950' : '#f85149' }}>
                      {posPositive ? '+' : ''}{pos.unrealisedPnl.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 2,
          }}
        >
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 10,
              color: textSecondary,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 20 20"
              fill="none"
              stroke={brand}
              strokeWidth="1.5"
              strokeLinejoin="round"
            >
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" />
              <path d="M10 2v10M3 7l7 5 7-5" />
            </svg>
            TradeClaw
          </a>
          <span style={{ fontSize: 9, color: textSecondary }}>
            Auto-refreshes 30s
          </span>
        </div>
      </div>
    </div>
  );
}
