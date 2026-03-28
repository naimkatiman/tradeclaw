import type { Metadata } from "next";
import { StarCampaignClient } from "./StarCampaignClient";

export const metadata: Metadata = {
  title: "⭐ Star TradeClaw — Help Us Reach 1000 Stars",
  description:
    "TradeClaw is free and open-source forever. A star takes 2 seconds and helps thousands of traders discover it. Join the mission.",
  openGraph: {
    title: "⭐ Star TradeClaw — Help Us Reach 1000 Stars",
    description: "Free AI trading signals. MIT license. Zero paywalls. 2 seconds to help.",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
};

export default function StarPage() {
  return <StarCampaignClient />;
}
