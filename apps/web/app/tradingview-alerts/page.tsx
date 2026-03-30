import { Metadata } from "next";
import TVAlertsClient from "./TVAlertsClient";

export const metadata: Metadata = {
  title: "TradingView Alerts | TradeClaw",
  description: "Bridge TradingView Pine Script alerts to TradeClaw — route signals to Telegram, Discord, and more. Free webhook endpoint for any TradingView plan.",
  keywords: ["tradingview webhook", "pine script alerts", "trading signals", "telegram alerts"],
};

export default function TradingViewAlertsPage() {
  return <TVAlertsClient />;
}
