import { NextRequest, NextResponse } from "next/server";
import { getAlerts, getAlertStats } from "@/lib/tradingview-alerts";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const pair = searchParams.get("pair") ?? undefined;
  const alerts = getAlerts(limit, pair);
  const stats = getAlertStats();
  return NextResponse.json({ alerts, stats }, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
  });
}
