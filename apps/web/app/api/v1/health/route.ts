import { NextResponse } from "next/server";
import { getBuildIdentity } from "../../../../lib/build-identity";

export const runtime = "nodejs";
const startTime = Date.now();

export async function GET() {
  try {
    return NextResponse.json(
      {
        ok: true,
        version: "v1",
        status: "healthy",
        uptime: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
        build: getBuildIdentity(),
        repository: "https://github.com/naimkatiman/tradeclaw",
        license: "MIT",
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
