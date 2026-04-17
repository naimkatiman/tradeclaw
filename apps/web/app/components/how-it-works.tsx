const steps = [
  {
    step: "01",
    title: "Clone & Deploy",
    code: "git clone https://github.com/naimkatiman/tradeclaw.git\ncd tradeclaw && cp .env.example .env\ndocker compose up -d",
    description: "Three commands. Under 60 seconds to a running dashboard.",
  },
  {
    step: "02",
    title: "Configure",
    code: "# .env\nSCAN_INSTRUMENTS=forex,crypto\nSCAN_INTERVAL=60\nTELEGRAM_BOT_TOKEN=your-token",
    description:
      "Set your instruments, scan frequency, and notification preferences.",
  },
  {
    step: "03",
    title: "Trade Smarter",
    code: "# Signals appear automatically\n# XAUUSD → BUY @ 2,648.30\n# Confidence: 87% | TP1: 2,665 | SL: 2,638\n# Powered by: RSI + MACD + EMA crossover",
    description:
      "AI-powered signals with entry, TP/SL, and confidence scores. Your edge.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-[#0d1117] px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Up and running in{" "}
            <span className="text-emerald-400">5 minutes</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
            No sign-ups. No credit cards. No vendor lock-in.
          </p>
        </div>

        <div className="mt-16 space-y-12">
          {steps.map((step) => (
            <div key={step.step} className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-sm font-bold text-emerald-400">
                  {step.step}
                </div>
                <div className="mt-2 h-full w-px bg-white/5" />
              </div>
              <div className="flex-1 pb-4">
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {step.description}
                </p>
                <div className="mt-4 overflow-hidden rounded-lg border border-white/5 bg-[#0A0A0A]">
                  <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
                    <div className="h-2 w-2 rounded-full bg-red-500/60" />
                    <div className="h-2 w-2 rounded-full bg-zinc-500/60" />
                    <div className="h-2 w-2 rounded-full bg-green-500/60" />
                  </div>
                  <pre className="overflow-x-auto p-4 font-mono text-sm text-emerald-300/80">
                    <code>{step.code}</code>
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
