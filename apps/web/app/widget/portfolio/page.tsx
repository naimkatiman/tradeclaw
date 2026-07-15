'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { TradeClawLogo } from '../../../components/tradeclaw-logo';

interface PortfolioData {
  available: true;
  mode: 'paper-simulation';
  realizedBalance: number;
  equity: null;
  openPnl: null;
  totalReturn: number | null;
  winRate: number;
  openPositions: number;
  recordedAt: string | null;
  fetchedAt: string;
  note: string;
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
      const payload = await res.json() as PortfolioData;
      if (payload.available !== true || payload.mode !== 'paper-simulation') {
        throw new Error('paper simulation unavailable');
      }
      setData(payload);
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
        Paper simulation unavailable
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

  const isPositive = data.totalReturn !== null && data.totalReturn >= 0;
  const pnlColor = data.totalReturn === null ? textSecondary : isPositive ? '#3fb950' : '#f85149';
  const arrow = isPositive ? '\u25B2' : '\u25BC';
  const sign = data.totalReturn !== null && data.totalReturn >= 0 ? '+' : '';

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
            Paper simulation
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: pnlColor }}>
            {data.totalReturn === null ? 'Realized return unavailable' : `${arrow} ${sign}${data.totalReturn.toFixed(1)}% realized`}
          </span>
        </div>

        {/* Realized paper balance */}
        <div>
          <div style={{ fontSize: compact ? 20 : 24, fontWeight: 700, letterSpacing: -0.5 }}>
            ${data.realizedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
            Realized simulation balance. Open positions are not marked.
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: bg, borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Sim. Win Rate
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{data.winRate.toFixed(0)}%</div>
          </div>
          <div style={{ background: bg, borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Open Paper Positions
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{data.openPositions}</div>
          </div>
        </div>

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
            <TradeClawLogo className="h-3 w-3 shrink-0" id="portfolio" />
            TradeClaw paper simulation
          </a>
          <span style={{ fontSize: 9, color: textSecondary }}>
            Realized only · not broker/customer return
          </span>
        </div>
      </div>
    </div>
  );
}
