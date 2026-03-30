import { NextResponse } from 'next/server';
import { getPortfolio, STARTING_BALANCE } from '../../../../../lib/paper-trading';
import type { EquityPoint } from '../../../../../lib/paper-trading';

export const dynamic = 'force-dynamic';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSparkline(curve: EquityPoint[], width: number, height: number): string {
  if (curve.length < 2) return '';

  const values = curve.map((p) => p.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return points.join(' ');
}

export async function GET() {
  try {
    const portfolio = getPortfolio();
    const balance = portfolio.balance;
    const totalReturn = ((balance - STARTING_BALANCE) / STARTING_BALANCE) * 100;
    const winRate = portfolio.stats.winRate;
    const totalTrades = portfolio.stats.totalTrades;
    const equityCurve = portfolio.equityCurve;

    // Use last 30 data points for sparkline
    const sparkData = equityCurve.slice(-30);
    const sparkW = 140;
    const sparkH = 40;
    const sparkPoints = buildSparkline(sparkData, sparkW, sparkH);

    const returnSign = totalReturn >= 0 ? '+' : '';
    const accentColor = totalReturn >= 0 ? '#10b981' : '#f43f5e';
    const sparkGradId = 'sparkGrad';

    const balanceStr = `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const returnStr = `${returnSign}${totalReturn.toFixed(1)}%`;
    const winRateStr = `${winRate.toFixed(0)}%`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120" role="img" aria-label="${esc(`TradeClaw Portfolio: ${balanceStr}, Return ${returnStr}, Win Rate ${winRateStr}`)}">
  <defs>
    <linearGradient id="${sparkGradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="card">
      <rect width="400" height="120" rx="12"/>
    </clipPath>
  </defs>
  <g clip-path="url(#card)">
    <!-- Background -->
    <rect width="400" height="120" fill="#0f0f17"/>
    <rect width="400" height="120" fill="none" stroke="#1e1e2e" stroke-width="1"/>

    <!-- Logo -->
    <g transform="translate(16, 16)">
      <path d="M8 1.5L2.5 5.5v5L8 14.5l5.5-4v-5L8 1.5z" stroke="${accentColor}" stroke-width="1.2" stroke-linejoin="round" fill="none"/>
      <path d="M8 1.5v8M2.5 5.5L8 9.5l5.5-4" stroke="${accentColor}" stroke-width="1.2" stroke-linejoin="round" fill="none"/>
      <text x="20" y="11" font-family="system-ui,-apple-system,sans-serif" font-size="12" font-weight="600" fill="#fff">Trade<tspan fill="${accentColor}">Claw</tspan></text>
    </g>

    <!-- Balance -->
    <text x="16" y="56" font-family="system-ui,-apple-system,sans-serif" font-size="22" font-weight="700" fill="#fff">${esc(balanceStr)}</text>

    <!-- Stats row -->
    <g font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="#71717a">
      <text x="16" y="78">Return</text>
      <text x="16" y="93" font-weight="600" fill="${accentColor}" font-size="13">${esc(returnStr)}</text>

      <text x="96" y="78">Win Rate</text>
      <text x="96" y="93" font-weight="600" fill="#fff" font-size="13">${esc(winRateStr)}</text>

      <text x="176" y="78">Trades</text>
      <text x="176" y="93" font-weight="600" fill="#fff" font-size="13">${totalTrades}</text>
    </g>

    <!-- Sparkline -->
    <g transform="translate(244, 36)">
      ${sparkPoints ? `<polyline points="${sparkPoints}" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      <polygon points="0,${sparkH} ${sparkPoints} ${sparkW},${sparkH}" fill="url(#${sparkGradId})" opacity="0.6"/>` : `<text x="${sparkW / 2}" y="${sparkH / 2 + 4}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="10" fill="#71717a">No data yet</text>`}
    </g>

    <!-- Footer -->
    <text x="384" y="110" text-anchor="end" font-family="system-ui,-apple-system,sans-serif" font-size="9" fill="#3f3f50">tradeclaw.win</text>
  </g>
</svg>`;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
