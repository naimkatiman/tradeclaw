import type { Metadata } from "next";
import { StarClient } from "./StarClient";

export const metadata: Metadata = {
  title: "Star TradeClaw — Help Us Reach 1,000 GitHub Stars",
  description:
    "Star TradeClaw on GitHub to unlock community milestones: MT4/MT5 integration, mobile app, hosted cloud, and full backtesting. Share pre-written posts and spread the word.",
  openGraph: {
    title: "Help TradeClaw Reach 1,000 Stars on GitHub",
    description:
      "Free, open-source AI trading signals. Every star unlocks new features. Star, share, and help us grow.",
    type: "website",
  },
};

export default function StarPage() {
  return <StarClient />;
}
