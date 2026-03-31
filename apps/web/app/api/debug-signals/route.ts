import { NextResponse } from "next/server";
import { getOHLCV } from "../../lib/ohlcv";
import { calculateAllIndicators } from "../../lib/ta-engine";
import { generateSignalsFromTA } from "../../lib/signal-generator";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { candles, source } = await getOHLCV("BTCUSD", "H1");
    if (candles.length < 10) {
      return NextResponse.json({ error: "Not enough candles", count: candles.length, source });
    }
    const indicators = calculateAllIndicators(candles);
    const signals = generateSignalsFromTA("BTCUSD", indicators, "H1", "real", Date.now());
    return NextResponse.json({
      ohlcv: { count: candles.length, source, lastClose: candles.at(-1)?.close },
      indicators: { rsi: indicators.rsi?.value, macd: indicators.macd?.histogram, ema20: indicators.ema?.ema20 },
      rawScores: { buyScore: signals.length > 0 ? "has signals" : "no signals" },
      signals: signals.length,
      signalDetails: signals.map(s => ({ direction: s.direction, confidence: s.confidence })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
