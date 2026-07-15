import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = {
      version: "1.0.0",
      name: "TradeClaw Public API",
      description: "Public API for TradeClaw rule-generated research candidates and observed-provenance outcome studies",
      docs: "https://tradeclaw.win/api-docs",
      openapi: "https://tradeclaw.win/api/openapi",
      repository: "https://github.com/naimkatiman/tradeclaw",
      license: "MIT",
      baseUrl: "https://tradeclaw.win/api/v1",
      endpoints: {
        signals: {
          url: "/api/v1/signals",
          description: "Current rule-generated market candidates. The confidence field is a mechanical rule score, not a probability of profit.",
          params: {
            pair: "Filter by asset pair (e.g. BTCUSD, XAUUSD)",
            direction: "Filter by BUY or SELL",
            timeframe: "Filter by timeframe: M5, M15, H1, H4, D1",
            limit: "Number of results (default: 20, max: 100)",
          },
        },
        leaderboard: {
          url: "/api/v1/leaderboard",
          description: "OHLCV-resolved directional outcome study by asset. These are not broker fills or portfolio returns.",
          params: {
            period: "7d, 30d, or all (default: 30d)",
            sort: "hitRate, totalSignals, or avgConfidence (mechanical rule score)",
          },
        },
        winRates: {
          url: "/api/v1/win-rates",
          description: "Equal-weight 24h directional outcomes with approved observed-OHLCV provenance; unavailable data fails closed.",
        },
        badge: {
          url: "/api/v1/badge/:pair",
          description: "Dynamic badge endpoint (shields.io compatible) for any README",
          example: "/api/v1/badge/BTCUSD",
        },
        regime: {
          url: "/api/v1/regime",
          description: "Latest persisted market-regime observation, or an explicit unavailable response when no observation exists.",
          params: {
            symbol: "Filter by symbol (e.g. BTCUSD). Omit for all symbols.",
          },
        },
        health: {
          url: "/api/v1/health",
          description: "Current process health, version, and process uptime",
        },
      },
      rateLimit: {
        default: "60 requests/minute per IP per application instance",
        publicFeeds: "300 requests/minute per IP per application instance for configured feed paths",
        limitation: "The built-in limiter is in-memory and is not a distributed quota across replicas.",
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
