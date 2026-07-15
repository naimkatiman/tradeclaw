import { NextResponse } from 'next/server';

export async function GET() {
  let stars: number | null = null;
  try {
    const res = await fetch('https://api.github.com/repos/naimkatiman/tradeclaw', {
      headers: { 'User-Agent': 'TradeClaw/1.0' },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      stars = typeof data.stargazers_count === 'number' ? data.stargazers_count : null;
    }
  } catch {
    // The widget renders an explicit unavailable state below.
  }

  const metric = stars === null ? 'Unavailable' : stars.toLocaleString('en-US');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 300px; height: 200px; overflow: hidden;
    background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #f4f4f5; display: flex; flex-direction: column;
    justify-content: center; align-items: center; gap: 12px;
    border: 1px solid #1c1c1e; border-radius: 12px;
  }
  .logo { font-size: 11px; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase; }
  .logo span { color: #10b981; }
  .stars { font-size: ${stars === null ? '22px' : '36px'}; font-weight: 700; color: #f4f4f5; line-height: 1; }
  .label { font-size: 11px; color: #71717a; }
  .source { font-size: 10px; color: #52525b; }
</style>
</head>
<body>
  <div class="logo">Trade<span>Claw</span></div>
  <div class="stars">${metric}</div>
  <div class="label">GitHub Stars</div>
  <div class="source">${stars === null ? 'GitHub API request failed; no fallback used' : 'Reported by the GitHub API'}</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': stars === null ? 'no-store' : 'public, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
      'X-Frame-Options': 'ALLOWALL',
    },
  });
}
