const GITHUB_URL = "https://github.com/naimkatiman/tradeclaw";
const TWITTER_URL = "https://x.com/tradeclaw";
const DISCORD_URL = "https://discord.gg/tradeclaw";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const FOOTER_LINKS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Pricing", href: "/pricing" },
      { label: "Embed Widget", href: "/embed" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "GitHub", href: GITHUB_URL, external: true },
      { label: "Documentation", href: `${GITHUB_URL}#readme`, external: true },
      {
        label: "Docker Hub",
        href: "https://hub.docker.com",
        external: true,
      },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Discord", href: DISCORD_URL, external: true },
      { label: "Twitter / X", href: TWITTER_URL, external: true },
      {
        label: "Issues",
        href: `${GITHUB_URL}/issues`,
        external: true,
      },
      {
        label: "Discussions",
        href: `${GITHUB_URL}/discussions`,
        external: true,
      },
    ],
  },
];

export function SiteFooter() {
  return (
<<<<<<< HEAD
    <footer className="border-t border-white/6 bg-[#050505] px-6 py-16">
=======
    <footer className="border-t border-[var(--border)] bg-[var(--background)] px-6 py-16">
>>>>>>> origin/main
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-4">
<<<<<<< HEAD
              <span className="text-lg font-bold tracking-tight text-white">
=======
              <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">
>>>>>>> origin/main
                TradeClaw
              </span>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-emerald-400">
                Open Source
              </span>
            </div>
<<<<<<< HEAD
            <p className="text-xs text-zinc-600 leading-relaxed mb-5">
=======
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-5">
>>>>>>> origin/main
              AI-powered trading signals.
              <br />
              Self-hosted. Free forever.
            </p>
<<<<<<< HEAD
            <p className="text-xs text-zinc-700 italic">
=======
            <p className="text-xs text-[var(--text-secondary)] italic">
>>>>>>> origin/main
              Built by traders, for traders.
            </p>

            {/* Social icons */}
            <div className="mt-5 flex gap-3">
              <SocialLink href={GITHUB_URL} label="GitHub">
                <GitHubIcon />
              </SocialLink>
              <SocialLink href={TWITTER_URL} label="Twitter / X">
                <XIcon />
              </SocialLink>
              <SocialLink href={DISCORD_URL} label="Discord">
                <DiscordIcon />
              </SocialLink>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
<<<<<<< HEAD
              <h4 className="mb-3.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
=======
              <h4 className="mb-3.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
>>>>>>> origin/main
                {group.title}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
<<<<<<< HEAD
                      className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
=======
                      className="text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)]"
>>>>>>> origin/main
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
<<<<<<< HEAD
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/4 pt-6 sm:flex-row">
          <p className="text-[11px] text-zinc-700">
=======
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[var(--border)] pt-6 sm:flex-row">
          <p className="text-[11px] text-[var(--text-secondary)]">
>>>>>>> origin/main
            © {new Date().getFullYear()} TradeClaw. Released under the{" "}
            <a
              href={`${GITHUB_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
<<<<<<< HEAD
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
=======
              className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
>>>>>>> origin/main
            >
              MIT License
            </a>
            .
          </p>
<<<<<<< HEAD
          <div className="flex items-center gap-1.5 rounded-full border border-white/6 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[10px] font-mono text-zinc-600">
=======
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
>>>>>>> origin/main
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
<<<<<<< HEAD
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/[0.03] text-zinc-500 transition-all hover:border-white/15 hover:text-zinc-300"
=======
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:border-[var(--glass-border-accent)] hover:text-[var(--foreground)]"
>>>>>>> origin/main
    >
      {children}
    </a>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.1.13 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
