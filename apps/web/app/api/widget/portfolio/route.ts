import { NextResponse } from 'next/server';
import { getPortfolio, STARTING_BALANCE } from '../../../../lib/paper-trading';

export const dynamic = 'force-dynamic';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function estimateWidth(text: string): number {
  return Math.ceil(text.length * 6.5);
}

export async function GET() {
  const portfolio = getPortfolio();
  const balance = portfolio.balance;
  const totalReturn = ((balance - STARTING_BALANCE) / STARTING_BALANCE) * 100;
  const winRate = portfolio.stats.winRate;

  const label = 'TradeClaw';
  const value = `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}% | WR ${winRate.toFixed(0)}%`;

  const labelPad = 12;
  const valuePad = 12;
  const leftWidth = estimateWidth(label) + labelPad * 2;
  const rightWidth = estimateWidth(value) + valuePad * 2;
  const totalWidth = leftWidth + rightWidth;
  const leftCenter = leftWidth / 2;
  const rightCenter = leftWidth + rightWidth / 2;

  const rightColor = totalReturn >= 0 ? '#10b981' : '#f43f5e';
  const ariaLabel = `${label}: ${value}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${esc(ariaLabel)}">
  <title>${esc(ariaLabel)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#1a1a2e"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${rightColor}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${leftCenter}" y="15" fill="#010101" fill-opacity=".25" aria-hidden="true">${esc(label)}</text>
    <text x="${leftCenter}" y="14">${esc(label)}</text>
    <text x="${rightCenter}" y="15" fill="#010101" fill-opacity=".25" aria-hidden="true">${esc(value)}</text>
    <text x="${rightCenter}" y="14">${esc(value)}</text>
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
}
