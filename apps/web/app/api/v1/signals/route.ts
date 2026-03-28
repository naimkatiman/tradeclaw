import { NextRequest, NextResponse } from "next/server";
import { getTrackedSignals } from "../../../../lib/tracked-signals";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pair = searchParams.get("pair")?.toUpperCase();
  const direction = searchParams.get("direction")?.toUpperCase() as "BUY" | "SELL" | null;
  const timeframe = searchParams.get("timeframe")?.toUpperCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

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

    return NextResponse.json(
      {
        ok: true,
        version: "v1",
        count: results.length,
        total: filtered.length,
        generatedAt: new Date().toISOString(),
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
      {
        headers: {
          "Cache-Control": "public, s-maxage=300",
          "X-TradeClaw-Version": "v1",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to generate signals" }, { status: 500 });
  }
}
