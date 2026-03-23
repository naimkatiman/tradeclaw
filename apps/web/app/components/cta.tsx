export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0A0A0A] to-[#0d1117] px-6 py-32">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="text-4xl font-bold sm:text-5xl">
          Your trading signals.
          <br />
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Your rules.
          </span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
          Deploy TradeClaw in 5 minutes and stop paying for signals that
          should be free.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-base font-semibold text-black transition-all hover:bg-emerald-400 hover:scale-105"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            ⭐ Star on GitHub
          </a>
          <a
            href="#how-it-works"
            className="rounded-full border border-white/10 px-8 py-4 text-base font-semibold transition-all hover:border-white/20 hover:bg-white/5"
          >
            See How It Works
          </a>
        </div>

        {/* Quick deploy snippet */}
        <div className="mx-auto mt-12 max-w-lg overflow-hidden rounded-lg border border-white/10 bg-[#0A0A0A]">
          <div className="px-4 py-3 font-mono text-sm text-zinc-400">
            <span className="text-emerald-400">$</span> git clone
            https://github.com/naimkatiman/tradeclaw.git && cd tradeclaw
            <br />
            <span className="text-emerald-400">$</span> docker compose up -d
            <br />
            <span className="text-zinc-600">
              # ✅ Dashboard ready at localhost:3000
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
