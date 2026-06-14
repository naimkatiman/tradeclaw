import { ImageResponse } from 'next/og';
import { computeTrackRecordStats } from '../../../../lib/track-record-stats';

export const runtime = 'nodejs';

export async function GET() {
  // Same resolved-signal logic the page body + /api/signals/equity use:
  // excludes auto-expired, gate-blocked, and simulated rows. The prior raw
  // `outcome_24h IS NOT NULL` SQL folded those in, so the card showed a lower
  // win-rate and different P&L than the page under the same banner. Honesty
  // contract: surfaces sharing a metric for the same window must compute it
  // the same way.
  const stats = await computeTrackRecordStats('all');
  const pnl = stats.totalPnl;
  const pnlColor = pnl >= 0 ? '#10b981' : '#f43f5e';
  const s = {
    total: stats.total.toString(),
    win_rate: stats.winRate.toString(),
    total_pnl: stats.totalPnl.toFixed(2),
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#050505',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
          }}
        />

        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 12px #10b981',
            }}
          />
          <span style={{ color: '#10b981', fontSize: '15px', letterSpacing: '0.15em', fontWeight: 600 }}>
            TRADECLAW
          </span>
        </div>

        <div style={{ fontSize: '22px', color: '#10b981', letterSpacing: '0.12em', marginBottom: '40px' }}>
          RECORDED TRACK RECORD — 30 DAYS
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '64px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '72px', fontWeight: 800, color: '#ffffff' }}>{s.total}</div>
            <div style={{ fontSize: '16px', color: '#6b7280', letterSpacing: '0.08em' }}>SIGNALS</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '72px', fontWeight: 800, color: '#10b981' }}>{s.win_rate}%</div>
            <div style={{ fontSize: '16px', color: '#6b7280', letterSpacing: '0.08em' }}>WIN RATE</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '72px', fontWeight: 800, color: pnlColor }}>
              {pnl >= 0 ? '+' : ''}{s.total_pnl}%
            </div>
            <div style={{ fontSize: '16px', color: '#6b7280', letterSpacing: '0.08em' }}>TOTAL P/L</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ color: '#3f3f46', fontSize: '14px', letterSpacing: '0.05em' }}>
          tradeclaw.win/track-record — open-source, transparent, resolved against Binance/Yahoo OHLCV
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
