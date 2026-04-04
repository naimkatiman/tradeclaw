import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "TradeClaw API",
      version: "1.0.0",
      description: "Real-time trading signals with multi-timeframe confluence scoring. Self-hostable, open source.",
      contact: { url: "https://github.com/naimkatiman/tradeclaw" }
    },
    servers: [
      { url: "https://tradeclaw.win", description: "Production" },
      { url: "http://localhost:3000", description: "Local" }
    ],
    paths: {
      "/api/v1/signals": {
        get: {
          summary: "Get live trading signals",
          description: "Returns confluence signals with 70%+ confidence. Multi-timeframe TradingView analysis.",
          parameters: [
            { name: "symbol", in: "query", schema: { type: "string" }, description: "Filter by symbol (e.g. BTCUSDT)" },
            { name: "tf", in: "query", schema: { type: "string", enum: ["M5", "M15", "H1", "H4"] }, description: "Filter by timeframe" },
            { name: "min_confluence", in: "query", schema: { type: "integer", minimum: 2, maximum: 4 }, description: "Minimum TF agreement" },
            { name: "direction", in: "query", schema: { type: "string", enum: ["BUY", "SELL"] } }
          ],
          responses: {
            "200": {
              description: "Signal list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      count: { type: "integer" },
                      signals: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            symbol: { type: "string" },
                            direction: { type: "string", enum: ["BUY", "SELL"] },
                            confidence: { type: "number" },
                            timeframe: { type: "string" },
                            entry: { type: "number" },
                            takeProfit1: { type: "number" },
                            stopLoss: { type: "number" },
                            source: { type: "string" },
                            timestamp: { type: "string", format: "date-time" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/win-rates": {
        get: {
          summary: "Get historical win rates per symbol",
          description: "Returns win/loss statistics for each symbol based on tracked signal outcomes.",
          responses: {
            "200": {
              description: "Win rate data",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      timestamp: { type: "string", format: "date-time" },
                      rates: {
                        type: "object",
                        additionalProperties: {
                          type: "object",
                          properties: {
                            wins: { type: "integer" },
                            losses: { type: "integer" },
                            winRate: { type: "number" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/prices/stream": {
        get: {
          summary: "SSE live price stream",
          description: "Server-Sent Events stream of live prices. Connect and receive price updates in real-time.",
          responses: {
            "200": {
              description: "Event stream",
              content: {
                "text/event-stream": {
                  schema: {
                    type: "string",
                    description: "SSE formatted price updates"
                  }
                }
              }
            }
          }
        }
      },
      "/api/signals": {
        get: {
          summary: "Get trading signals (legacy)",
          description: "Returns BUY/SELL signals generated from multi-indicator technical analysis.",
          parameters: [
            { name: "symbol", in: "query", schema: { type: "string" }, description: "Filter by trading pair" },
            { name: "timeframe", in: "query", schema: { type: "string" }, description: "Timeframe: M5, M15, H1, H4, D1" },
            { name: "direction", in: "query", schema: { type: "string" }, description: "Signal direction: BUY or SELL" },
            { name: "minConfidence", in: "query", schema: { type: "number" }, description: "Minimum confidence score (0-100)" }
          ],
          responses: {
            "200": { description: "Signal list" }
          }
        }
      },
      "/api/prices": {
        get: {
          summary: "Get current prices",
          description: "Current market prices for all supported symbols.",
          responses: {
            "200": { description: "Price data" }
          }
        }
      },
      "/api/backtest": {
        get: {
          summary: "Get historical OHLCV data",
          description: "Fetch historical candle data for backtesting strategies.",
          parameters: [
            { name: "symbol", in: "query", required: true, schema: { type: "string" }, description: "Trading pair" },
            { name: "timeframe", in: "query", required: true, schema: { type: "string" }, description: "Timeframe" }
          ],
          responses: {
            "200": { description: "OHLCV candle data" }
          }
        }
      }
    }
  };

  return NextResponse.json(spec);
}
