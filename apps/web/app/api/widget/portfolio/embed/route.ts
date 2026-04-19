import { NextRequest, NextResponse } from 'next/server';
import { getPortfolio, getDemoUserId, STARTING_BALANCE } from '../../../../../lib/paper-trading';
import { TRADECLAW_LOGO_SVG } from '../../../../../components/tradeclaw-logo';

export const dynamic = 'force-dynamic';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET(request: NextRequest) {
  const userId = getDemoUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Widget demo user not configured' },
      { status: 410, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }
  try {
    const theme = request.nextUrl.searchParams.get('theme') === 'light' ? 'light' : 'dark';
    const portfolio = await getPortfolio(userId);
    const balance = portfolio.balance;
    const totalReturn = ((balance - STARTING_BALANCE) / STARTING_BALANCE) * 100;
    const winRate = portfolio.stats.winRate;
    const openPositions = portfolio.positions.length;

    const isPositive = totalReturn >= 0;
    const arrow = isPositive ? '\u25B2' : '\u25BC';
    const pnlSign = isPositive ? '+' : '';

    const bg = theme === 'dark' ? '#0d1117' : '#ffffff';
    const cardBg = theme === 'dark' ? '#161b22' : '#f6f8fa';
    const border = theme === 'dark' ? '#30363d' : '#d0d7de';
    const textPrimary = theme === 'dark' ? '#e6edf3' : '#1f2328';
    const textSecondary = theme === 'dark' ? '#8b949e' : '#656d76';
    const pnlColor = isPositive ? '#10b981' : '#f43f5e';
    const brandColor = '#3fb950';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=320,initial-scale=1">
<title>TradeClaw Portfolio</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${textPrimary};width:320px;height:160px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.card{width:296px;background:${cardBg};border:1px solid ${border};border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px}
.header{display:flex;align-items:center;justify-content:space-between}
.title{font-size:11px;font-weight:600;color:${textSecondary};text-transform:uppercase;letter-spacing:0.5px}
.balance{font-size:22px;font-weight:700;letter-spacing:-0.5px}
.pnl{font-size:14px;font-weight:600;color:${pnlColor}}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.stat{background:${bg};border-radius:8px;padding:8px 10px}
.stat-label{font-size:9px;color:${textSecondary};text-transform:uppercase;letter-spacing:0.5px}
.stat-value{font-size:13px;font-weight:600;margin-top:2px}
.footer{display:flex;align-items:center;justify-content:space-between;padding-top:4px}
.brand{font-size:10px;color:${textSecondary};text-decoration:none;display:flex;align-items:center;gap:4px}
.brand:hover{color:${brandColor}}
.brand svg{width:12px;height:12px}
.star{font-size:10px;color:${textSecondary};text-decoration:none;display:flex;align-items:center;gap:3px}
.star:hover{color:${brandColor}}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <span class="title">Portfolio</span>
    <span class="pnl">${esc(arrow)} ${esc(pnlSign)}${esc(totalReturn.toFixed(1))}%</span>
  </div>
  <div class="balance">$${esc(balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</div>
  <div class="stats">
    <div class="stat">
      <div class="stat-label">Win Rate</div>
      <div class="stat-value">${esc(winRate.toFixed(0))}%</div>
    </div>
    <div class="stat">
      <div class="stat-label">Open Positions</div>
      <div class="stat-value">${openPositions}</div>
    </div>
  </div>
  <div class="footer">
    <a href="https://github.com/naimkatiman/tradeclaw" target="_blank" rel="noopener" class="brand">
      ${TRADECLAW_LOGO_SVG(16, 'widget')}
      TradeClaw
    </a>
    <a href="https://github.com/naimkatiman/tradeclaw" target="_blank" rel="noopener" class="star">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="${textSecondary}"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/></svg>
      Star
    </a>
  </div>
</div>
<script>
(function refresh(){
  setTimeout(function(){
    fetch(location.href).then(function(r){return r.text()}).then(function(html){
      document.open();document.write(html);document.close();
    }).catch(function(){});
    refresh();
  },60000);
})();
</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, max-age=30',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Frame-Options': 'ALLOWALL',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
