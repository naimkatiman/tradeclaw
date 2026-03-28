import { NextResponse } from "next/server";

export const runtime = "nodejs";
const startTime = Date.now();

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      version: "v1",
      status: "healthy",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      build: process.env.NEXT_PUBLIC_BUILD_TIME ?? "development",
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
}
