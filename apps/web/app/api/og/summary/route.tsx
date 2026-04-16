import { ImageResponse } from 'next/og';
import { query } from '../../../../lib/db-pool';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') === 'weekly' ? 'weekly' : 'daily';
  const dateStr = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const interval = period === 'weekly' ? '7 days' : '1 day';

  const rows = await query<{
    total: string; wins: string; losses: string; win_rate: string; total_pnl: string;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL)::text AS total,
      COUNT(*) FILTER (WHERE (outcome_24h->>'hit')::boolean = true)::text AS wins,
      COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL AND (outcome_24h->>'hit')::boolean = false)::text AS losses,
      CASE WHEN COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE (outcome_24h->>'hit')::boolean = true)::numeric / COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL) * 100, 1)::text
        ELSE '0' END AS win_rate,
      COALESCE(ROUND(SUM((outcome_24h->>'pnlPct')::numeric) FILTER (WHERE outcome_24h IS NOT NULL), 2)::text, '0') AS total_pnl
    FROM signal_history
    WHERE is_simulated = false AND created_at >= ($1::date - $2::interval) AND created_at < $1::date + INTERVAL '1 day'
  `, [dateStr, interval]);

  const s = rows[0] ?? { total: '0', wins: '0', losses: '0', win_rate: '0', total_pnl: '0' };
  const pnl = Number(s.total_pnl);
  const pnlColor = pnl >= 0 ? '#10b981' : '#f43f5e';
  const title = period === 'weekly' ? 'WEEKLY SUMMARY' : 'DAILY P/L';

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
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
          }}
        />

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
            <div style={{ fontSize: '64px', fontWeight: 800, color: pnlColor }}>
              {pnl >= 0 ? '+' : ''}{s.total_pnl}%
            </div>
            <div style={{ fontSize: '16px', color: '#6b7280', letterSpacing: '0.08em' }}>TOTAL P/L</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '64px', fontWeight: 800, color: '#ffffff' }}>{s.win_rate}%</div>
            <div style={{ fontSize: '16px', color: '#6b7280', letterSpacing: '0.08em' }}>WIN RATE</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: '#10b981' }}>{s.wins}</div>
              <div style={{ fontSize: '48px', fontWeight: 800, color: '#3f3f46' }}>/</div>
              <div style={{ fontSize: '48px', fontWeight: 800, color: '#f43f5e' }}>{s.losses}</div>
            </div>
            <div style={{ fontSize: '16px', color: '#6b7280', letterSpacing: '0.08em' }}>WINS / LOSSES</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ color: '#3f3f46', fontSize: '14px', letterSpacing: '0.05em' }}>
          tradeclaw.win/track-record — open-source, transparent, verifiable
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
