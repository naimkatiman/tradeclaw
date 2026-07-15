const steps = [
  {
    step: "01",
    title: "Clone & Deploy",
    code: "git clone https://github.com/naimkatiman/tradeclaw.git\ncd tradeclaw && cp .env.example .env\n# Set DB_PASSWORD, USER_SESSION_SECRET, and AUTH_SECRET\ndocker compose up -d",
    description: "Set the required secrets, then start the app, database, Redis, and migrations with Docker Compose.",
  },
  {
    step: "02",
    title: "Configure",
    code: "# Documented optional values in .env\nMARKET_DATA_HUB_URL=https://your-hub.example\nTELEGRAM_BOT_TOKEN=your-token\n# Compose maps allowlisted values; NEXT_PUBLIC_* needs a rebuild",
    description:
      "Configure only the data providers and notification channels you operate. Entry-like broadcasts remain evidence-gated.",
  },
  {
    step: "03",
    title: "Inspect Outputs",
    code: "# Illustrative output format, not a live recommendation\n# XAUUSD → BUY @ reference entry\n# Confidence: indicator-confluence score\n# Inspect timestamp, source quality, TP/SL, and inputs",
    description:
      "Rule-based research signals with inspectable inputs. They are not a verified trading edge or broker instructions.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-[#0d1117] px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Inspectable from{" "}
            <span className="text-emerald-400">source to signal</span>
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
