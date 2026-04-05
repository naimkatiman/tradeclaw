import { NextRequest, NextResponse } from "next/server";
import { readHistoryAsync, computeLeaderboard, resolveRealOutcomes } from "../../../../lib/signal-history";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "30d") as "7d" | "30d" | "all";
  const sortParam = searchParams.get("sort") ?? "hitRate";

  try {
    await resolveRealOutcomes();
    const history = await readHistoryAsync();
    const data = computeLeaderboard(history, period);
    const assets = data.assets ?? [];

    // Sort by requested field
    const sorted = [...assets].sort((a, b) => {
      if (sortParam === "totalSignals") return b.totalSignals - a.totalSignals;
      if (sortParam === "avgConfidence") return b.avgConfidence - a.avgConfidence;
      return b.hitRate4h - a.hitRate4h; // default: hitRate
    });

    return NextResponse.json(
      {
        ok: true,
        version: "v1",
        period,
        sortBy: sortParam,
        count: sorted.length,
        summary: data.overall,
        leaderboard: sorted.map((e, i) => ({
          rank: i + 1,
          pair: e.pair,
          totalSignals: e.totalSignals,
          hitRate4h: e.hitRate4h,
          hitRate24h: e.hitRate24h,
          avgConfidence: e.avgConfidence,
        })),
        docsUrl: "https://tradeclaw.win/api-docs#leaderboard",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
