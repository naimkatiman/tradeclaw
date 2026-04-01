import { getCommentaryArchive } from '../../lib/market-commentary';

export async function GET() {
  const entries = getCommentaryArchive(7);
  const base = 'https://tradeclaw.win';

  const atomEntries = entries
    .map(
      (e) => `  <entry>
    <title>${escapeXml(e.headline)}</title>
    <link href="${base}/commentary?date=${e.date}" rel="alternate" />
    <id>${base}/commentary/${e.date}</id>
    <updated>${e.date}T00:00:00Z</updated>
    <summary type="html">${escapeXml(e.summary)}</summary>
    <content type="html">${escapeXml(
      `<p>${e.summary}</p>` +
        `<p><strong>Signal Consensus:</strong> Bullish ${e.signalConsensus.bullish}% / Bearish ${e.signalConsensus.bearish}% / Neutral ${e.signalConsensus.neutral}%</p>` +
        `<p><strong>Fear &amp; Greed:</strong> ${e.fearGreedScore} (${e.fearGreedLabel})</p>` +
        `<p><strong>Outlook:</strong> ${e.outlook}</p>`
    )}</content>
  </entry>`
    )
    .join('\n');

  const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>TradeClaw Market Commentary</title>
  <subtitle>Daily AI-generated market analysis and signal consensus</subtitle>
  <link href="${base}/commentary" rel="alternate" />
  <link href="${base}/commentary/feed.xml" rel="self" />
  <id>${base}/commentary/feed.xml</id>
  <updated>${entries[0]?.date ?? new Date().toISOString().slice(0, 10)}T00:00:00Z</updated>
  <author>
    <name>TradeClaw</name>
    <uri>${base}</uri>
  </author>
  <icon>${base}/favicon.ico</icon>
${atomEntries}
</feed>`;

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
