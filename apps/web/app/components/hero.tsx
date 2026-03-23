export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A] to-[#0d1117] px-6 pt-24 text-center">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-sm text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Open Source · Free Forever
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Stop Renting Your
          <br />
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Trading Edge.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl">
          Open-source AI trading signals for forex, crypto, and metals.
          <br className="hidden sm:block" />
          Self-hosted. Private. Free forever.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-black transition-all hover:bg-zinc-200 hover:scale-105"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            ⭐ Star on GitHub
          </a>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 rounded-full border border-white/10 px-8 py-3.5 text-base font-semibold text-white transition-all hover:border-white/20 hover:bg-white/5"
          >
            Deploy in 5 min →
          </a>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span>⭐</span> Open Source
          </span>
          <span className="hidden h-4 w-px bg-zinc-700 sm:block" />
          <span className="flex items-center gap-1.5">
            <span>🐳</span> Docker Ready
          </span>
          <span className="hidden h-4 w-px bg-zinc-700 sm:block" />
          <span className="flex items-center gap-1.5">
            <span>📊</span> 12+ Symbols
          </span>
          <span className="hidden h-4 w-px bg-zinc-700 sm:block" />
          <span className="flex items-center gap-1.5">
            <span>🔒</span> Self-Hosted
          </span>
        </div>
      </div>

      {/* Dashboard preview placeholder */}
      <div className="relative z-10 mx-auto mt-16 w-full max-w-5xl px-4">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111] shadow-2xl shadow-emerald-500/5">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
            <span className="ml-3 text-xs text-zinc-600">
              localhost:3000 — TradeClaw Dashboard
            </span>
          </div>
          <div className="relative aspect-[16/9] bg-gradient-to-br from-[#111] to-[#0d1117] p-8">
            {/* Mock dashboard grid */}
            <div className="grid h-full grid-cols-3 gap-4">
              {/* Signal cards */}
              <div className="flex flex-col gap-3">
                <MockSignalCard symbol="XAUUSD" direction="BUY" confidence={87} price="2,648.30" />
                <MockSignalCard symbol="BTCUSD" direction="SELL" confidence={72} price="94,210.50" />
                <MockSignalCard symbol="EURUSD" direction="BUY" confidence={81} price="1.0832" />
              </div>
              {/* Chart placeholder */}
              <div className="col-span-2 flex items-center justify-center rounded-lg border border-white/5 bg-white/[0.02]">
                <div className="text-center">
                  <div className="text-4xl">📈</div>
                  <p className="mt-2 text-sm text-zinc-600">
                    Live Signal Dashboard
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0d1117] to-transparent" />
    </section>
  );
}

function MockSignalCard({
  symbol,
  direction,
  confidence,
  price,
}: {
  symbol: string;
  direction: "BUY" | "SELL";
  confidence: number;
  price: string;
}) {
  const isBuy = direction === "BUY";
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{symbol}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            isBuy
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {direction}
        </span>
      </div>
      <div className="mt-2 text-lg font-mono text-zinc-300">${price}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <div className="h-1 flex-1 rounded-full bg-white/5">
          <div
            className={`h-1 rounded-full ${isBuy ? "bg-emerald-400" : "bg-red-400"}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="text-xs text-zinc-500">{confidence}%</span>
      </div>
    </div>
  );
}
