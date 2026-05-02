import { query } from '../../../lib/db-pool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface Stats { total: number; wins: number; winRate: number; totalPnl: number }

async function loadStats(): Promise<Stats> {
  const rows = await query<{ total: string; wins: string; win_rate: string; total_pnl: string }>(`
    SELECT
      COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL)::text AS total,
      COUNT(*) FILTER (WHERE (outcome_24h->>'hit')::boolean = true)::text AS wins,
      CASE WHEN COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE (outcome_24h->>'hit')::boolean = true)::numeric
          / COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL) * 100, 1)::text
        ELSE '0' END AS win_rate,
      COALESCE(ROUND(SUM((outcome_24h->>'pnlPct')::numeric) FILTER (WHERE outcome_24h IS NOT NULL), 2)::text, '0') AS total_pnl
    FROM signal_history
    WHERE is_simulated = false AND created_at >= NOW() - INTERVAL '30 days'
  `);
  const r = rows[0] ?? { total: '0', wins: '0', win_rate: '0', total_pnl: '0' };
  return { total: +r.total, wins: +r.wins, winRate: +r.win_rate, totalPnl: +r.total_pnl };
}

export default async function TrackRecordEmbedPage({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const { theme } = await searchParams;
  const dark = theme !== 'light';
  const s = await loadStats();
  const pnlColor = s.totalPnl >= 0 ? '#10b981' : '#f43f5e';
  const borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  return (
    <main
      style={{
        background: dark ? '#0b0b0b' : '#fafafa',
        color: dark ? '#e5e5e5' : '#0a0a0a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
        height: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>
          TradeClaw — verified track record (30d)
        </div>
        <a href="https://tradeclaw.win/track-record" target="_blank" rel="noopener" style={{ fontSize: '11px', color: '#10b981', textDecoration: 'none' }}>
          tradeclaw.win →
        </a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', flex: 1 }}>
        <Stat label="Signals resolved" value={s.total.toString()} borderColor={borderColor} />
        <Stat label="Wins" value={s.wins.toString()} borderColor={borderColor} />
        <Stat label="Win rate" value={`${s.winRate}%`} borderColor={borderColor} />
        <Stat label="Σ PnL" value={`${s.totalPnl >= 0 ? '+' : ''}${s.totalPnl}%`} valueColor={pnlColor} borderColor={borderColor} />
      </div>
    </main>
  );
}

function Stat({ label, value, valueColor, borderColor }: { label: string; value: string; valueColor?: string; borderColor: string }) {
  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: valueColor ?? 'inherit', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}
