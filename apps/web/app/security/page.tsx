import type { Metadata } from "next";
import SecurityDashboardClient from "./SecurityDashboardClient";

export const metadata: Metadata = {
  title: "Security | TradeClaw",
  description:
    "TradeClaw declared security controls, assessment status, and vulnerability disclosure policy.",
  openGraph: {
    title: "Security | TradeClaw",
    description:
      "TradeClaw declared security controls, assessment status, and vulnerability disclosure policy.",
    images: ["/api/og?title=Security+%26+Trust+Dashboard"],
  },
};

export default function SecurityPage() {
  return <SecurityDashboardClient />;
}
