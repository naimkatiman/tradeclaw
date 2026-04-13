import { NextRequest, NextResponse } from "next/server";
import { getTrackedSignalsForRequest } from "../../../../../lib/tracked-signals";
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from "../../../../../lib/signal-thresholds";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params;
  const pairUpper = pair.toUpperCase();

  try {
    const { signals } = await getTrackedSignalsForRequest(_req, { minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE });
    const signal = signals.find(
      (s) =>
        s.symbol === pairUpper ||
        s.symbol.replace("/", "") === pairUpper ||
        s.symbol === pairUpper.replace("/", "")
    );

    if (!signal) {
      return NextResponse.json(
        { schemaVersion: 1, label: pairUpper, message: "no signal", color: "gray", style: "flat-square" },
        { headers: { "Cache-Control": "public, s-maxage=300", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const isBuy = signal.direction === "BUY";
    return NextResponse.json(
      {
        schemaVersion: 1,
        label: signal.symbol,
        message: `${signal.direction} ${signal.confidence}%`,
        color: isBuy ? "brightgreen" : "red",
        style: "flat-square",
        cacheSeconds: 300,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { schemaVersion: 1, label: pairUpper, message: "error", color: "gray" },
      { status: 500 }
    );
  }
}
