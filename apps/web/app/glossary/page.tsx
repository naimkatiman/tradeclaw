import type { Metadata } from "next";
import GlossaryClient from "./GlossaryClient";

export const metadata: Metadata = {
  title: "Trading Glossary | 50+ Terms Explained | TradeClaw",
  description:
    "Trading terms from RSI and MACD to Sharpe ratio and backtesting, with precise notes on what TradeClaw currently implements.",
  openGraph: {
    title: "Trading Glossary | 50+ Terms Explained | TradeClaw",
    description:
      "Master 50+ essential trading terms with real-world TradeClaw relevance. Technical analysis, risk management, performance metrics, and more.",
    url: "https://tradeclaw.win/glossary",
    siteName: "TradeClaw",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trading Glossary | 50+ Terms Explained | TradeClaw",
    description:
      "Master 50+ essential trading terms with real-world TradeClaw relevance.",
  },
  alternates: {
    canonical: "https://tradeclaw.win/glossary",
  },
};

export default function GlossaryPage() {
  return <GlossaryClient />;
}
