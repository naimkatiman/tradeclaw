import { NextResponse } from 'next/server';
import { getPortfolio, STARTING_BALANCE, BASE_PRICES } from '../../../../lib/paper-trading';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const portfolio = getPortfolio();
    const balance = portfolio.balance;

    const openPnl = portfolio.positions.reduce((sum, pos) => {
      const currentPrice = BASE_PRICES[pos.symbol] ?? pos.entryPrice;
      const dirMult = pos.direction === 'BUY' ? 1 : -1;
      const movePct = ((currentPrice - pos.entryPrice) / pos.entryPrice) * dirMult;
      return sum + pos.quantity * movePct;
    }, 0);

    const equity = balance + openPnl;
    const totalReturn = ((equity - STARTING_BALANCE) / STARTING_BALANCE) * 100;
    const sign = totalReturn >= 0 ? '+' : '';
    const label = 'TradeClaw Portfolio';
    const value = `${sign}${totalReturn.toFixed(1)}%`;
    const isPositive = totalReturn >= 0;

    const labelColor = '#555';
    const valueColor = isPositive ? '#3fb950' : '#e5534b';
    const labelWidth = 130;
    const valueWidth = 80;
    const totalWidth = labelWidth + valueWidth;
    const height = 20;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${labelColor}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${valueColor}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="14" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="13">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="13">${value}</text>
  </g>
</svg>`;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, max-age=60',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
