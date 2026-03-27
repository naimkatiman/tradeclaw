import { Bot, BarChart2, Target, Smartphone, TrendingUp, DollarSign, Lock, Box } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const features: { Icon: LucideIcon; title: string; description: string }[] = [
  {
    Icon: Bot,
    title: "AI Signal Engine",
    description:
      "BUY/SELL signals powered by multi-indicator analysis. RSI, MACD, EMA, Bollinger, Stochastic, S/R levels.",
  },
  {
    Icon: BarChart2,
    title: "12+ Symbols",
    description:
      "XAUUSD, BTCUSD, ETHUSD, XRPUSD, EURUSD, GBPUSD, and more. Forex + crypto + metals in one dashboard.",
  },
  {
    Icon: Target,
    title: "Fibonacci TP/SL",
    description:
      "Automatic take-profit and stop-loss using Fibonacci retracement. TP1, TP2, TP3 with confidence scores.",
  },
  {
    Icon: Smartphone,
    title: "Telegram Alerts",
    description:
      "Get instant BUY/SELL notifications on Telegram. Never miss a signal, even away from your desk.",
  },
  {
    Icon: TrendingUp,
    title: "Backtesting",
    description:
      "Test strategies against historical data before risking real money. Full performance metrics and reports.",
  },
  {
    Icon: DollarSign,
    title: "Paper Trading",
    description:
      "Practice with virtual money. Track P&L, win rate, and drawdown in real-time before going live.",
  },
  {
    Icon: Lock,
    title: "Self-Hosted",
    description:
      "Your server. Your data. Your API keys. Nothing leaves your infrastructure. Full privacy.",
  },
  {
    Icon: Box,
    title: "One-Click Deploy",
    description:
      "docker compose up -d — that's it. Full dashboard ready in under 60 seconds on any machine.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-[#0A0A0A] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Everything you need.{" "}
            <span className="text-zinc-500">Nothing you don&apos;t.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Professional-grade trading intelligence, completely open source.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/[0.03]"
            >
              <feature.Icon className="h-8 w-8 text-emerald-400" />
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
