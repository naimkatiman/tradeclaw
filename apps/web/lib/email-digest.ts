import { readHistory, computeLeaderboard } from './signal-history';
import { TRADECLAW_LOGO_SVG } from '../components/tradeclaw-logo';

export interface EmailDigestSignal {
  pair: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  pnl24h: number | null;
  hit24h: boolean | null;
}

export interface EmailDigestData {
  period: '7d' | '30d';
  dateRange: string;
  topSignals: EmailDigestSignal[];
  accuracy: {
    hitRate4h: number;
    hitRate24h: number;
    totalResolved: number;
    totalSignals: number;
  };
  leaderboard: Array<{
    rank: number;
    pair: string;
    hitRate: number;
    totalSignals: number;
  }>;
}

export interface EmailDigestOptions {
  period?: '7d' | '30d';
  topN?: number;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrice(price: number): string {
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(5);
}

export function getEmailDigestData(options: EmailDigestOptions = {}): EmailDigestData {
  const period = options.period ?? '7d';
  const topN = options.topN ?? 5;

  const history = readHistory();
  const leaderboard = computeLeaderboard(history, period, 'hitRate');

  const now = Date.now();
  const cutoff = period === '7d' ? now - 7 * 86400000 : now - 30 * 86400000;
  const startDate = formatDate(cutoff);
  const endDate = formatDate(now);

  // Top N resolved signals sorted by confidence
  const resolved = history
    .filter(r => r.timestamp >= cutoff && r.outcomes['24h'] !== null)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);

  const topSignals: EmailDigestSignal[] = resolved.map(r => ({
    pair: r.pair,
    direction: r.direction,
    confidence: r.confidence,
    entryPrice: r.entryPrice,
    pnl24h: r.outcomes['24h']?.pnlPct ?? null,
    hit24h: r.outcomes['24h']?.hit ?? null,
  }));

  const topLeaderboard = leaderboard.assets.slice(0, 5).map((a, i) => ({
    rank: i + 1,
    pair: a.pair,
    hitRate: a.hitRate24h,
    totalSignals: a.totalSignals,
  }));

  return {
    period,
    dateRange: `${startDate} – ${endDate}`,
    topSignals,
    accuracy: {
      hitRate4h: leaderboard.overall.overallHitRate4h,
      hitRate24h: leaderboard.overall.overallHitRate24h,
      totalResolved: leaderboard.overall.resolvedSignals,
      totalSignals: leaderboard.overall.totalSignals,
    },
    leaderboard: topLeaderboard,
  };
}

export function generateEmailDigest(options: EmailDigestOptions = {}): string {
  const data = getEmailDigestData(options);

  const signalRows = data.topSignals.length > 0
    ? data.topSignals.map(s => {
        const dirColor = s.direction === 'BUY' ? '#10b981' : '#ef4444';
        const pnlColor = (s.pnl24h ?? 0) >= 0 ? '#10b981' : '#ef4444';
        const pnlText = s.pnl24h !== null ? `${s.pnl24h >= 0 ? '+' : ''}${s.pnl24h}%` : '—';
        const hitIcon = s.hit24h === true ? '&#10003;' : s.hit24h === false ? '&#10007;' : '—';
        const hitColor = s.hit24h === true ? '#10b981' : s.hit24h === false ? '#ef4444' : '#6b7280';

        return `<tr>
  <td style="padding:10px 12px;color:#e5e7eb;font-size:14px;border-bottom:1px solid #1f2937;">${s.pair}</td>
  <td style="padding:10px 12px;border-bottom:1px solid #1f2937;">
    <span style="display:inline-block;background-color:${dirColor};color:#ffffff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">${s.direction}</span>
  </td>
  <td style="padding:10px 12px;color:#e5e7eb;font-size:14px;text-align:center;border-bottom:1px solid #1f2937;">${s.confidence}%</td>
  <td style="padding:10px 12px;color:#9ca3af;font-size:13px;text-align:right;border-bottom:1px solid #1f2937;">${formatPrice(s.entryPrice)}</td>
  <td style="padding:10px 12px;color:${pnlColor};font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #1f2937;">${pnlText}</td>
  <td style="padding:10px 12px;color:${hitColor};font-size:16px;text-align:center;border-bottom:1px solid #1f2937;">${hitIcon}</td>
</tr>`;
      }).join('\n')
    : `<tr><td colspan="6" style="padding:24px;color:#6b7280;text-align:center;font-size:14px;">No signals this week</td></tr>`;

  const leaderboardRows = data.leaderboard.map(l => {
    const barWidth = Math.max(Math.round(l.hitRate), 5);
    return `<tr>
  <td style="padding:8px 12px;color:#9ca3af;font-size:13px;border-bottom:1px solid #1f2937;">#${l.rank}</td>
  <td style="padding:8px 12px;color:#e5e7eb;font-size:14px;font-weight:600;border-bottom:1px solid #1f2937;">${l.pair}</td>
  <td style="padding:8px 12px;border-bottom:1px solid #1f2937;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tr>
      <td style="padding:0;"><div style="background-color:#1f2937;border-radius:4px;height:8px;width:100%;"><div style="background-color:#10b981;border-radius:4px;height:8px;width:${barWidth}%;"></div></div></td>
      <td style="padding:0 0 0 8px;color:#e5e7eb;font-size:13px;white-space:nowrap;width:50px;text-align:right;">${l.hitRate}%</td>
    </tr></table>
  </td>
  <td style="padding:8px 12px;color:#6b7280;font-size:13px;text-align:center;border-bottom:1px solid #1f2937;">${l.totalSignals}</td>
</tr>`;
  }).join('\n');

  const hitRate24h = data.accuracy.hitRate24h;
  const hitBarWidth = Math.max(Math.round(hitRate24h), 5);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TradeClaw Weekly Signal Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse:collapse;max-width:600px;margin:0 auto;" bgcolor="#0a0a0a">

  <!-- Header -->
  <tr>
    <td style="padding:32px 24px 24px 24px;text-align:center;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding-right:8px;vertical-align:middle;">
            ${TRADECLAW_LOGO_SVG(28, 'email')}
          </td>
          <td style="vertical-align:middle;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;">Trade</span><span style="font-size:22px;font-weight:700;color:#10b981;">Claw</span>
          </td>
        </tr>
      </table>
      <p style="margin:8px 0 0 0;font-size:16px;font-weight:600;color:#e5e7eb;">Weekly Signal Digest</p>
      <p style="margin:4px 0 0 0;font-size:13px;color:#6b7280;">${data.dateRange}</p>
    </td>
  </tr>

  <!-- Top Signals -->
  <tr>
    <td style="padding:0 24px 24px 24px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background-color:#111827;border-radius:8px;" bgcolor="#111827">
        <tr>
          <td colspan="6" style="padding:16px 12px 8px 12px;">
            <span style="font-size:13px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;">Top ${data.topSignals.length} Signals</span>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #1f2937;">Pair</td>
          <td style="padding:4px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #1f2937;">Dir</td>
          <td style="padding:4px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:1px solid #1f2937;">Conf</td>
          <td style="padding:4px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:right;border-bottom:1px solid #1f2937;">Entry</td>
          <td style="padding:4px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:right;border-bottom:1px solid #1f2937;">24h P&amp;L</td>
          <td style="padding:4px 12px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:1px solid #1f2937;">Hit</td>
        </tr>
        ${signalRows}
      </table>
    </td>
  </tr>

  <!-- Accuracy Stats -->
  <tr>
    <td style="padding:0 24px 24px 24px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background-color:#111827;border-radius:8px;" bgcolor="#111827">
        <tr>
          <td colspan="3" style="padding:16px 12px 12px 12px;">
            <span style="font-size:13px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;">Accuracy</span>
          </td>
        </tr>
        <tr>
          <td style="padding:0 12px 4px 12px;" colspan="3">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;"><tr>
              <td style="padding:0;color:#9ca3af;font-size:12px;">Win Rate (24h)</td>
              <td style="padding:0;color:#ffffff;font-size:16px;font-weight:700;text-align:right;">${hitRate24h}%</td>
            </tr></table>
            <div style="background-color:#1f2937;border-radius:4px;height:10px;width:100%;margin-top:6px;">
              <div style="background-color:#10b981;border-radius:4px;height:10px;width:${hitBarWidth}%;"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 12px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">${data.accuracy.hitRate4h}%</p>
            <p style="margin:4px 0 0 0;font-size:11px;color:#6b7280;">Hit Rate (4h)</p>
          </td>
          <td style="padding:16px 12px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">${data.accuracy.totalResolved}</p>
            <p style="margin:4px 0 0 0;font-size:11px;color:#6b7280;">Resolved</p>
          </td>
          <td style="padding:16px 12px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">${data.accuracy.totalSignals}</p>
            <p style="margin:4px 0 0 0;font-size:11px;color:#6b7280;">Total Signals</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Leaderboard -->
  <tr>
    <td style="padding:0 24px 24px 24px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background-color:#111827;border-radius:8px;" bgcolor="#111827">
        <tr>
          <td colspan="4" style="padding:16px 12px 8px 12px;">
            <span style="font-size:13px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;">Leaderboard</span>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 12px;font-size:11px;color:#6b7280;font-weight:600;border-bottom:1px solid #1f2937;width:36px;">#</td>
          <td style="padding:4px 12px;font-size:11px;color:#6b7280;font-weight:600;border-bottom:1px solid #1f2937;">Pair</td>
          <td style="padding:4px 12px;font-size:11px;color:#6b7280;font-weight:600;border-bottom:1px solid #1f2937;">Hit Rate</td>
          <td style="padding:4px 12px;font-size:11px;color:#6b7280;font-weight:600;text-align:center;border-bottom:1px solid #1f2937;width:60px;">Signals</td>
        </tr>
        ${leaderboardRows}
      </table>
    </td>
  </tr>

  <!-- Footer CTA -->
  <tr>
    <td style="padding:0 24px 16px 24px;text-align:center;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:0 6px;">
            <a href="https://tradeclaw.com/dashboard" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">View Dashboard</a>
          </td>
          <td style="padding:0 6px;">
            <a href="https://github.com/naimkatiman/tradeclaw" style="display:inline-block;background-color:#1f2937;color:#ffffff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;border:1px solid #374151;">&#11088; Star on GitHub</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer text -->
  <tr>
    <td style="padding:16px 24px 32px 24px;text-align:center;">
      <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">Self-host your own AI trading signals</p>
      <p style="margin:0;font-size:11px;color:#4b5563;">
        <a href="https://tradeclaw.com" style="color:#6b7280;text-decoration:underline;">TradeClaw</a>
        &nbsp;&middot;&nbsp;
        <a href="https://github.com/naimkatiman/tradeclaw" style="color:#6b7280;text-decoration:underline;">GitHub</a>
        &nbsp;&middot;&nbsp;
        <a href="#" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
      </p>
    </td>
  </tr>

</table>
</body>
</html>`;
}
