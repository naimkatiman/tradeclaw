import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = {
      version: "1.0.0",
      name: "TradeClaw Public API",
      description: "Open-source AI trading signal platform API — free, no auth required for public endpoints",
      docs: "https://tradeclaw.win/api-docs",
      openapi: "https://tradeclaw.win/api/openapi",
      repository: "https://github.com/naimkatiman/tradeclaw",
      license: "MIT",
      baseUrl: "https://tradeclaw.win/api/v1",
      endpoints: {
        signals: {
          url: "/api/v1/signals",
          description: "Live trading signals for all asset pairs",
          params: {
            pair: "Filter by asset pair (e.g. BTCUSD, XAUUSD)",
            direction: "Filter by BUY or SELL",
            timeframe: "Filter by timeframe: M5, M15, H1, H4, D1",
            limit: "Number of results (default: 20, max: 100)",
          },
        },
        leaderboard: {
          url: "/api/v1/leaderboard",
          description: "Signal accuracy leaderboard with win rates and performance stats",
          params: {
            period: "7d, 30d, or all (default: 30d)",
            sort: "hitRate, totalSignals, or avgConfidence",
          },
        },
        accuracy: {
          url: "/api/v1/accuracy",
          description: "Historical signal accuracy stats and win/loss breakdown",
        },
        badge: {
          url: "/api/v1/badge/:pair",
          description: "Dynamic badge endpoint (shields.io compatible) for any README",
          example: "/api/v1/badge/BTCUSD",
        },
        regime: {
          url: "/api/v1/regime",
          description: "HMM-based market regime classification (crash/bear/neutral/bull/euphoria)",
          params: {
            symbol: "Filter by symbol (e.g. BTCUSD). Omit for all symbols.",
          },
        },
        health: {
          url: "/api/v1/health",
          description: "API health check — uptime, version, signal count",
        },
      },
      rateLimit: {
        public: "60 requests/minute",
        authenticated: "600 requests/minute (use API keys from /api-keys)",
      },
      examples: {
        curl: "curl https://tradeclaw.win/api/v1/signals?pair=BTCUSD&limit=5",
        javascript: "const res = await fetch('https://tradeclaw.win/api/v1/signals'); const { signals } = await res.json();",
        python: "import requests; data = requests.get('https://tradeclaw.win/api/v1/signals').json()",
      },
    };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
