import type { Metadata } from "next";
import dynamic from "next/dynamic";

const ExamplesClient = dynamic(() => import("./ExamplesClient"), {
  loading: () => (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: "Bot Examples — Copy-Paste Trading Bots | TradeClaw",
  description:
    "5 ready-to-run trading bot examples in Python, Node.js, Bash, cURL, and Go. Poll TradeClaw signals and send Telegram alerts in under 5 minutes.",
  keywords: [
    "trading bot example",
    "python trading bot",
    "nodejs trading bot",
    "telegram trading alerts",
    "tradeclaw api",
    "curl trading signals",
    "go trading bot",
  ],
};

export default function ExamplesPage() {
  return <ExamplesClient />;
}
