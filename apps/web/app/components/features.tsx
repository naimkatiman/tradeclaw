import { Bot, BarChart2, Target, Smartphone, TrendingUp, DollarSign, Lock, Box } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const features: { Icon: LucideIcon; title: string; description: string }[] = [
  {
    Icon: Bot,
    title: "Rule-Based Signal Engine",
    description:
      "BUY/SELL research labels derived from inspectable RSI, MACD, EMA, Bollinger, Stochastic, and S/R rules.",
  },
  {
    Icon: BarChart2,
    title: "12+ Symbols",
    description:
      "XAUUSD, BTCUSD, ETHUSD, XRPUSD, EURUSD, GBPUSD, and more. Forex + crypto + metals in one dashboard.",
  },
  {
    Icon: Target,
    title: "Defined TP/SL Levels",
    description:
      "Reference take-profit and stop-loss levels derived from volatility and market structure. They are not broker orders.",
  },
  {
    Icon: Smartphone,
    title: "Telegram Alerts",
    description:
      "Configured Telegram channels can receive approved alerts. Entry-like broadcasts fail closed until the cost-adjusted evidence gate clears.",
  },
  {
    Icon: TrendingUp,
    title: "Backtesting",
    description:
      "Run historical OHLCV simulations with stated assumptions. Results are research outputs, not broker fills or portfolio returns.",
  },
  {
    Icon: DollarSign,
    title: "Paper Trading",
    description:
      "Simulate virtual fills and inspect modeled P&L, win rate, and drawdown. These are not live executions.",
  },
  {
    Icon: Lock,
    title: "Self-Hosted",
    description:
      "Run the stack on infrastructure you control. Configured market-data, broker, and alert integrations still make outbound requests.",
  },
  {
    Icon: Box,
    title: "Docker Compose Stack",
    description:
      "After required secrets are set, Docker Compose starts the app, PostgreSQL, Redis, and database migrations. Startup time depends on the host.",
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
            Inspectable trading research tooling, completely open source.
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
