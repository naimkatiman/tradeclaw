export function getPage(port) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TradeClaw — Live Signal Demo</title>
  <style>
    /* ── Reset & Variables ─────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:          #0a0a0f;
      --surface:     #111118;
      --surface2:    #1a1a24;
      --border:      #1e1e2e;
      --border2:     #2a2a3e;
      --emerald:     #10b981;
      --emerald-dim: #059669;
      --emerald-glow:#10b98133;
      --rose:        #f43f5e;
      --rose-dim:    #e11d48;
      --rose-glow:   #f43f5e33;
      --text:        #e2e8f0;
      --text-dim:    #94a3b8;
      --text-muted:  #475569;
      --gold:        #f59e0b;
      --blue:        #3b82f6;
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
      min-height: 100vh;
      line-height: 1.6;
    }

    /* ── Animations ────────────────────────────────────────────── */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }
    @keyframes glow {
      0%, 100% { text-shadow: 0 0 8px var(--emerald-glow); }
      50%       { text-shadow: 0 0 24px var(--emerald), 0 0 48px var(--emerald-glow); }
    }
    @keyframes cardFlash {
      0%   { background: var(--surface); }
      30%  { background: var(--emerald-glow); }
      100% { background: var(--surface); }
    }
    @keyframes cardFlashSell {
      0%   { background: var(--surface); }
      30%  { background: var(--rose-glow); }
      100% { background: var(--surface); }
    }
    @keyframes scanline {
      0%   { top: -4px; }
      100% { top: 100%; }
    }
    @keyframes ticker {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* ── Navbar ────────────────────────────────────────────────── */
    .navbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(10,10,15,0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 56px;
    }
    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text);
    }
    .navbar-brand svg { width: 28px; height: 28px; }
    .brand-name {
      font-size: 18px;
      font-weight: 700;
      color: var(--emerald);
      animation: glow 3s ease-in-out infinite;
      letter-spacing: -0.5px;
    }
    .brand-badge {
      font-size: 10px;
      background: var(--emerald-glow);
      border: 1px solid var(--emerald);
      color: var(--emerald);
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .navbar-actions { display: flex; align-items: center; gap: 8px; }
    .btn-star {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--emerald);
      color: #000;
      border: none;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s, box-shadow 0.2s;
      font-family: inherit;
    }
    .btn-star:hover {
      background: #0ea875;
      box-shadow: 0 0 16px var(--emerald-glow);
    }
    .btn-deploy {
      display: flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      color: var(--text-dim);
      border: 1px solid var(--border2);
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: border-color 0.2s, color 0.2s;
      font-family: inherit;
    }
    .btn-deploy:hover { border-color: var(--emerald); color: var(--emerald); }

    /* ── Ticker tape ───────────────────────────────────────────── */
    .ticker-wrap {
      overflow: hidden;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      height: 32px;
      display: flex;
      align-items: center;
    }
    .ticker-track {
      display: flex;
      gap: 0;
      white-space: nowrap;
      animation: ticker 40s linear infinite;
    }
    .ticker-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 24px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-dim);
      border-right: 1px solid var(--border);
    }
    .ticker-item .up   { color: var(--emerald); }
    .ticker-item .down { color: var(--rose); }

    /* ── Hero ──────────────────────────────────────────────────── */
    .hero {
      padding: 48px 24px 32px;
      text-align: center;
      animation: fadeIn 0.6s ease-out;
    }
    .hero-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--emerald);
      border: 1px solid var(--emerald-glow);
      background: var(--emerald-glow);
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .live-dot {
      width: 7px; height: 7px;
      background: var(--emerald);
      border-radius: 50%;
      animation: pulse 1.4s ease-in-out infinite;
      display: inline-block;
    }
    h1 {
      font-size: clamp(28px, 5vw, 52px);
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -1px;
      margin-bottom: 12px;
    }
    h1 .accent { color: var(--emerald); }
    .hero-sub {
      font-size: 16px;
      color: var(--text-dim);
      max-width: 520px;
      margin: 0 auto 28px;
    }
    .hero-npx {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: var(--surface);
      border: 1px solid var(--border2);
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      color: var(--emerald);
      font-weight: 600;
    }
    .hero-npx .dollar { color: var(--text-muted); }

    /* ── Stats bar ─────────────────────────────────────────────── */
    .stats-bar {
      display: flex;
      justify-content: center;
      gap: 0;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      animation: fadeIn 0.7s ease-out 0.1s both;
    }
    .stat-item {
      flex: 1;
      max-width: 220px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 20px;
      border-right: 1px solid var(--border);
    }
    .stat-item:last-child { border-right: none; }
    .stat-num {
      font-size: 28px;
      font-weight: 800;
      color: var(--emerald);
      line-height: 1;
    }
    .stat-label {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── Section ───────────────────────────────────────────────── */
    .section { padding: 48px 24px; max-width: 1200px; margin: 0 auto; }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title .dot { color: var(--emerald); }
    .refresh-note {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* ── Signal cards grid ─────────────────────────────────────── */
    .signals-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
    }
    @media (max-width: 1100px) { .signals-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 700px)  { .signals-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 440px)  { .signals-grid { grid-template-columns: 1fr; } }

    .signal-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      position: relative;
      overflow: hidden;
      transition: border-color 0.2s, transform 0.15s;
      animation: fadeIn 0.5s ease-out both;
    }
    .signal-card:hover {
      border-color: var(--border2);
      transform: translateY(-2px);
    }
    .signal-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: var(--emerald);
      border-radius: 10px 10px 0 0;
    }
    .signal-card.sell::before { background: var(--rose); }

    .card-flash-buy  { animation: cardFlash 0.6s ease-out; }
    .card-flash-sell { animation: cardFlashSell 0.6s ease-out; }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .card-symbol {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }
    .card-live {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: var(--text-muted);
      font-weight: 600;
    }
    .card-price {
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 4px;
      letter-spacing: -0.5px;
    }
    .card-change {
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .card-change.up   { color: var(--emerald); }
    .card-change.down { color: var(--rose); }

    .direction-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .direction-badge.buy {
      background: var(--emerald-glow);
      border: 1px solid var(--emerald);
      color: var(--emerald);
    }
    .direction-badge.sell {
      background: var(--rose-glow);
      border: 1px solid var(--rose);
      color: var(--rose);
    }

    .confidence-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .confidence-label { font-size: 10px; color: var(--text-muted); }
    .confidence-pct { font-size: 11px; font-weight: 700; color: var(--text-dim); }
    .confidence-bar {
      width: 100%;
      height: 4px;
      background: var(--border2);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .confidence-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--emerald-dim), var(--emerald));
      border-radius: 2px;
      transition: width 0.6s ease;
    }
    .confidence-fill.sell-fill {
      background: linear-gradient(90deg, var(--rose-dim), var(--rose));
    }

    .card-levels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 10px;
    }
    .level-item { font-size: 10px; }
    .level-key { color: var(--text-muted); display: block; margin-bottom: 1px; }
    .level-val { font-weight: 600; color: var(--text-dim); }
    .level-val.tp { color: var(--emerald); }
    .level-val.sl { color: var(--rose); }

    .card-indicators {
      display: flex;
      gap: 8px;
      border-top: 1px solid var(--border);
      padding-top: 10px;
    }
    .indicator-pill {
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 4px;
      background: var(--surface2);
      color: var(--text-dim);
      font-weight: 600;
    }

    /* ── Comparison table ──────────────────────────────────────── */
    .compare-section { padding: 0 24px 48px; max-width: 1000px; margin: 0 auto; }
    .compare-table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
      animation: fadeIn 0.8s ease-out 0.2s both;
    }
    .compare-table th {
      padding: 16px 20px;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      background: var(--surface2);
      border-bottom: 1px solid var(--border2);
    }
    .compare-table th:first-child { text-align: left; }
    .compare-table th.highlight {
      color: var(--emerald);
      background: var(--emerald-glow);
      border: 1px solid var(--emerald);
      border-top: none;
    }
    .compare-table td {
      padding: 13px 20px;
      text-align: center;
      font-size: 13px;
      border-bottom: 1px solid var(--border);
      color: var(--text-dim);
    }
    .compare-table td:first-child { text-align: left; color: var(--text); font-weight: 500; }
    .compare-table td.highlight { background: rgba(16,185,129,0.04); }
    .compare-table tr:last-child td { border-bottom: none; }
    .compare-table tr:hover td { background: var(--surface2); }
    .compare-table tr:hover td.highlight { background: rgba(16,185,129,0.08); }
    .check { color: var(--emerald); font-weight: 700; }
    .cross { color: var(--text-muted); }
    .partial { color: var(--gold); font-size: 11px; }

    /* ── CTA section ───────────────────────────────────────────── */
    .cta-section {
      padding: 48px 24px;
      text-align: center;
      border-top: 1px solid var(--border);
      background: linear-gradient(180deg, var(--bg) 0%, var(--surface) 100%);
      animation: fadeIn 0.9s ease-out 0.3s both;
    }
    .cta-title {
      font-size: clamp(22px, 4vw, 36px);
      font-weight: 800;
      margin-bottom: 12px;
    }
    .cta-sub {
      color: var(--text-dim);
      font-size: 15px;
      margin-bottom: 28px;
    }
    .cta-buttons {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn-github {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--emerald);
      color: #000;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 800;
      transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
      font-family: inherit;
    }
    .btn-github:hover {
      background: #0ea875;
      box-shadow: 0 0 32px var(--emerald-glow);
      transform: translateY(-2px);
    }
    .btn-deploy-big {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      color: var(--text);
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 700;
      border: 1px solid var(--border2);
      transition: border-color 0.2s, color 0.2s, transform 0.15s;
      font-family: inherit;
    }
    .btn-deploy-big:hover {
      border-color: var(--emerald);
      color: var(--emerald);
      transform: translateY(-2px);
    }

    /* ── Footer ────────────────────────────────────────────────── */
    footer {
      padding: 24px;
      text-align: center;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    footer p { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
    footer a { color: var(--text-dim); text-decoration: none; }
    footer a:hover { color: var(--emerald); }
    .footer-links { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }

    /* ── Scanline overlay (subtle CRT effect) ──────────────────── */
    body::after {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0,0,0,0.03) 2px,
        rgba(0,0,0,0.03) 4px
      );
      pointer-events: none;
      z-index: 9999;
    }

    @media (max-width: 600px) {
      .stats-bar { flex-wrap: wrap; }
      .stat-item { min-width: 50%; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }
      .navbar-actions .btn-deploy { display: none; }
      .compare-table { font-size: 12px; }
      .compare-table th, .compare-table td { padding: 10px 12px; }
    }
  </style>
</head>
<body>

  <!-- ── Navbar ──────────────────────────────────────────────────────── -->
  <nav class="navbar">
    <a href="#" class="navbar-brand">
      <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2L4 8V20L14 26L24 20V8L14 2Z" fill="#10b981" opacity="0.15"/>
        <path d="M14 2L4 8V20L14 26L24 20V8L14 2Z" stroke="#10b981" stroke-width="1.5"/>
        <path d="M8 14L11 11L14 14L17 11L20 14" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 14V20" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span class="brand-name">TradeClaw</span>
      <span class="brand-badge">DEMO</span>
    </a>
    <div class="navbar-actions">
      <a href="https://github.com/naimkatiman/tradeclaw" target="_blank" rel="noopener" class="btn-deploy">
        ☁ Deploy your own
      </a>
      <a href="https://github.com/naimkatiman/tradeclaw" target="_blank" rel="noopener" class="btn-star">
        ⭐ Star on GitHub
      </a>
    </div>
  </nav>

  <!-- ── Ticker tape ──────────────────────────────────────────────────── -->
  <div class="ticker-wrap">
    <div class="ticker-track" id="ticker">
      <span class="ticker-item">BTC/USD <span class="up">▲ $67,420</span> +1.24%</span>
      <span class="ticker-item">ETH/USD <span class="up">▲ $3,541</span> +0.87%</span>
      <span class="ticker-item">XAU/USD <span class="up">▲ $2,318</span> +0.31%</span>
      <span class="ticker-item">EUR/USD <span class="down">▼ 1.0852</span> -0.12%</span>
      <span class="ticker-item">GBP/USD <span class="down">▼ 1.2641</span> -0.08%</span>
      <span class="ticker-item">SOL/USD <span class="up">▲ $142.80</span> +2.11%</span>
      <span class="ticker-item">XAG/USD <span class="up">▲ $27.14</span> +0.62%</span>
      <span class="ticker-item">USD/JPY <span class="down">▼ 151.82</span> -0.18%</span>
      <!-- duplicate for seamless loop -->
      <span class="ticker-item">BTC/USD <span class="up">▲ $67,420</span> +1.24%</span>
      <span class="ticker-item">ETH/USD <span class="up">▲ $3,541</span> +0.87%</span>
      <span class="ticker-item">XAU/USD <span class="up">▲ $2,318</span> +0.31%</span>
      <span class="ticker-item">EUR/USD <span class="down">▼ 1.0852</span> -0.12%</span>
      <span class="ticker-item">GBP/USD <span class="down">▼ 1.2641</span> -0.08%</span>
      <span class="ticker-item">SOL/USD <span class="up">▲ $142.80</span> +2.11%</span>
      <span class="ticker-item">XAG/USD <span class="up">▲ $27.14</span> +0.62%</span>
      <span class="ticker-item">USD/JPY <span class="down">▼ 151.82</span> -0.18%</span>
    </div>
  </div>

  <!-- ── Hero ────────────────────────────────────────────────────────── -->
  <div class="hero">
    <div class="hero-tag">
      <span class="live-dot"></span>
      LIVE DEMO — Running locally on port ${port}
    </div>
    <h1>
      AI Trading Signals.<br/>
      <span class="accent">Self-hosted. Free forever.</span>
    </h1>
    <p class="hero-sub">
      Open-source platform for AI-powered trading signals across forex, crypto &amp; metals.
      No subscription. No cloud lock-in. Deploy anywhere with Docker.
    </p>
    <div class="hero-npx">
      <span class="dollar">$</span>
      <span>npx tradeclaw-demo</span>
      <span style="color:var(--text-muted);font-size:11px;margin-left:4px">← you ran this</span>
    </div>
  </div>

  <!-- ── Stats bar ────────────────────────────────────────────────────── -->
  <div class="stats-bar">
    <div class="stat-item">
      <span class="stat-num" id="stat-signals">47</span>
      <span class="stat-label">Signals Today</span>
    </div>
    <div class="stat-item">
      <span class="stat-num" id="stat-winrate">73%</span>
      <span class="stat-label">Win Rate</span>
    </div>
    <div class="stat-item">
      <span class="stat-num" id="stat-assets">12</span>
      <span class="stat-label">Assets Tracked</span>
    </div>
    <div class="stat-item">
      <span class="stat-num" id="stat-latency">~2s</span>
      <span class="stat-label">Signal Latency</span>
    </div>
  </div>

  <!-- ── Live Signal Cards ─────────────────────────────────────────────── -->
  <div class="section">
    <div class="section-header">
      <div class="section-title">
        <span class="dot">◆</span>
        Live Signal Feed
        <span style="margin-left:4px"><span class="live-dot"></span></span>
      </div>
      <div class="refresh-note" id="refresh-note">
        <span class="live-dot"></span>
        Refreshing every 5s
      </div>
    </div>
    <div class="signals-grid" id="signals-grid">
      <!-- Populated by JS -->
      ${[1,2,3,4,5].map(() => `
      <div class="signal-card">
        <div style="display:flex;gap:8px;flex-direction:column">
          <div style="height:14px;background:var(--surface2);border-radius:4px;width:70%"></div>
          <div style="height:24px;background:var(--surface2);border-radius:4px;width:90%"></div>
          <div style="height:8px;background:var(--surface2);border-radius:4px;width:100%"></div>
          <div style="height:8px;background:var(--surface2);border-radius:4px;width:60%"></div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <!-- ── Comparison Table ───────────────────────────────────────────────── -->
  <div class="compare-section">
    <div class="section-header">
      <div class="section-title">
        <span class="dot">◆</span>
        How TradeClaw Compares
      </div>
    </div>
    <table class="compare-table">
      <thead>
        <tr>
          <th>Feature</th>
          <th class="highlight">🦞 TradeClaw</th>
          <th>TradingView</th>
          <th>Manual Trading</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>AI-generated signals</td>
          <td class="highlight"><span class="check">✓</span></td>
          <td><span class="cross">✗</span></td>
          <td><span class="cross">✗</span></td>
        </tr>
        <tr>
          <td>Self-hosted / open source</td>
          <td class="highlight"><span class="check">✓ MIT</span></td>
          <td><span class="cross">✗</span></td>
          <td><span class="cross">✗</span></td>
        </tr>
        <tr>
          <td>Price</td>
          <td class="highlight"><span class="check">Free forever</span></td>
          <td><span class="partial">$14.95–$59.95/mo</span></td>
          <td><span class="partial">Broker fees only</span></td>
        </tr>
        <tr>
          <td>Multi-asset (forex + crypto + metals)</td>
          <td class="highlight"><span class="check">✓ 15 assets</span></td>
          <td><span class="check">✓</span></td>
          <td><span class="partial">Depends</span></td>
        </tr>
        <tr>
          <td>One-click Docker deploy</td>
          <td class="highlight"><span class="check">✓</span></td>
          <td><span class="cross">✗</span></td>
          <td><span class="cross">✗</span></td>
        </tr>
        <tr>
          <td>Telegram push notifications</td>
          <td class="highlight"><span class="check">✓</span></td>
          <td><span class="partial">Paid add-on</span></td>
          <td><span class="cross">✗</span></td>
        </tr>
        <tr>
          <td>RSI / MACD / EMA / Bollinger</td>
          <td class="highlight"><span class="check">✓ All built-in</span></td>
          <td><span class="check">✓</span></td>
          <td><span class="cross">Manual calc</span></td>
        </tr>
        <tr>
          <td>Backtesting engine</td>
          <td class="highlight"><span class="check">✓</span></td>
          <td><span class="partial">Pro only</span></td>
          <td><span class="cross">✗</span></td>
        </tr>
        <tr>
          <td>REST API access</td>
          <td class="highlight"><span class="check">✓ OpenAPI 3.0</span></td>
          <td><span class="partial">Limited</span></td>
          <td><span class="cross">✗</span></td>
        </tr>
        <tr>
          <td>Paper trading simulator</td>
          <td class="highlight"><span class="check">✓</span></td>
          <td><span class="partial">Paid plan</span></td>
          <td><span class="cross">✗</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── CTA ────────────────────────────────────────────────────────────── -->
  <div class="cta-section">
    <h2 class="cta-title">
      Ready to run <span style="color:var(--emerald)">your own</span> instance?
    </h2>
    <p class="cta-sub">
      3 commands. Your data. Your server. No subscriptions.
    </p>
    <div style="background:var(--surface);border:1px solid var(--border2);border-radius:8px;padding:14px 20px;display:inline-block;margin-bottom:28px;text-align:left">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Quick start:</div>
      <div style="font-size:13px;color:var(--emerald);font-weight:600;line-height:2">
        <span style="color:var(--text-muted)">$</span> git clone https://github.com/naimkatiman/tradeclaw<br/>
        <span style="color:var(--text-muted)">$</span> cp .env.example .env<br/>
        <span style="color:var(--text-muted)">$</span> docker compose up -d
      </div>
    </div>
    <div class="cta-buttons">
      <a href="https://github.com/naimkatiman/tradeclaw" target="_blank" rel="noopener" class="btn-github">
        ⭐ Star on GitHub
      </a>
      <a href="https://github.com/naimkatiman/tradeclaw#quick-start" target="_blank" rel="noopener" class="btn-deploy-big">
        🚀 Deploy Your Own →
      </a>
    </div>
  </div>

  <!-- ── Footer ────────────────────────────────────────────────────────── -->
  <footer>
    <p>
      This is a <strong>local demo</strong> running on <code>localhost:${port}</code>.
      No data leaves your machine.
    </p>
    <div class="footer-links">
      <a href="https://github.com/naimkatiman/tradeclaw" target="_blank" rel="noopener">GitHub</a>
      <a href="https://github.com/naimkatiman/tradeclaw/blob/main/LICENSE" target="_blank" rel="noopener">MIT License</a>
      <a href="https://tradeclaw.win" target="_blank" rel="noopener">Live Demo</a>
      <a href="https://github.com/naimkatiman/tradeclaw/blob/main/docs/CONTRIBUTING.md" target="_blank" rel="noopener">Contribute</a>
    </div>
    <p style="margin-top:12px">
      Built with ❤️ by the TradeClaw community · v1.0.0
    </p>
  </footer>

  <!-- ── JS: live signal cards ─────────────────────────────────────────── -->
  <script>
    const API = '/api/signals';
    const grid = document.getElementById('signals-grid');

    function fmt(num, decimals) {
      if (decimals === 0) return Number(num).toLocaleString();
      return Number(num).toFixed(decimals);
    }

    function getDecimals(symbol) {
      if (symbol.includes('BTC')) return 0;
      if (symbol.includes('ETH')) return 2;
      if (symbol.includes('XAU') || symbol.includes('XAG')) return 2;
      return 4;
    }

    function renderCards(signals) {
      grid.innerHTML = signals.map((s, i) => {
        const dec = getDecimals(s.symbol);
        const isBuy = s.direction === 'BUY';
        const changeSign = s.change >= 0 ? '+' : '';
        const flashClass = isBuy ? 'card-flash-buy' : 'card-flash-sell';
        return \`
          <div class="signal-card \${isBuy ? '' : 'sell'} \${flashClass}" style="animation-delay:\${i * 0.07}s">
            <div class="card-header">
              <span class="card-symbol">\${s.symbol}</span>
              <span class="card-live">
                <span class="live-dot"></span>LIVE
              </span>
            </div>
            <div class="card-price">\${fmt(s.price, dec)}</div>
            <div class="card-change \${s.change >= 0 ? 'up' : 'down'}">
              \${changeSign}\${s.change}%
            </div>
            <div>
              <span class="direction-badge \${isBuy ? 'buy' : 'sell'}">
                \${isBuy ? '▲' : '▼'} \${s.direction}
              </span>
            </div>
            <div class="confidence-row">
              <span class="confidence-label">Confidence</span>
              <span class="confidence-pct">\${s.confidence}%</span>
            </div>
            <div class="confidence-bar">
              <div class="confidence-fill \${isBuy ? '' : 'sell-fill'}" style="width:\${s.confidence}%"></div>
            </div>
            <div class="card-levels">
              <div class="level-item">
                <span class="level-key">Take Profit</span>
                <span class="level-val tp">\${fmt(s.tp, dec)}</span>
              </div>
              <div class="level-item">
                <span class="level-key">Stop Loss</span>
                <span class="level-val sl">\${fmt(s.sl, dec)}</span>
              </div>
            </div>
            <div class="card-indicators">
              <span class="indicator-pill">RSI \${s.rsi}</span>
              <span class="indicator-pill">MACD \${s.macd > 0 ? '+' : ''}\${s.macd}</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    async function fetchSignals() {
      try {
        const res = await fetch(API);
        const data = await res.json();
        renderCards(data);
        // Bump signal counter
        const el = document.getElementById('stat-signals');
        if (el) {
          const n = parseInt(el.textContent, 10);
          if (Math.random() > 0.6) el.textContent = n + 1;
        }
      } catch (e) {
        console.error('Signal fetch failed:', e);
      }
    }

    // Initial load
    fetchSignals();
    // Auto-refresh every 5s
    setInterval(fetchSignals, 5000);

    // Count-up animation for stats
    function countUp(el, target, suffix = '') {
      let current = 0;
      const step = Math.ceil(target / 40);
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current + suffix;
        if (current >= target) clearInterval(interval);
      }, 30);
    }

    window.addEventListener('DOMContentLoaded', () => {
      const winrate = document.getElementById('stat-winrate');
      const assets  = document.getElementById('stat-assets');
      if (winrate) countUp(winrate, 73, '%');
      if (assets)  countUp(assets, 12);
    });
  </script>
</body>
</html>`;
}
