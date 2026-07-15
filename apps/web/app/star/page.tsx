import type { Metadata } from "next";
import { StarClient } from "./StarClient";

export const metadata: Metadata = {
  title: "Star TradeClaw — Help Us Reach 1,000 GitHub Stars",
  description:
    "Star TradeClaw on GitHub and review proposed feature-request thresholds. Stars indicate interest; they do not guarantee scope or delivery dates.",
  openGraph: {
    title: "Help TradeClaw Reach 1,000 Stars on GitHub",
    description:
      "MIT-licensed trading-signal software. Review the source and proposed feature-request thresholds on GitHub.",
    type: "website",
  },
};

export default function StarPage() {
  return <StarClient />;
}
