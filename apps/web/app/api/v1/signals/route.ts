import { NextRequest, NextResponse } from "next/server";
import { getTrackedSignals } from "../../../../lib/tracked-signals";

export const runtime = "nodejs";

const FALLBACK_SYMBOLS = [
  { symbol: "BTCUSD", direction: "BUY" as const, confidence: 78, entry: 84250, tp: 86500, sl: 82100, rsi: 58, macd: 120, timeframe: "H4" },
  { symbol: "ETHUSD", direction: "BUY" as const, confidence: 72, entry: 1920, tp: 1980, sl: 1850, rsi: 52, macd: 8.5, timeframe: "H1" },
  { symbol: "XAUUSD", direction: "BUY" as const, confidence: 82, entry: 3075.5, tp: 3110, sl: 3045, rsi: 62, macd: 2.3, timeframe: "H4" },
  { symbol: "EURUSD", direction: "SELL" as const, confidence: 68, entry: 1.0835, tp: 1.078, sl: 1.089, rsi: 42, macd: -0.0008, timeframe: "H1" },
  { symbol: "GBPUSD", direction: "BUY" as const, confidence: 65, entry: 1.2935, tp: 1.299, sl: 1.287, rsi: 55, macd: 0.0005, timeframe: "H4" },
  { symbol: "USDJPY", direction: "SELL" as const, confidence: 74, entry: 150.85, tp: 150.2, sl: 151.5, rsi: 68, macd: -0.15, timeframe: "H1" },
];

function buildFallbackResponse(now: string) {
  return FALLBACK_SYMBOLS.map((s) => ({
    id: `fb-${s.symbol.toLowerCase()}-${Date.now()}`,
    pair: s.symbol,
    direction: s.direction,
    confidence: s.confidence,
    timeframe: s.timeframe,
    price: s.entry,
    tp: s.tp,
    sl: s.sl,
    rsi: s.rsi,
    macd: s.macd,
    generatedAt: now,
    shareUrl: `https://tradeclaw.win/signal/${s.symbol}-${s.timeframe}-${s.direction}`,
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pair = searchParams.get("pair")?.toUpperCase();
  const direction = searchParams.get("direction")?.toUpperCase() as "BUY" | "SELL" | null;
  const timeframe = searchParams.get("timeframe")?.toUpperCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

  const now = new Date().toISOString();
  const headers = {
    "Cache-Control": "public, s-maxage=300",
    "X-TradeClaw-Version": "v1",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const { signals: allSignals } = await getTrackedSignals({});
    let filtered = allSignals;

    if (pair) {
      const pairNorm = pair.replace("/", "");
      filtered = filtered.filter(
        (s) => s.symbol === pair || s.symbol === pairNorm || s.symbol.replace("/", "") === pairNorm
      );
    }
    if (direction) filtered = filtered.filter((s) => s.direction === direction);
    if (timeframe) filtered = filtered.filter((s) => s.timeframe === timeframe);

    const results = filtered.slice(0, limit);

    // If no signals after filtering, return fallback signals
    if (results.length === 0) {
      const fallback = buildFallbackResponse(now);
      return NextResponse.json(
        { ok: true, version: "v1", fallback: true, count: fallback.length, total: fallback.length, generatedAt: now, signals: fallback },
        { headers }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        version: "v1",
        count: results.length,
        total: filtered.length,
        generatedAt: now,
        signals: results.map((s) => ({
          id: s.id,
          pair: s.symbol,
          direction: s.direction,
          confidence: s.confidence,
          timeframe: s.timeframe,
          price: s.entry,
          tp: s.takeProfit1,
          sl: s.stopLoss,
          rsi: s.indicators?.rsi?.value,
          macd: s.indicators?.macd?.histogram,
          generatedAt: s.timestamp,
          shareUrl: `https://tradeclaw.win/signal/${s.symbol}-${s.timeframe}-${s.direction}`,
        })),
      },
      { headers }
    );
  } catch {
    // On error, return fallback signals instead of a 500
    const fallback = buildFallbackResponse(now);
    return NextResponse.json(
      { ok: true, version: "v1", fallback: true, count: fallback.length, total: fallback.length, generatedAt: now, signals: fallback },
      { headers }
    );
  }
}
