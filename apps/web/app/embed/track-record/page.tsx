import { computeTrackRecordStats, parseBand, type TrackRecordBand } from '../../../lib/track-record-stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 60;

type Band = TrackRecordBand;

export default async function TrackRecordEmbedPage({ searchParams }: { searchParams: Promise<{ theme?: string; band?: string }> }) {
  const { theme, band: rawBand } = await searchParams;
  const band = parseBand(rawBand);
  const dark = theme !== 'light';
  // Same resolved-signal logic as the page body + OG card: excludes
  // auto-expired, gate-blocked, and simulated rows. Replaces the raw
  // `outcome_24h IS NOT NULL` SQL that disagreed with the page numbers.
  const s = await computeTrackRecordStats(band);
  const pnlColor = s.totalPnl >= 0 ? '#10b981' : '#f43f5e';
  const borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const bandLabel = band === 'premium' ? 'premium band' : band === 'standard' ? 'standard band' : 'all signals';

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
          {`TradeClaw — recorded track record (30d, ${bandLabel})`}
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
