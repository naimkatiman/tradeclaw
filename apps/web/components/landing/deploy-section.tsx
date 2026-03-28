const GITHUB_URL = "https://github.com/naimkatiman/tradeclaw";

const DEPLOY_OPTIONS = [
  {
    name: "Railway",
    description: "One-click cloud deploy",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M0 12.208l.030.208C.77 16.98 3.903 20.584 8.08 22.148L8.424 11.26 0 12.208zM11.5.05L6.563 3.625l7.12 1.714L11.5.05zM14.294 5.872L6.78 3.972.574 11.298l8.61-1.01 5.11-4.416zM9.03 12.188L8.63 23.957c.455.03.912.044 1.37.044 5.104 0 9.633-2.54 12.41-6.44L9.03 12.188zM22.978 16.038L16.14 5.85l-1.532 5.634 8.37 4.554z" />
      </svg>
    ),
    color: "text-purple-500 dark:text-purple-400",
    bg: "bg-purple-500/8 border-purple-500/20 hover:border-purple-500/40",
    href: GITHUB_URL,
  },
  {
    name: "Vercel",
    description: "Edge-optimized deploy",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M24 22.525H0l12-21.05 12 21.05z" />
      </svg>
    ),
    color: "text-[var(--foreground)]",
    bg: "bg-[var(--glass-bg)] border-[var(--border)] hover:border-[var(--glass-border-accent)]",
    href: GITHUB_URL,
  },
  {
    name: "Docker",
    description: "Self-hosted compose",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185m-2.92 0h2.12a.186.186 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z" />
      </svg>
    ),
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/8 border-blue-500/20 hover:border-blue-500/40",
    href: GITHUB_URL,
  },
];

export function DeploySection() {
  return (
    <section id="deploy" className="px-6 py-28 bg-[var(--background)] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[500px] w-[500px] rounded-full bg-emerald-500/6 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-3.5 py-1.5 text-xs uppercase tracking-widest text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
          Deploy in under 2 minutes
        </div>

        <h2 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          Your trading edge.
          <br />
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Your infrastructure.
          </span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-base text-[var(--text-secondary)]">
          Choose your preferred deploy method. All options give you full
          control — no vendor lock-in, no data shared.
        </p>

        {/* Deploy buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {DEPLOY_OPTIONS.map((opt) => (
            <a
              key={opt.name}
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2.5 rounded-xl border px-5 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${opt.color} ${opt.bg}`}
            >
              {opt.icon}
              <span>Deploy on {opt.name}</span>
            </a>
          ))}
        </div>

        {/* Terminal snippet */}
        <div className="mx-auto mt-10 max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3 bg-[var(--bg-card)]">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
            <span className="ml-2 text-[10px] font-mono text-[var(--text-secondary)]">
              bash
            </span>
          </div>
          <div className="p-5 text-left space-y-1.5 font-mono text-sm">
            <div>
              <span className="text-emerald-400">$</span>
              <span className="text-[var(--foreground)]">
                {" "}
                git clone https://github.com/naimkatiman/tradeclaw.git
              </span>
            </div>
            <div>
              <span className="text-emerald-400">$</span>
              <span className="text-[var(--foreground)]"> cd tradeclaw</span>
            </div>
            <div>
              <span className="text-emerald-400">$</span>
              <span className="text-[var(--foreground)]"> cp .env.example .env</span>
            </div>
            <div>
              <span className="text-emerald-400">$</span>
              <span className="text-[var(--foreground)]"> docker compose up -d</span>
            </div>
            <div className="pt-1">
              <span className="text-[var(--text-secondary)]">
                # Dashboard ready at localhost:3000
              </span>
            </div>
          </div>
        </div>

        <p className="mt-5 text-xs text-[var(--text-secondary)]">
          Requires Docker. Runs on any Linux/Mac/Windows machine.
        </p>
      </div>
    </section>
  );
}
