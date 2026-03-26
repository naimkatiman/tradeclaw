const STEPS = [
  {
    number: "01",
    title: "Clone & Deploy",
    description:
      "Clone the repo and spin up TradeClaw with a single Docker Compose command. Railway and Vercel one-click deploys also available.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        strokeWidth="1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="12" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="12" width="7" height="7" rx="1" />
        <path d="M16 12v7M12 15.5h7" />
      </svg>
    ),
    code: "docker compose up -d",
  },
  {
    number: "02",
    title: "Configure Assets",
    description:
      "Set your broker API keys and choose from 12+ asset pairs across crypto, forex, and commodities. Configure alert thresholds and Telegram notifications.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        strokeWidth="1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="3" />
        <path d="M11 4V2M11 20v-2M4 11H2M20 11h-2M6.3 6.3L4.9 4.9M17.1 17.1l-1.4-1.4M6.3 15.7l-1.4 1.4M17.1 4.9l-1.4 1.4" />
      </svg>
    ),
    code: "SYMBOLS=EURUSD,BTCUSD,XAUUSD",
  },
  {
    number: "03",
    title: "Get AI Signals",
    description:
      "Your dashboard populates with AI-powered BUY/SELL signals with confidence scores, TP/SL levels, and multi-timeframe confluence analysis.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        strokeWidth="1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="3 17 8 10 13 13 19 5" />
        <path d="M19 5h-4M19 5v4" />
      </svg>
    ),
    code: "Signal: XAU/USD BUY @ 87%",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24 bg-[#0a0a0a]">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-1.5 text-xs uppercase tracking-widest text-zinc-500">
            Get started
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
            Deploy in{" "}
            <span className="text-emerald-400">under 2 minutes</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-zinc-400">
            No vendor accounts, no API keys for signal providers, no monthly
            fees. Just clone and run.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Connector line */}
          <div className="absolute top-10 left-1/6 right-1/6 hidden h-px bg-gradient-to-r from-transparent via-white/8 to-transparent md:block" />

          {STEPS.map((step) => (
            <div key={step.number} className="relative flex flex-col gap-4">
              {/* Number + icon */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/8 text-emerald-400">
                  {step.icon}
                </div>
                <span className="font-mono text-xs font-bold text-zinc-700">
                  {step.number}
                </span>
              </div>

              <h3 className="text-base font-semibold text-white">
                {step.title}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {step.description}
              </p>

              {/* Mini code snippet */}
              <div className="mt-auto rounded-lg border border-white/6 bg-[#050505] px-3.5 py-2.5">
                <span className="text-emerald-400 font-mono text-xs">$ </span>
                <span className="font-mono text-xs text-zinc-400">
                  {step.code}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
