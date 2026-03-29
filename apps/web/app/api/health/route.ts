import { NextResponse } from "next/server";
import pkg from "../../../package.json";

export const dynamic = "force-dynamic";

export async function GET() {
<<<<<<< HEAD
  return NextResponse.json({
    status: "ok",
    version: pkg.version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    node: process.version,
    build: process.env.BUILD_ID ?? "development",
  });
=======
  try {
    return NextResponse.json({
      status: "ok",
      version: pkg.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      node: process.version,
      build: process.env.BUILD_ID ?? "development",
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
>>>>>>> origin/main
}
