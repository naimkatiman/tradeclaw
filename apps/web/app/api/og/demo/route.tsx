// apps/web/app/api/og/demo/route.tsx
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? 'BTCUSD';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ fontSize: 24, color: '#71717a', marginBottom: 12 }}>
          TRADECLAW LIVE DEMO
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: '#ffffff', marginBottom: 8 }}>
          {symbol}
        </div>
        <div style={{ fontSize: 20, color: '#a1a1aa' }}>
          AI Trading Signals — No Login Required
        </div>
        <div style={{ fontSize: 16, color: '#52525b', marginTop: 24 }}>
          tradeclaw.win/demo
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
