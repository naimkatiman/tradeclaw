import { NextRequest, NextResponse } from "next/server";
import { getTrackedSignals } from "../../../../lib/tracked-signals";
import {
  resolveAccessContext,
  getTierFromRequest,
  TIER_DELAY_MS,
  TIER_SYMBOLS,
  PRO_PREMIUM_MIN_CONFIDENCE,
  type Tier,
} from "../../../../lib/tier";
import { readLiveSignals, mapLiveSignalToV1, type LiveSignal } from "../../../../lib/signals-live";
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from "../../../../lib/signal-thresholds";

export const runtime = "nodejs";

const DEFAULT_SYMBOLS = ["BTCUSD", "ETHUSD", "XAUUSD", "XAGUSD", "EURUSD", "GBPUSD"];
const DEFAULT_TIMEFRAMES = ["H1", "H4"];

function applyTierGate(signals: LiveSignal[], tier: Tier): LiveSignal[] {
  const allowedSymbols = new Set(TIER_SYMBOLS[tier]);
  const delayMs = TIER_DELAY_MS[tier];
  const cutoff = delayMs > 0 ? Date.now() - delayMs : null;

  return signals.filter((s) => {
    if (!allowedSymbols.has(s.symbol)) return false;
    if (tier === "free" && s.confidence >= PRO_PREMIUM_MIN_CONFIDENCE) return false;
    if (cutoff !== null && new Date(s.timestamp).getTime() > cutoff) return false;
    return true;
  });
}

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
  // The v1 API is shared CORS public, so cached responses must not contain
  // tier-specific fields. We resolve tier early and key the response on it
  // so a Pro browser hitting the same edge cache as a free caller doesn't
  // poison either side.
  const tier = await getTierFromRequest(req);
  const headers: Record<string, string> = {
    "Cache-Control": "public, s-maxage=60",
    "X-TradeClaw-Version": "v1",
    "X-TradeClaw-Tier": tier,
    // Vary on Cookie AND Authorization so shared CDN cache does not poison
    // tiers across cookie-auth (browser) and bearer-token (SDK) callers.
    Vary: "Cookie, Authorization",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    // Try reading from Python-generated signals-live.json first
    if (useLive) {
      const liveData = await readLiveSignals();

      if (liveData && !liveData.isStale) {
        let signals = liveData.signals
          .filter((s: LiveSignal) => s.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE);

        // Tier gate first — symbol allowlist, premium-band hide, free-tier delay.
        signals = applyTierGate(signals, tier);

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
            tier,
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
    const ctx = await resolveAccessContext(req);
    const allowedSymbols = new Set(TIER_SYMBOLS[tier]);
    const delayMs = TIER_DELAY_MS[tier];
    const cutoff = delayMs > 0 ? Date.now() - delayMs : null;
    const candidateSymbols = pair ? [pair.replace("/", "")] : DEFAULT_SYMBOLS;
    const symbolsToQuery = candidateSymbols.filter((s) => allowedSymbols.has(s));
    const timeframesToQuery = timeframe ? [timeframe] : DEFAULT_TIMEFRAMES;

    const allResults = await Promise.allSettled(
      symbolsToQuery.flatMap((sym) =>
        timeframesToQuery.map((tf) =>
          getTrackedSignals({ symbol: sym, timeframe: tf, ctx })
        )
      )
    );

    let allSignals = allResults
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getTrackedSignals>>> => r.status === "fulfilled")
      .flatMap((r) => r.value.signals)
      .filter((s) => s.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE)
      .filter((s) => allowedSymbols.has(s.symbol))
      .filter((s) => tier !== "free" || s.confidence < PRO_PREMIUM_MIN_CONFIDENCE)
      .filter((s) => cutoff === null || new Date(s.timestamp).getTime() <= cutoff);

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
        tier,
        signals: results.map(mapSignal),
      },
      { headers: { ...headers, "X-Signal-Source": "realtime" } }
    );
  } catch (err) {
    // Do NOT return 200 with an empty signal list — that masks the failure
    // and lets clients silently believe "no signals right now" when in fact
    // the upstream pipeline is broken. Return 503 so callers can surface it.
    console.error("v1/signals: upstream failure", err);
    return NextResponse.json(
      {
        ok: false,
        version: "v1",
        error: "upstream_unavailable",
        generatedAt: now,
        signals: [],
        tier,
      },
      { status: 503, headers }
    );
  }
}
