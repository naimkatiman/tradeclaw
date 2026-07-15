import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Chrome Extension — TradeClaw',
  description:
    'Install the TradeClaw Chrome extension to pin live BTC, ETH, and XAU signal badges in your browser for faster monitoring and higher trust.',
};

const installSteps = [
  'Download the ZIP bundle and unzip it locally.',
  'Open chrome://extensions and enable Developer mode.',
  'Click Load unpacked, then choose the unzipped TradeClaw extension folder.',
  'Open Options, set your TradeClaw base URL, and grant origin access when prompted.',
];

const highlights = [
  {
    title: 'Live signal badges',
    text: 'BTCUSD, ETHUSD, and XAUUSD appear in the popup with direction, a mechanical rule score, and a quick link back to TradeClaw.',
  },
  {
    title: 'Self-host ready',
    text: 'Point the extension at your own deployment so every self-hosted install gets a lightweight browser surface.',
  },
  {
    title: 'Low-friction trust hook',
    text: 'A pinned toolbar badge keeps TradeClaw visible between trading sessions and shortens the path back to the dashboard.',
  },
];

export default function ChromeExtensionPage() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="kicker">Acquisition surface</p>
          <h1 className="h1">Chrome extension for instant signal badges.</h1>
          <p className="lead">
            TradeClaw now ships a browser extension scaffold so users can pin live BTC, ETH, and XAU
            signal badges directly in the toolbar — a small trust surface that keeps the product in
            front of traders all day.
          </p>
          <div className="action-row" style={{ marginTop: 20 }}>
            <Link className="button" href="/downloads/tradeclaw-extension.zip">
              Download ZIP
            </Link>
            <Link className="button button-secondary" href="/api/widget/extension" target="_blank" rel="noreferrer">
              Preview JSON
            </Link>
            <Link className="button button-ghost" href="/dashboard">
              Open dashboard
            </Link>
          </div>
        </div>

        <aside className="panel">
          <div className="panel-title">Popup screenshot</div>
          <img
            className="preview"
            src="/chrome-extension-preview.svg"
            alt="TradeClaw Chrome extension popup preview"
          />
        </aside>
      </section>

      <section className="stat-grid" style={{ marginBottom: 18 }}>
        {[
          { label: 'Toolbar badges', value: '3', note: 'BTC, ETH, XAU' },
          { label: 'API path', value: '/api/widget/extension', note: 'Live JSON' },
          { label: 'Install mode', value: 'Load unpacked', note: 'Chrome dev mode' },
        ].map((item) => (
          <article key={item.label} className="stat">
            <strong>{item.value}</strong>
            <span className="small">{item.label}</span>
            <div className="small" style={{ marginTop: 4 }}>
              {item.note}
            </div>
          </article>
        ))}
      </section>

      <section className="grid two" style={{ marginBottom: 18 }}>
        {highlights.map((item) => (
          <article key={item.title} className="card" style={{ padding: 22 }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 8 }}>{item.title}</h2>
            <p className="lead" style={{ fontSize: '0.98rem' }}>
              {item.text}
            </p>
          </article>
        ))}
      </section>

      <section className="grid two" style={{ marginBottom: 18 }}>
        <article className="card" style={{ padding: 22 }}>
          <div className="panel-title">Install steps</div>
          <ol className="checklist">
            {installSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>

        <article className="card" style={{ padding: 22 }}>
          <div className="panel-title">What the popup shows</div>
          <ul className="checklist">
            <li>Direction-first badges for fast scanning.</li>
            <li>Mechanical rule scores out of 100; they are not predictive probabilities.</li>
            <li>Signal timestamps and one-click links back to TradeClaw.</li>
            <li>Base URL settings for self-hosted installs.</li>
          </ul>
        </article>
      </section>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}>
        <div className="panel-title">Trust and distribution</div>
        <p className="lead" style={{ fontSize: '0.98rem', marginBottom: 14 }}>
          The extension gives TradeClaw a passive acquisition surface outside the main app. It keeps
          the brand visible, shortens the return-to-dashboard loop, and makes it easier to convert
          curious visitors into recurring users.
        </p>
        <div className="button-row">
          <Link className="button" href="/downloads/tradeclaw-extension.zip">
            Download ZIP
          </Link>
          <Link className="button button-secondary" href="/docs">
            Open docs
          </Link>
          <Link className="button button-ghost" href="/pricing">
            See pricing
          </Link>
        </div>
      </section>

      <section className="card" style={{ padding: 22 }}>
        <div className="panel-title">Extension API payload</div>
        <pre className="code">{`{
  "generatedAt": "2026-05-16T09:00:00.000Z",
  "baseUrl": "https://tradeclaw.win",
  "pairs": ["BTCUSD", "ETHUSD", "XAUUSD"],
  "signals": [
    { "symbol": "BTCUSD", "direction": "BUY", "confidence": 82, "signalUrl": "https://tradeclaw.win/signal/..." },
    { "symbol": "ETHUSD", "direction": "SELL", "confidence": 74, "signalUrl": "https://tradeclaw.win/signal/..." },
    { "symbol": "XAUUSD", "direction": "NEUTRAL", "confidence": 0, "signalUrl": "https://tradeclaw.win/dashboard" }
  ]
}`}</pre>
        <p className="small" style={{ marginTop: 12 }}>
          The legacy <code>confidence</code> field contains the mechanical rule score out of 100, not a
          calibrated probability.
        </p>
      </section>
    </main>
  );
}
