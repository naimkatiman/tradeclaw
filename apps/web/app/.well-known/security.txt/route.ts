import { NextResponse } from "next/server";

export async function GET() {
  const content = `Contact: https://github.com/naimkatiman/tradeclaw/security/advisories/new
Expires: 2027-01-01T00:00:00.000Z
Acknowledgments: https://github.com/naimkatiman/tradeclaw/blob/main/SECURITY.md
Policy: https://github.com/naimkatiman/tradeclaw/blob/main/SECURITY.md
Preferred-Languages: en
Canonical: https://tradeclaw.win/.well-known/security.txt`;

  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
