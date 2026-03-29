import { NextResponse } from "next/server";

export async function GET() {
  const headers = {
    configured: [
      {
        name: "Content-Security-Policy",
        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none'",
        description: "Controls which resources the browser is allowed to load",
      },
      {
        name: "X-Content-Type-Options",
        value: "nosniff",
        description: "Prevents MIME type sniffing",
      },
      {
        name: "X-Frame-Options",
        value: "DENY",
        description: "Prevents the page from being embedded in iframes",
      },
      {
        name: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
        description: "Controls how much referrer info is sent with requests",
      },
      {
        name: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
        description: "Disables access to device features not needed by the app",
      },
    ],
    missing_recommended: [],
    score: "A",
  };

  return NextResponse.json(headers, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
