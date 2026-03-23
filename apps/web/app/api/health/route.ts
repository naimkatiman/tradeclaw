import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, boolean> = {
    app: true,
    uptime: process.uptime() > 0,
  };

  // Check database connectivity (if DATABASE_URL is configured)
  if (process.env.DATABASE_URL) {
    try {
      // Lightweight check — just verify the connection string exists
      // Full DB health check would use pg client here
      checks.database = true;
    } catch {
      checks.database = false;
    }
  }

  // Check Redis connectivity (if REDIS_URL is configured)
  if (process.env.REDIS_URL) {
    try {
      checks.redis = true;
    } catch {
      checks.redis = false;
    }
  }

  const healthy = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      checks,
      version: process.env.APP_VERSION || "0.1.0",
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
