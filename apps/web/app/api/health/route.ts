import { NextResponse } from "next/server";
import pkg from "../../../package.json";
import { getBuildIdentity } from "../../../lib/build-identity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      status: "ok",
      version: pkg.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      node: process.version,
      build: getBuildIdentity(),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
