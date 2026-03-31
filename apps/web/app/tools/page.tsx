import type { Metadata } from "next";
import dynamic from "next/dynamic";

const ToolsClient = dynamic(() => import("./ToolsClient"), {
  loading: () => (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: "Trading Calculators | TradeClaw",
  description: "Free professional trading calculators: RSI, Position Size, Risk:Reward, Pip Value, Fibonacci Levels. Open source.",
  keywords: ["RSI calculator", "position size calculator", "risk reward calculator", "pip calculator", "fibonacci levels", "trading tools"],
};

export default function ToolsPage() {
  return <ToolsClient />;
}
