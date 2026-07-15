import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    source: "declared application configuration",
    liveProbe: false,
    verifiedAt: null,
    grade: null,
    declared: [
      { name: "X-Content-Type-Options", value: "nosniff" },
      { name: "X-Frame-Options", value: "SAMEORIGIN" },
      { name: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { name: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      { name: "Content-Security-Policy-Report-Only", value: "set by middleware; inspect the deployed response for its effective value" },
    ],
    note: "A reverse proxy or hosting platform can alter response headers. Probe the deployed URL before making a deployment claim.",
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
