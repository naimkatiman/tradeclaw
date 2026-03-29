import type { Metadata } from "next";
import SecurityDashboardClient from "./SecurityDashboardClient";

export const metadata: Metadata = {
  title: "Security | TradeClaw",
  description:
    "TradeClaw security posture: OWASP Top 10 compliance, security headers, vulnerability disclosure policy, and real-time audit dashboard.",
  openGraph: {
    title: "Security | TradeClaw",
    description:
      "TradeClaw security posture: OWASP Top 10 compliance, security headers, vulnerability disclosure policy, and real-time audit dashboard.",
    images: ["/api/og?title=Security+%26+Trust+Dashboard"],
  },
};

export default function SecurityPage() {
  return <SecurityDashboardClient />;
}
