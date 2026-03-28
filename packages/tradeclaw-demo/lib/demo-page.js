'use strict';

function getDemoPage(port) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TradeClaw — AI Trading Signals Demo</title>
  <meta name="description" content="AI-powered trading signals for Forex, Crypto & Commodities. Open-source & self-hostable." />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080b10;
      --surface: #0f1520;
      --surface2: #141c2e;
      --border: #1e2d47;
      --emerald: #10b981;
      --emerald-dim: rgba(16,185,129,0.15);
      --rose: #f43f5e;
      --rose-dim: rgba(244,63,94,0.15);
      --text: #e2e8f0;
      --muted: #64748b;
      --accent: #3b82f6;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.5;
      min-height: 100vh;
    }

    /* NAV */
    nav {
      border-bottom: 1px solid var(--border);
      padding: 0 1.5rem;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      background: rgba(8,11,16,0.9);
      backdrop-filter: blur(12px);
      z-index: 100;
    }
    .nav-logo {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--emerald);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
    }
    .nav-badge {
      background: var(--emerald-dim);
      color: var(--emerald);
      font-size: 0.65rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(16,185,129,0.3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .nav-actions { display: flex; gap: 0.75rem; align-items: center; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      border: none;
      transition: all 0.2s;
    }
    .btn-ghost {
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--border);
    }
    .btn-ghost:hover { color: var(--text); border-color: var(--emerald); }
    .btn-star {
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      color: white;
    }
    .btn-star:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(245,158,11,0.3); }
    .btn-primary {
      background: var(--emerald);
      color: #000;
    }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

    /* HERO */
    .hero {
      text-align: center;
      padding: 4rem 1.5rem 3rem;
      max-width: 860px;
      margin: 0 auto;
    }
    .hero-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--emerald-dim);
      color: var(--emerald);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid rgba(16,185,129,0.25);
      margin-bottom: 1.5rem;
    }
    .live-dot {
      width: 7px; height: 7px;
      background: var(--emerald);
      border-radius: 50%;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%,100% { opacity:1; transform:scale(1); }
      50% { opacity:0.5; transform:scale(0.8); }
    }
    .hero h1 {
      font-size: clamp(2rem, 5vw, 3.2rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin-bottom: 1rem;
    }
    .hero h1 span { color: var(--emerald); }
    .hero p {
      font-size: 1.1rem;
      color: var(--muted);
      max-width: 560px;
      margin: 0 auto 2rem;
    }
    .hero-ctas { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

    /* STATS BAR */
    .stats-bar {
      display: flex;
      gap: 2rem;
      justify-content: center;
      flex-wrap: wrap;
      padding: 1.5rem;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      margin-bottom: 3rem;
    }
    .stat { text-align: center; }
    .stat-value {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--emerald);
    }
    .stat-label { font-size: 0.78rem; color: var(--muted); margin-top: 2px; }

    /* SIGNALS SECTION */
    .section {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 1.5rem 4rem;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .section-title {
      font-size: 1.15rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .refresh-info { font-size: 0.78rem; color: var(--muted); }

    /* SIGNAL CARDS */
    .signals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .signal-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      transition: all 0.3s;
      position: relative;
      overflow: hidden;
    }
    .signal-card:hover {
      border-color: var(--emerald);
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(16,185,129,0.1);
    }
    .signal-card.buy { border-left: 3px solid var(--emerald); }
    .signal-card.sell { border-left: 3px solid var(--rose); }
    .card-glow {
      position: absolute;
      top: 0; right: 0;
      width: 120px; height: 120px;
      border-radius: 50%;
      filter: blur(40px);
      opacity: 0.08;
      pointer-events: none;
    }
    .card-glow.buy { background: var(--emerald); }
    .card-glow.sell { background: var(--rose); }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .card-symbol { font-size: 1rem; font-weight: 700; }
    .card-tf {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--surface2);
      color: var(--muted);
      margin-left: 0.5rem;
    }
    .signal-badge {
      font-size: 0.8rem;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 8px;
      letter-spacing: 0.05em;
    }
    .signal-badge.buy {
      background: var(--emerald-dim);
      color: var(--emerald);
      border: 1px solid rgba(16,185,129,0.3);
    }
    .signal-badge.sell {
      background: var(--rose-dim);
      color: var(--rose);
      border: 1px solid rgba(244,63,94,0.3);
    }
    .conf-row { margin-bottom: 0.75rem; }
    .conf-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--muted);
      margin-bottom: 4px;
    }
    .conf-label span { color: var(--text); font-weight: 600; }
    .conf-bar {
      height: 4px;
      background: var(--surface2);
      border-radius: 99px;
      overflow: hidden;
    }
    .conf-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.5s ease;
    }
    .conf-fill.buy { background: linear-gradient(90deg, #059669, #10b981); }
    .conf-fill.sell { background: linear-gradient(90deg, #be123c, #f43f5e); }
    .price-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .price-item { background: var(--surface2); border-radius: 8px; padding: 0.5rem 0.6rem; }
    .price-lbl { font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .price-val { font-size: 0.85rem; font-weight: 600; margin-top: 1px; }
    .price-val.tp { color: var(--emerald); }
    .price-val.sl { color: var(--rose); }
    .indicators { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .ind-pill {
      font-size: 0.7rem;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--surface2);
      color: var(--muted);
      border: 1px solid var(--border);
    }

    /* COMPARISON TABLE */
    .compare-section { max-width: 900px; margin: 0 auto; padding: 0 1.5rem 4rem; }
    .compare-title {
      font-size: 1.5rem;
      font-weight: 800;
      text-align: center;
      margin-bottom: 0.5rem;
    }
    .compare-sub {
      text-align: center;
      color: var(--muted);
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    .compare-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .compare-table th {
      background: var(--surface);
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 700;
      border-bottom: 2px solid var(--border);
      color: var(--muted);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .compare-table th:first-child { color: var(--text); }
    .compare-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    .compare-table tr:last-child td { border-bottom: none; }
    .compare-table tr:hover td { background: var(--surface2); }
    .check { color: var(--emerald); font-weight: 700; }
    .cross { color: var(--rose); }
    .partial { color: #f59e0b; }
    .highlight-col {
      background: var(--emerald-dim) !important;
      border-left: 2px solid var(--emerald);
      border-right: 2px solid var(--emerald);
    }

    /* CTA SECTION */
    .cta-section {
      text-align: center;
      padding: 4rem 1.5rem;
      border-top: 1px solid var(--border);
      background: linear-gradient(180deg, transparent, rgba(16,185,129,0.04));
    }
    .cta-section h2 {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 0.75rem;
    }
    .cta-section p { color: var(--muted); margin-bottom: 2rem; }
    .cta-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .btn-big {
      padding: 0.8rem 2rem;
      font-size: 1rem;
      border-radius: 12px;
    }

    /* FOOTER */
    footer {
      border-top: 1px solid var(--border);
      padding: 1.5rem;
      text-align: center;
      color: var(--muted);
      font-size: 0.8rem;
    }
    footer a { color: var(--emerald); text-decoration: none; }

    /* ANIMATIONS */
    @keyframes fadeIn {
      from { opacity:0; transform:translateY(12px); }
      to { opacity:1; transform:translateY(0); }
    }
    .animate-in { animation: fadeIn 0.4s ease forwards; }
    .stagger { animation-delay: calc(var(--i) * 0.06s); opacity: 0; }
  </style>
</head>
<body>

<nav>
  <a class="nav-logo" href="https://github.com/naimkatiman/tradeclaw" target="_blank">
    ⚡ TradeClaw
    <span class="nav-badge">Demo</span>
  </a>
  <div class="nav-actions">
    <a class="btn btn-ghost" href="https://tradeclaw.win" target="_blank">Live App ↗</a>
    <a class="btn btn-star" href="https://github.com/naimkatiman/tradeclaw" target="_blank">
      ⭐ Star on GitHub
    </a>
  </div>
</nav>

<div class="hero">
  <div class="hero-tag">
    <span class="live-dot"></span>
    Local Demo — Signals refreshing live
  </div>
  <h1>AI-Powered <span>Trading Signals</span><br/>for Serious Traders</h1>
  <p>RSI, MACD, EMA, Bollinger Bands + multi-timeframe confluence. Open-source, self-hostable, no subscriptions.</p>
  <div class="hero-ctas">
    <a class="btn btn-star btn-big" href="https://github.com/naimkatiman/tradeclaw" target="_blank">⭐ Star on GitHub</a>
    <a class="btn btn-primary btn-big" href="https://tradeclaw.win" target="_blank">🌐 Live Demo</a>
    <a class="btn btn-ghost btn-big" href="https://github.com/naimkatiman/tradeclaw#readme" target="_blank">📖 Docs</a>
  </div>
</div>

<div class="stats-bar">
  <div class="stat">
    <div class="stat-value" id="signal-count">47</div>
    <div class="stat-label">Signals Today</div>
  </div>
  <div class="stat">
    <div class="stat-value">73%</div>
    <div class="stat-label">Historical Win Rate</div>
  </div>
  <div class="stat">
    <div class="stat-value">12</div>
    <div class="stat-label">Asset Pairs</div>
  </div>
  <div class="stat">
    <div class="stat-value">5</div>
    <div class="stat-label">Indicators Used</div>
  </div>
  <div class="stat">
    <div class="stat-value" id="gh-stars">⭐ 0</div>
    <div class="stat-label">GitHub Stars</div>
  </div>
</div>

<!-- SIGNALS SECTION -->
<div class="section">
  <div class="section-header">
    <div class="section-title">
      <span class="live-dot"></span>
      Live Signals
    </div>
    <div class="refresh-info" id="refresh-info">Auto-refreshing every 10s</div>
  </div>
  <div class="signals-grid" id="signals-grid">
    <div style="color:var(--muted);padding:2rem">Loading signals...</div>
  </div>
</div>

<!-- COMPARISON TABLE -->
<div class="compare-section">
  <h2 class="compare-title">Why TradeClaw?</h2>
  <p class="compare-sub">See how we stack up against the alternatives</p>
  <table class="compare-table">
    <thead>
      <tr>
        <th>Feature</th>
        <th class="highlight-col" style="color:var(--emerald)">⚡ TradeClaw</th>
        <th>TradingView</th>
        <th>3Commas</th>
        <th>Manual TA</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Open Source</td>
        <td class="check highlight-col">✓ MIT</td>
        <td class="cross">✗</td>
        <td class="cross">✗</td>
        <td class="cross">N/A</td>
      </tr>
      <tr>
        <td>Self-Hostable</td>
        <td class="check highlight-col">✓ Docker</td>
        <td class="cross">✗</td>
        <td class="cross">✗</td>
        <td class="check">✓</td>
      </tr>
      <tr>
        <td>AI Signal Engine</td>
        <td class="check highlight-col">✓ 5 indicators</td>
        <td class="partial">~ Pine Script</td>
        <td class="check">✓</td>
        <td class="cross">✗</td>
      </tr>
      <tr>
        <td>Multi-Timeframe</td>
        <td class="check highlight-col">✓ H1/H4/D1</td>
        <td class="check">✓</td>
        <td class="partial">~</td>
        <td class="partial">~ Manual</td>
      </tr>
      <tr>
        <td>Telegram Bot</td>
        <td class="check highlight-col">✓ Built-in</td>
        <td class="cross">✗</td>
        <td class="check">✓</td>
        <td class="cross">✗</td>
      </tr>
      <tr>
        <td>Paper Trading</td>
        <td class="check highlight-col">✓ Included</td>
        <td class="partial">~ Paper</td>
        <td class="check">✓</td>
        <td class="cross">✗</td>
      </tr>
      <tr>
        <td>Monthly Cost</td>
        <td class="check highlight-col" style="font-weight:700">$0 forever</td>
        <td style="color:var(--rose)">$15–60</td>
        <td style="color:var(--rose)">$29–99</td>
        <td class="check">$0</td>
      </tr>
      <tr>
        <td>API Access</td>
        <td class="check highlight-col">✓ OpenAPI 3.0</td>
        <td class="partial">~ Limited</td>
        <td class="check">✓</td>
        <td class="cross">✗</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- CTA -->
<div class="cta-section">
  <h2>Ready to deploy your own?</h2>
  <p>One-click deploy on Railway, Vercel, or Docker. Takes 2 minutes.</p>
  <div class="cta-actions">
    <a class="btn btn-star btn-big" href="https://github.com/naimkatiman/tradeclaw" target="_blank">
      ⭐ Star on GitHub — Help us reach 1000 stars!
    </a>
    <a class="btn btn-primary btn-big" href="https://railway.app/template/tradeclaw" target="_blank">
      🚀 Deploy on Railway
    </a>
  </div>
</div>

<footer>
  <p>
    Built with ❤️ by <a href="https://github.com/naimkatiman" target="_blank">@naimkatiman</a> •
    <a href="https://github.com/naimkatiman/tradeclaw" target="_blank">GitHub</a> •
    <a href="https://tradeclaw.win" target="_blank">tradeclaw.win</a> •
    MIT License
  </p>
  <p style="margin-top:0.5rem;font-size:0.72rem">This is a local demo. Running on port ${port}.</p>
</footer>

<script>
  // Fetch and render signals
  async function loadSignals() {
    try {
      const r = await fetch('/api/signals');
      const data = await r.json();
      renderSignals(data.signals);
      document.getElementById('signal-count').textContent = data.count + '+';
      document.getElementById('refresh-info').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
    } catch (e) {
      document.getElementById('signals-grid').innerHTML = '<div style="color:var(--muted)">Could not load signals.</div>';
    }
  }

  function renderSignals(signals) {
    const grid = document.getElementById('signals-grid');
    grid.innerHTML = signals.map((s, i) => {
      const dir = s.direction.toLowerCase();
      return \`
      <div class="signal-card \${dir} animate-in stagger" style="--i:\${i}">
        <div class="card-glow \${dir}"></div>
        <div class="card-header">
          <div>
            <span class="card-symbol">\${s.symbol}</span>
            <span class="card-tf">\${s.timeframe}</span>
          </div>
          <span class="signal-badge \${dir}">\${s.direction}</span>
        </div>
        <div class="conf-row">
          <div class="conf-label">
            Confidence
            <span>\${s.confidence}%</span>
          </div>
          <div class="conf-bar">
            <div class="conf-fill \${dir}" style="width:\${s.confidence}%"></div>
          </div>
        </div>
        <div class="price-grid">
          <div class="price-item">
            <div class="price-lbl">Entry</div>
            <div class="price-val">\${s.entry}</div>
          </div>
          <div class="price-item">
            <div class="price-lbl">Take Profit</div>
            <div class="price-val tp">\${s.tp}</div>
          </div>
          <div class="price-item">
            <div class="price-lbl">Stop Loss</div>
            <div class="price-val sl">\${s.sl}</div>
          </div>
        </div>
        <div class="indicators">
          <span class="ind-pill">RSI \${s.rsi}</span>
          <span class="ind-pill">MACD \${s.macd}</span>
          <span class="ind-pill">LIVE</span>
        </div>
      </div>\`;
    }).join('');
  }

  // Fetch GitHub stars
  async function loadStars() {
    try {
      const r = await fetch('https://api.github.com/repos/naimkatiman/tradeclaw');
      const d = await r.json();
      document.getElementById('gh-stars').textContent = '⭐ ' + (d.stargazers_count || 0);
    } catch {}
  }

  // Live SSE stream — auto-updates signals as server pushes them
  function connectStream() {
    const es = new EventSource('/api/signals/stream');
    let reconnectTimer = null;

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.signals) {
          renderSignals(data.signals);
          // Flash the live indicator
          const dot = document.querySelector('.live-dot');
          if (dot) {
            dot.style.background = '#10b981';
            dot.style.boxShadow = '0 0 8px #10b981';
            setTimeout(() => {
              dot.style.background = '';
              dot.style.boxShadow = '';
            }, 500);
          }
        }
      } catch {}
    });

    es.onerror = () => {
      // Fallback to polling if SSE fails
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          es.close();
          reconnectTimer = null;
          // Try reconnect
          connectStream();
        }, 5000);
      }
    };

    return es;
  }

  // Init
  loadSignals();
  loadStars();
  // Start live SSE stream (falls back to polling on error)
  const sse = connectStream();
  // Polling fallback in case SSE drops
  setInterval(loadSignals, 30000);
</script>

</body>
</html>`;
}

module.exports = { getDemoPage };
