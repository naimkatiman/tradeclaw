import { ImageResponse } from 'next/og';
import { getSocialSummaryStats } from '../../../../lib/social-summary-stats';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') === 'weekly' ? 'weekly' : 'daily';
  const dateStr = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

  // Same resolved denominator as /track-record (getSocialSummaryStats →
  // getResolvedSlice + isCountedResolved): excludes simulated, gate-blocked,
  // and auto-expired rows. The prior raw SQL counted `outcome_24h IS NOT NULL`,
  // inflating the public signal-study statistics against the page they link to.
  const s = await getSocialSummaryStats(period, dateStr);
  const available = s.total > 0;
  const unavailable = '\u2014';
  const sumPriceMovePct = s.sumPriceMovePct;
  const sumPriceMoveColor = !available ? '#71717a' : sumPriceMovePct >= 0 ? '#10b981' : '#f43f5e';
  const title = period === 'weekly' ? 'SOURCE-GATED WEEKLY OUTCOMES' : 'SOURCE-GATED DAILY OUTCOMES';

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
        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
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
            TRADECLAW — {title}
          </span>
        </div>

        <div style={{ fontSize: '18px', color: '#6b7280', marginBottom: '36px' }}>{dateStr}</div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '56px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '64px', fontWeight: 800, color: sumPriceMoveColor }}>
              {available ? `${sumPriceMovePct >= 0 ? '+' : ''}${sumPriceMovePct.toFixed(2)}%` : unavailable}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', letterSpacing: '0.08em' }}>
              UNSIZED SUM OF PRICE MOVES
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '64px', fontWeight: 800, color: available ? '#ffffff' : '#71717a' }}>
              {available ? `${s.winRatePct.toFixed(1)}%` : unavailable}
            </div>
            <div style={{ fontSize: '16px', color: '#6b7280', letterSpacing: '0.08em' }}>WIN RATE</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: available ? '#10b981' : '#71717a' }}>
                {available ? s.wins : unavailable}
              </div>
              <div style={{ fontSize: '48px', fontWeight: 800, color: '#3f3f46' }}>/</div>
              <div style={{ fontSize: '48px', fontWeight: 800, color: available ? '#f43f5e' : '#71717a' }}>
                {available ? s.losses : unavailable}
              </div>
            </div>
            <div style={{ fontSize: '16px', color: '#6b7280', letterSpacing: '0.08em' }}>WINS / LOSSES</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ color: '#3f3f46', fontSize: '14px', letterSpacing: '0.05em' }}>
          Source-approved OHLCV outcomes only; unavailable when none are counted. Not portfolio P/L or broker fills.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
