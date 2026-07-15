'use client';

import { useEffect, useState } from 'react';
import { CircleDot, Copy, ExternalLink, Eye, GitFork, Star } from 'lucide-react';

const REPO_URL = 'https://github.com/naimkatiman/tradeclaw';

interface GitHubStats {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  lastUpdated: string;
}

export function StarsClient() {
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/github-stars', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`GitHub stats unavailable (${response.status})`);
        return response.json() as Promise<GitHubStats>;
      })
      .then(setStats)
      .catch((fetchError: unknown) => {
        if ((fetchError as { name?: string }).name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, []);

  const badgeMarkdown = `[![GitHub Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](${REPO_URL})`;

  const copyBadge = async () => {
    await navigator.clipboard.writeText(badgeMarkdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const metrics = stats
    ? [
        { label: 'Stars', value: stats.stars, icon: Star },
        { label: 'Forks', value: stats.forks, icon: GitFork },
        { label: 'Watchers', value: stats.watchers, icon: Eye },
        { label: 'Open issues', value: stats.openIssues, icon: CircleDot },
      ]
    : [];

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-20 pt-28 text-[var(--foreground)]">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase text-emerald-400">Repository activity</p>
          <h1 className="text-4xl font-bold sm:text-5xl">TradeClaw on GitHub</h1>
          <p className="max-w-2xl text-[var(--text-secondary)]">
            Current public repository metrics fetched from the GitHub API. TradeClaw does not project future growth or tie product delivery to star counts.
          </p>
        </header>

        {stats ? (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="GitHub repository metrics">
            {metrics.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] p-5">
                <Icon className="mb-4 h-5 w-5 text-emerald-400" aria-hidden="true" />
                <div className="text-3xl font-semibold tabular-nums">{value.toLocaleString()}</div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">{label}</div>
              </div>
            ))}
          </section>
        ) : (
          <section className="rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] p-6 text-sm text-[var(--text-secondary)]">
            {error ? 'GitHub metrics are currently unavailable. No fallback count is shown.' : 'Loading GitHub metrics...'}
          </section>
        )}

        <section className="space-y-4 border-t border-[var(--border)] pt-8">
          <div>
            <h2 className="text-xl font-semibold">Inspect or support the project</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Review the source, issues, and commit history before deciding whether to star or use TradeClaw.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-black hover:bg-emerald-400"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Open repository
            </a>
            <button
              type="button"
              onClick={copyBadge}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-5 py-3 font-medium hover:bg-white/5"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? 'Badge copied' : 'Copy star badge'}
            </button>
          </div>
          {stats?.lastUpdated ? (
            <p className="text-xs text-[var(--text-secondary)]">
              Repository timestamp reported by GitHub: {new Date(stats.lastUpdated).toLocaleString()}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
