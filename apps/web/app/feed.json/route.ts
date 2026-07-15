import { NextResponse } from 'next/server';
import { readHistoryAsync } from '../../lib/signal-history';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tradeclaw.win';

function fmtPrice(price: number): string {
  if (!price || price === 0) return 'N/A';
  return price.toFixed(price >= 100 ? 2 : 5);
}

export async function GET() {
  const history = await readHistoryAsync();
  const signals = history.slice(0, 50);

  const items = signals.map((signal) => {
    const outcome4h = signal.outcomes['4h'];
    const outcome24h = signal.outcomes['24h'];

    const contentHtml = `
<h2>${signal.direction} ${signal.pair} @ ${fmtPrice(signal.entryPrice)}</h2>
<table cellpadding="4" cellspacing="0" border="1" style="border-collapse:collapse;font-family:monospace">
  <tr><td><strong>Pair</strong></td><td>${signal.pair}</td></tr>
  <tr><td><strong>Timeframe</strong></td><td>${signal.timeframe}</td></tr>
  <tr><td><strong>Direction</strong></td><td>${signal.direction}</td></tr>
  <tr><td><strong>Rule score</strong></td><td>${signal.confidence}/100 (mechanical, not a predictive probability)</td></tr>
  <tr><td><strong>Entry Price</strong></td><td>${fmtPrice(signal.entryPrice)}</td></tr>
  ${signal.tp1 ? `<tr><td><strong>Take Profit 1</strong></td><td>${fmtPrice(signal.tp1)}</td></tr>` : ''}
  ${signal.sl ? `<tr><td><strong>Stop Loss</strong></td><td>${fmtPrice(signal.sl)}</td></tr>` : ''}
</table>
<h3>Signal Outcomes</h3>
<table cellpadding="4" cellspacing="0" border="1" style="border-collapse:collapse;font-family:monospace">
  <tr><th>Window</th><th>Rule outcome</th><th>Directional move %</th><th>Observed price</th></tr>
  <tr>
    <td>4h</td>
    <td>${outcome4h ? (outcome4h.hit ? '✅ Hit TP' : '❌ Hit SL') : '⏳ Pending'}</td>
    <td>${outcome4h ? `${outcome4h.pnlPct > 0 ? '+' : ''}${outcome4h.pnlPct}%` : '—'}</td>
    <td>${outcome4h ? fmtPrice(outcome4h.price) : '—'}</td>
  </tr>
  <tr>
    <td>24h</td>
    <td>${outcome24h ? (outcome24h.hit ? '✅ Hit TP' : '❌ Hit SL') : '⏳ Pending'}</td>
    <td>${outcome24h ? `${outcome24h.pnlPct > 0 ? '+' : ''}${outcome24h.pnlPct}%` : '—'}</td>
    <td>${outcome24h ? fmtPrice(outcome24h.price) : '—'}</td>
  </tr>
</table>
<br/>
<p><a href="${BASE_URL}/signal/${signal.id}">View full signal on TradeClaw →</a></p>`.trim();

    const summary = [
      `${signal.direction} ${signal.pair} at ${fmtPrice(signal.entryPrice)}`,
      `Rule score: ${signal.confidence}/100 (not a predictive probability)`,
      signal.tp1 ? `TP1: ${fmtPrice(signal.tp1)}` : null,
      signal.sl ? `SL: ${fmtPrice(signal.sl)}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    return {
      id: `${BASE_URL}/signal/${signal.id}`,
      url: `${BASE_URL}/signal/${signal.id}`,
      title: `${signal.direction} ${signal.pair} ${signal.timeframe} — rule score ${signal.confidence}/100`,
      content_html: contentHtml,
      summary,
      date_published: new Date(signal.timestamp).toISOString(),
      tags: [signal.pair, signal.direction, signal.timeframe],
    };
  });

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'TradeClaw Signal Observations',
    home_page_url: BASE_URL,
    feed_url: `${BASE_URL}/feed.json`,
    description:
      'Latest available rule-generated signal observations. Directional moves are unsized price observations, not broker or portfolio returns.',
    favicon: `${BASE_URL}/favicon.ico`,
    authors: [{ name: 'TradeClaw', url: BASE_URL }],
    language: 'en-US',
    items,
  };

  return NextResponse.json(feed, {
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800',
    },
  });
}
