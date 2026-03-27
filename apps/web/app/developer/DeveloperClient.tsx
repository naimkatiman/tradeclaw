'use client';

import Link from 'next/link';

export default function DeveloperClient() {
  return (
    <div className="min-h-screen" style={{ background: '#050505', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-bold mb-4" style={{ color: '#fff' }}>
          Developer API
        </h1>
        <p className="text-base mb-8" style={{ color: '#6b7280' }}>
          Free API access to live TradeClaw trading signals. 1,000 requests/day. No credit card needed.
        </p>
        <div className="rounded-xl p-6 mb-8 text-left" style={{ background: '#0d0d0d', border: '1px solid #1f2937' }}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: '#10b981' }}>Base URL</h2>
          <code className="text-sm" style={{ color: '#9ca3af' }}>https://tradeclaw.win/api/v1</code>
          <h2 className="text-lg font-semibold mt-6 mb-3" style={{ color: '#10b981' }}>Endpoints</h2>
          <ul className="space-y-2 text-sm" style={{ color: '#9ca3af' }}>
            <li><code>GET /signals</code> — Latest trading signals</li>
            <li><code>GET /signals/:symbol</code> — Signals for a specific symbol</li>
            <li><code>GET /leaderboard</code> — Top performing signals</li>
          </ul>
        </div>
        <Link
          href="/"
          className="text-sm"
          style={{ color: '#10b981' }}
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
