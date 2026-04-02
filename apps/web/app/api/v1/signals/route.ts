import { NextRequest, NextResponse } from "next/server";
import { getTrackedSignals } from "../../../../lib/tracked-signals";
import { readLiveSignals, mapLiveSignalToV1, type LiveSignal } from "../../../../lib/signals-live";
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from "../../../../lib/signal-thresholds";

export const runtime = "nodejs";

const DEFAULT_SYMBOLS = ["BTCUSD", "ETHUSD", "XAUUSD", "XAGUSD", "EURUSD", "GBPUSD"];
const DEFAULT_TIMEFRAMES = ["H1", "H4"];

function mapSignal(s: {
  id: string;
  symbol: string;
  direction: string;
  confidence: number;
  timeframe: string;
  entry: number;
  takeProfit1: number;
  stopLoss: number;
  indicators?: { rsi?: { value: number }; macd?: { histogram: number } };
  timestamp: string;
}) {
  return {
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
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pair = searchParams.get("pair")?.toUpperCase();
  const direction = searchParams.get("direction")?.toUpperCase() as "BUY" | "SELL" | null;
  const timeframe = searchParams.get("timeframe")?.toUpperCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const useLive = searchParams.get("source") !== "realtime"; // Default to live file

  const now = new Date().toISOString();
  const headers = {
    "Cache-Control": "public, s-maxage=60",
    "X-TradeClaw-Version": "v1",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    // Try reading from Python-generated signals-live.json first
    if (useLive) {
      const liveData = await readLiveSignals();

      if (liveData && !liveData.isStale) {
        let signals = liveData.signals
          .filter((s: LiveSignal) => s.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE);

        // Apply filters
        if (pair) {
          const normalizedPair = pair.replace("/", "");
          signals = signals.filter((s: LiveSignal) =>
            s.symbol === normalizedPair || s.symbol === pair
          );
        }
        if (direction) {
          signals = signals.filter((s: LiveSignal) => s.signal === direction);
        }
        if (timeframe) {
          signals = signals.filter((s: LiveSignal) => s.timeframe === timeframe);
        }

        // Sort by confidence and limit
        signals.sort((a: LiveSignal, b: LiveSignal) => b.confidence - a.confidence);
        const results = signals.slice(0, limit);

        return NextResponse.json(
          {
            ok: true,
            version: "v1",
            count: results.length,
            total: signals.length,
            generatedAt: liveData.generatedAt,
            source: "live-file",
            engineVersion: liveData.engineVersion ?? "v4",
            reliability: liveData.reliability ?? null,
            signals: results.map(mapLiveSignalToV1),
          },
          { headers: { ...headers, "X-Signal-Source": "live-file" } }
        );
      }

      // If stale, add header but fall through to realtime
      if (liveData?.isStale) {
        headers["X-Signal-Stale"] = "true";
      }
    }

    // Fallback: real-time TA engine
    // Strategy: query per-symbol to maximize signal yield.
    const symbolsToQuery = pair ? [pair.replace("/", "")] : DEFAULT_SYMBOLS;
    const timeframesToQuery = timeframe ? [timeframe] : DEFAULT_TIMEFRAMES;

    const allResults = await Promise.allSettled(
      symbolsToQuery.flatMap((sym) =>
        timeframesToQuery.map((tf) =>
          getTrackedSignals({ symbol: sym, timeframe: tf })
        )
      )
    );

    let allSignals = allResults
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getTrackedSignals>>> => r.status === "fulfilled")
      .flatMap((r) => r.value.signals)
      .filter((s) => s.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE);

    if (direction) allSignals = allSignals.filter((s) => s.direction === direction);

    // Deduplicate by symbol+timeframe+direction (keep highest confidence)
    const seen = new Map<string, typeof allSignals[0]>();
    for (const s of allSignals) {
      const key = `${s.symbol}-${s.timeframe}-${s.direction}`;
      const existing = seen.get(key);
      if (!existing || s.confidence > existing.confidence) {
        seen.set(key, s);
      }
    }
    const deduped = [...seen.values()].sort((a, b) => b.confidence - a.confidence);
    const results = deduped.slice(0, limit);

    return NextResponse.json(
      {
        ok: true,
        version: "v1",
        count: results.length,
        total: deduped.length,
        generatedAt: now,
        source: "realtime",
        signals: results.map(mapSignal),
      },
      { headers: { ...headers, "X-Signal-Source": "realtime" } }
    );
  } catch {
    return NextResponse.json(
      { ok: true, version: "v1", count: 0, total: 0, generatedAt: now, signals: [] },
      { headers }
    );
  }
}
