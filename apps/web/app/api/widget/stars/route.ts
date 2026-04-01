import { NextResponse } from 'next/server';

export async function GET() {
  // Fetch star count
  let stars = 4;
  const recentGrowth = 0;
  try {
    const res = await fetch('https://api.github.com/repos/naimkatiman/tradeclaw', {
      headers: { 'User-Agent': 'TradeClaw/1.0' },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      stars = data.stargazers_count ?? 4;
    }
  } catch {
    // use default
  }

  const pct = Math.min((stars / 1000) * 100, 100).toFixed(1);
  const nextMilestone = [10, 25, 50, 100, 250, 500, 1000].find((m) => m > stars) ?? 1000;

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
  .stars { font-size: 36px; font-weight: 700; color: #f4f4f5; line-height: 1; }
  .stars span { color: #fbbf24; }
  .label { font-size: 11px; color: #71717a; }
  .bar-bg { width: 220px; height: 6px; background: #1c1c1e; border-radius: 99px; overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 99px;
    width: ${pct}%; transition: width 0.5s ease; }
  .milestone { font-size: 10px; color: #52525b; }
</style>
</head>
<body>
  <div class="logo">Trade<span>Claw</span></div>
  <div class="stars"><span>⭐</span> ${stars}</div>
  <div class="label">GitHub Stars</div>
  <div class="bar-bg"><div class="bar-fill"></div></div>
  <div class="milestone">${stars} / ${nextMilestone} until next milestone · ${recentGrowth} this month</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
      'X-Frame-Options': 'ALLOWALL',
    },
  });
}
