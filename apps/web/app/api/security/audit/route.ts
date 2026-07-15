import { NextResponse } from "next/server";

const OWASP_REVIEW_AREAS = [
  "Broken Access Control",
  "Cryptographic Failures",
  "Injection",
  "Insecure Design",
  "Security Misconfiguration",
  "Vulnerable and Outdated Components",
  "Identification and Authentication Failures",
  "Software and Data Integrity Failures",
  "Security Logging and Monitoring Failures",
  "Server-Side Request Forgery",
];

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    platform: "TradeClaw",
    assessment: {
      status: "not-performed",
      independent: false,
      overallScore: null,
      lastAssessedAt: null,
      note: "No independent OWASP assessment, penetration test, or certified dependency audit has been completed.",
    },
    owaspTop10: OWASP_REVIEW_AREAS.map((name, index) => ({
      id: `A${String(index + 1).padStart(2, "0")}`,
      name,
      status: "not-assessed",
    })),
    dependencyAudit: {
      status: "not-reported",
      lastRunAt: null,
      findings: null,
    },
    controlsSource: "repository configuration; not a live deployment probe",
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
