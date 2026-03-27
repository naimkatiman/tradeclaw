'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const REPO = 'naimkatiman/tradeclaw';
const REPO_URL = `https://github.com/${REPO}`;
const DISCUSSIONS_URL = `${REPO_URL}/discussions`;

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  labels: Array<{ name: string; color: string }>;
}

interface RepoStats {
  stars: number;
  openIssues: number;
  contributors: number;
}

interface GoodFirstIssue {
  title: string;
  difficulty: 'Easy' | 'Medium';
  estimate: string;
  url: string;
  labels: string[];
  id: number;
}

const FALLBACK_ISSUES: GoodFirstIssue[] = [
  {
    id: 1,
    title: 'Add unit tests for RSI calculation in ta-engine.ts',
    difficulty: 'Easy',
    estimate: '~2h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'testing'],
  },
  {
    id: 2,
    title: 'Add MACD histogram color coding to charts',
    difficulty: 'Easy',
    estimate: '~1h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'ui'],
  },
  {
    id: 3,
    title: 'Add more crypto pairs: SOLUSDT, DOGEUSDT, BNBUSDT',
    difficulty: 'Easy',
    estimate: '~30min',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'enhancement'],
  },
  {
    id: 4,
    title: 'Add copy-to-clipboard for signal TP/SL values',
    difficulty: 'Easy',
    estimate: '~30min',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'ui'],
  },
  {
    id: 5,
    title: 'Add keyboard shortcut (Ctrl+R) to refresh signals',
    difficulty: 'Easy',
    estimate: '~1h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'enhancement'],
  },
  {
    id: 6,
    title: 'Add loading skeleton to leaderboard table',
    difficulty: 'Easy',
    estimate: '~1h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'ui'],
  },
  {
    id: 7,
    title: 'Add CSV export to screener results',
    difficulty: 'Medium',
    estimate: '~2h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'enhancement'],
  },
  {
    id: 8,
    title: 'Add signal count to page title (browser tab)',
    difficulty: 'Easy',
    estimate: '~30min',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'ui'],
  },
  {
    id: 9,
    title: 'Write a blog post about TradeClaw architecture',
    difficulty: 'Easy',
    estimate: '~3h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'docs'],
  },
  {
    id: 10,
    title: 'Add a --help flag to the Docker container',
    difficulty: 'Easy',
    estimate: '~30min',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'devops'],
  },
];

const SETUP_COMMANDS = `git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
cp .env.example .env
docker compose up`;

const CONTRIBUTION_PATHS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
      </svg>
    ),
    title: 'Code',
    description: 'Pick a good first issue, fork the repo, and send a PR. We review within 48 hours.',
    cta: 'Browse issues',
    href: `${REPO_URL}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`,
    color: 'emerald',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: 'Docs',
    description: 'Improve guides, fix typos, add examples, or write a blog post about your setup.',
    cta: 'View docs',
    href: '/docs',
    color: 'blue',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: 'Community',
    description: 'Star the repo, share on Twitter/Reddit, or help answer questions in Discussions.',
    cta: 'Join discussions',
    href: DISCUSSIONS_URL,
    color: 'violet',
  },
];

function StatCard({ label, value, loading }: { label: string; value: string | number; loading: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl font-bold text-white">
        {loading ? (
          <span className="inline-block w-12 h-6 bg-white/10 rounded animate-pulse" />
        ) : (
          value
        )}
      </span>
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: 'Easy' | 'Medium' }) {
  const colors = {
    Easy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors[difficulty]}`}>
      {difficulty}
    </span>
  );
}

export function ContributeClient() {
  const [stats, setStats] = useState<RepoStats>({ stars: 0, openIssues: 0, contributors: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [issues, setIssues] = useState<GoodFirstIssue[]>(FALLBACK_ISSUES);
  const [issuesFromGitHub, setIssuesFromGitHub] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [repoRes, contributorsRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${REPO}`, { next: { revalidate: 3600 } } as RequestInit),
          fetch(`https://api.github.com/repos/${REPO}/contributors?per_page=1&anon=true`, { next: { revalidate: 3600 } } as RequestInit),
        ]);

        if (repoRes.ok) {
          const repo = await repoRes.json() as { stargazers_count: number; open_issues_count: number };
          let contributorCount = 1;

          if (contributorsRes.ok) {
            const linkHeader = contributorsRes.headers.get('link') ?? '';
            const match = linkHeader.match(/page=(\d+)>; rel="last"/);
            contributorCount = match ? parseInt(match[1], 10) : 1;
          }

          setStats({
            stars: repo.stargazers_count,
            openIssues: repo.open_issues_count,
            contributors: contributorCount,
          });
        }
      } catch {
        // silently fall back to 0
      } finally {
        setStatsLoading(false);
      }
    }

    async function fetchIssues() {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${REPO}/issues?labels=good%20first%20issue&state=open&per_page=10`,
        );
        if (res.ok) {
          const data = await res.json() as GitHubIssue[];
          if (data.length > 0) {
            setIssues(
              data.map((issue) => ({
                id: issue.id,
                title: issue.title,
                difficulty: issue.labels.some((l) => l.name === 'medium') ? 'Medium' : 'Easy',
                estimate: '',
                url: issue.html_url,
                labels: issue.labels.map((l) => l.name),
              })),
            );
            setIssuesFromGitHub(true);
          }
        }
      } catch {
        // keep fallback
      }
    }

    void fetchStats();
    void fetchIssues();
  }, []);

  function copySetup() {
    void navigator.clipboard.writeText(SETUP_COMMANDS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-20 px-4">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[800px] rounded-full bg-emerald-500/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium text-emerald-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Open Source · MIT License
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Build the future of{' '}
            <span className="text-emerald-400">open trading</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-10 max-w-xl mx-auto">
            Join contributors building the first open-source AI trading signal platform
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-12 mb-10">
            <StatCard label="GitHub Stars" value={stats.stars} loading={statsLoading} />
            <div className="h-8 w-px bg-white/10" />
            <StatCard label="Open Issues" value={stats.openIssues} loading={statsLoading} />
            <div className="h-8 w-px bg-white/10" />
            <StatCard label="Contributors" value={stats.contributors} loading={statsLoading} />
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href={`${REPO_URL}/fork`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors duration-200"
            >
              Fork &amp; contribute
            </a>
            <a
              href={`${REPO_URL}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors duration-200"
            >
              Browse issues
            </a>
          </div>
        </div>
      </section>

      {/* ── Good First Issues ─────────────────────────────────────────────────── */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Good first issues</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {issuesFromGitHub ? 'Live from GitHub' : 'Curated starter tasks — pick one and dive in'}
              </p>
            </div>
            <a
              href={`${REPO_URL}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View all on GitHub →
            </a>
          </div>

          <div className="grid gap-3">
            {issues.map((issue) => (
              <a
                key={issue.id}
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/3 px-5 py-4 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-emerald-400/60">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  <span className="text-sm font-medium text-white truncate group-hover:text-emerald-300 transition-colors">
                    {issue.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {issue.estimate && (
                    <span className="text-xs text-[var(--text-secondary)]">{issue.estimate}</span>
                  )}
                  <DifficultyBadge difficulty={issue.difficulty} />
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-secondary)] group-hover:text-white transition-colors">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contribution Paths ────────────────────────────────────────────────── */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-2 text-center">How to contribute</h2>
          <p className="text-sm text-[var(--text-secondary)] text-center mb-10">
            Every contribution moves the project forward
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            {CONTRIBUTION_PATHS.map((path) => {
              const colorMap: Record<string, string> = {
                emerald: 'border-emerald-500/20 hover:border-emerald-400/40 text-emerald-400',
                blue: 'border-blue-500/20 hover:border-blue-400/40 text-blue-400',
                violet: 'border-violet-500/20 hover:border-violet-400/40 text-violet-400',
              };
              const bgMap: Record<string, string> = {
                emerald: 'bg-emerald-500/8 hover:bg-emerald-500/12',
                blue: 'bg-blue-500/8 hover:bg-blue-500/12',
                violet: 'bg-violet-500/8 hover:bg-violet-500/12',
              };
              return (
                <a
                  key={path.title}
                  href={path.href}
                  target={path.href.startsWith('http') ? '_blank' : undefined}
                  rel={path.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className={`group flex flex-col gap-4 rounded-xl border p-6 transition-all duration-200 ${colorMap[path.color]} ${bgMap[path.color]}`}
                >
                  <div className={colorMap[path.color]}>{path.icon}</div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{path.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{path.description}</p>
                  </div>
                  <span className={`text-xs font-medium mt-auto ${colorMap[path.color]}`}>
                    {path.cta} →
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Setup Guide ───────────────────────────────────────────────────────── */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-white/8 bg-white/3 p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Dev environment in 4 commands</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Clone, configure, and spin up locally with Docker Compose
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href="/docs/contributing"
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  CONTRIBUTING.md →
                </Link>
              </div>
            </div>

            {/* Code block */}
            <div className="relative rounded-xl bg-black/40 border border-white/8 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                <span className="text-xs text-[var(--text-secondary)] font-mono">bash</span>
                <button
                  onClick={copySetup}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  {copied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-sm font-mono text-emerald-300 overflow-x-auto">
                <code>{SETUP_COMMANDS}</code>
              </pre>
            </div>

            <div className="mt-4 flex gap-4 text-xs text-[var(--text-secondary)]">
              <a
                href={`${REPO_URL}/blob/main/CONTRIBUTING.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                CONTRIBUTING.md
              </a>
              <span>·</span>
              <Link href="/docs" className="hover:text-white transition-colors">
                Full docs
              </Link>
              <span>·</span>
              <a
                href={`${REPO_URL}/issues/new`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Report a bug
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mentorship ────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-28">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-500/5 p-8 text-center">
            <div className="pointer-events-none absolute inset-0">
              <div className="h-full w-full bg-gradient-to-br from-violet-500/8 to-transparent" />
            </div>
            <div className="relative">
              <div className="mb-4 inline-flex items-center justify-center h-12 w-12 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 mx-auto">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">New to open source? We mentor first-time contributors.</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-lg mx-auto">
                Open an issue and tag it{' '}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-violet-300">help-wanted</code>
                {' '}— we will guide you through your first PR step by step. No experience needed.
              </p>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <a
                  href={DISCUSSIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 transition-colors duration-200"
                >
                  Join GitHub Discussions
                </a>
                <a
                  href={`${REPO_URL}/issues/new?labels=help-wanted`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-500/20 transition-colors duration-200"
                >
                  Open a help-wanted issue
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
