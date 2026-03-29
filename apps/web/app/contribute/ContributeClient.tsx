'use client';

import { useState, useEffect } from 'react';

const REPO = 'naimkatiman/tradeclaw';
const REPO_URL = `https://github.com/${REPO}`;
const DISCUSSIONS_URL = `${REPO_URL}/discussions`;
const DISCORD_URL = 'https://discord.gg/tradeclaw';
const TWITTER_URL = 'https://twitter.com/tradeclaw';

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

type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface GoodFirstIssue {
  title: string;
  difficulty: Difficulty;
  estimate: string;
  url: string;
  labels: string[];
  id: number;
}

interface MentorshipForm {
  name: string;
  github: string;
  skills: string;
}

const FALLBACK_ISSUES: GoodFirstIssue[] = [
  {
    id: 1,
    title: 'Build signal indicator plugin system (pluggable architecture)',
    difficulty: 'Easy',
    estimate: '4h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'enhancement', 'plugin'],
  },
  {
    id: 2,
    title: 'Add mobile touch gestures to chart (pinch-zoom, swipe)',
    difficulty: 'Easy',
    estimate: '3h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'mobile', 'ui'],
  },
  {
    id: 3,
    title: 'Fix dark mode flash on initial page load',
    difficulty: 'Easy',
    estimate: '2h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'bug', 'dark-mode'],
  },
  {
    id: 4,
    title: 'Translate docs to Bahasa Malaysia / Indonesian',
    difficulty: 'Easy',
    estimate: '5h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'docs', 'translation'],
  },
  {
    id: 5,
    title: 'Add unit tests for ta-engine.ts (RSI, MACD, Bollinger)',
    difficulty: 'Medium',
    estimate: '6h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'testing', 'ta-engine'],
  },
  {
    id: 6,
    title: 'Add webhook retry UI with exponential backoff status',
    difficulty: 'Medium',
    estimate: '4h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'ui', 'webhooks'],
  },
  {
    id: 7,
    title: 'Export screener results to CSV',
    difficulty: 'Easy',
    estimate: '3h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'enhancement', 'screener'],
  },
  {
    id: 8,
    title: 'Add embed theme presets (dark/light/custom color)',
    difficulty: 'Easy',
    estimate: '3h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'embed', 'theming'],
  },
  {
    id: 9,
    title: 'Backtest comparison mode (side-by-side strategy results)',
    difficulty: 'Medium',
    estimate: '8h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'backtest', 'feature'],
  },
  {
    id: 10,
    title: 'Full multi-language i18n support (EN/MY/ZH/AR)',
    difficulty: 'Hard',
    estimate: '20h',
    url: `${REPO_URL}/issues`,
    labels: ['good first issue', 'i18n', 'enhancement'],
  },
];

const CONTRIBUTION_PATHS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
      </svg>
    ),
    title: 'Code',
    description: 'Pick a good first issue, fork the repo, and open a PR. We review within 48 hours and pair with you if needed.',
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
    title: 'Documentation',
    description: 'Improve guides, fix typos, add examples, translate content, or write a blog post about your setup.',
    cta: 'View docs',
    href: '/docs',
    color: 'blue',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
    title: 'Testing',
    description: 'Write unit tests for ta-engine, add E2E coverage for signal flows, or help improve CI reliability.',
    cta: 'See test issues',
    href: `${REPO_URL}/issues?q=is%3Aissue+is%3Aopen+label%3Atesting`,
    color: 'violet',
  },
];

const HOW_TO_STEPS = [
  { step: 1, label: 'Fork', description: 'Fork naimkatiman/tradeclaw to your GitHub account' },
  { step: 2, label: 'Clone', description: 'Clone your fork locally and set up the dev environment' },
  { step: 3, label: 'Branch', description: 'Create a feature branch: git checkout -b feat/my-change' },
  { step: 4, label: 'Code', description: 'Make your changes, run lint and build to verify' },
  { step: 5, label: 'PR', description: 'Open a pull request — we review within 48 hours' },
];

const STATS_BADGE = `[![GitHub Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](https://github.com/naimkatiman/tradeclaw)
[![Contributors](https://img.shields.io/github/contributors/naimkatiman/tradeclaw)](https://github.com/naimkatiman/tradeclaw/graphs/contributors)
[![Good First Issues](https://img.shields.io/github/issues/naimkatiman/tradeclaw/good%20first%20issue)](https://github.com/naimkatiman/tradeclaw/issues?q=label%3A%22good+first+issue%22)`;

function StatCard({ label, value, loading }: { label: string; value: string | number; loading: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
<<<<<<< HEAD
      <span className="text-2xl font-bold text-white">
        {loading ? (
          <span className="inline-block w-12 h-6 bg-white/10 rounded animate-pulse" />
=======
      <span className="text-2xl font-bold text-[var(--foreground)]">
        {loading ? (
          <span className="inline-block w-12 h-6 bg-[var(--border)] rounded animate-pulse" />
>>>>>>> origin/main
        ) : (
          value
        )}
      </span>
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const colors: Record<Difficulty, string> = {
    Easy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    Hard: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
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
  const [badgeCopied, setBadgeCopied] = useState(false);

  // Mentorship form state
  const [form, setForm] = useState<MentorshipForm>({ name: '', github: '', skills: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Check localStorage for submitted mentorship
    const saved = localStorage.getItem('tradeclaw_mentorship_submitted');
    if (saved) setSubmitted(true);

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
              data.map((issue) => {
                let difficulty: Difficulty = 'Easy';
                if (issue.labels.some((l) => l.name === 'hard')) difficulty = 'Hard';
                else if (issue.labels.some((l) => l.name === 'medium')) difficulty = 'Medium';
                return {
                  id: issue.id,
                  title: issue.title,
                  difficulty,
                  estimate: '',
                  url: issue.html_url,
                  labels: issue.labels.map((l) => l.name),
                };
              }),
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

  function handleMentorshipSubmit(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem('tradeclaw_mentorship_submitted', JSON.stringify(form));
    setSubmitted(true);
  }

  function copyBadge() {
    void navigator.clipboard.writeText(STATS_BADGE).then(() => {
      setBadgeCopied(true);
      setTimeout(() => setBadgeCopied(false), 2000);
    });
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-20 px-4">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[800px] rounded-full bg-emerald-500/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium text-emerald-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Open Source · MIT License
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Build the future of{' '}
            <span className="text-emerald-400">open-source trading</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-10 max-w-xl mx-auto">
            Join contributors building the first open-source AI trading signal platform
          </p>

          <div className="flex items-center justify-center gap-12 mb-10">
            <StatCard label="GitHub Stars" value={stats.stars} loading={statsLoading} />
<<<<<<< HEAD
            <div className="h-8 w-px bg-white/10" />
            <StatCard label="Open Issues" value={stats.openIssues} loading={statsLoading} />
            <div className="h-8 w-px bg-white/10" />
=======
            <div className="h-8 w-px bg-[var(--border)]" />
            <StatCard label="Open Issues" value={stats.openIssues} loading={statsLoading} />
            <div className="h-8 w-px bg-[var(--border)]" />
>>>>>>> origin/main
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
<<<<<<< HEAD
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors duration-200"
=======
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass-bg)] px-6 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--border)] transition-colors duration-200"
>>>>>>> origin/main
            >
              Browse issues
            </a>
          </div>
        </div>
      </section>

      {/* ── Contributor Paths ─────────────────────────────────────────────────── */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-2 text-center">Ways to contribute</h2>
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
<<<<<<< HEAD
                    <h3 className="font-semibold text-white mb-1">{path.title}</h3>
=======
                    <h3 className="font-semibold text-[var(--foreground)] mb-1">{path.title}</h3>
>>>>>>> origin/main
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
<<<<<<< HEAD
                className="group flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/3 px-5 py-4 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200"
=======
                className="group flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] px-5 py-4 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200"
>>>>>>> origin/main
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-emerald-400/60">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
<<<<<<< HEAD
                  <span className="text-sm font-medium text-white truncate group-hover:text-emerald-300 transition-colors">
=======
                  <span className="text-sm font-medium text-[var(--foreground)] truncate group-hover:text-emerald-400 transition-colors">
>>>>>>> origin/main
                    {issue.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {issue.estimate && (
                    <span className="text-xs text-[var(--text-secondary)]">{issue.estimate}</span>
                  )}
                  <DifficultyBadge difficulty={issue.difficulty} />
<<<<<<< HEAD
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-secondary)] group-hover:text-white transition-colors">
=======
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-secondary)] group-hover:text-[var(--foreground)] transition-colors">
>>>>>>> origin/main
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── How to Contribute (5-step flow) ───────────────────────────────────── */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-2 text-center">How to contribute</h2>
          <p className="text-sm text-[var(--text-secondary)] text-center mb-12">
            Five steps from idea to merged PR
          </p>

          <div className="relative">
            {/* Connector line */}
<<<<<<< HEAD
            <div className="hidden sm:block absolute top-6 left-0 right-0 h-px bg-white/8 z-0" style={{ left: '10%', right: '10%' }} />
=======
            <div className="hidden sm:block absolute top-6 left-0 right-0 h-px bg-[var(--border)] z-0" style={{ left: '10%', right: '10%' }} />
>>>>>>> origin/main

            <div className="grid sm:grid-cols-5 gap-6 relative z-10">
              {HOW_TO_STEPS.map((s) => (
                <div key={s.step} className="flex flex-col items-center text-center gap-3">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold text-sm shrink-0">
                    {s.step}
                  </div>
                  <div>
<<<<<<< HEAD
                    <p className="font-semibold text-white text-sm mb-1">{s.label}</p>
=======
                    <p className="font-semibold text-[var(--foreground)] text-sm mb-1">{s.label}</p>
>>>>>>> origin/main
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 text-center">
            <a
              href={`${REPO_URL}/blob/main/CONTRIBUTING.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Read CONTRIBUTING.md for full details →
            </a>
          </div>
        </div>
      </section>

      {/* ── Mentorship Program ────────────────────────────────────────────────── */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-500/5 p-8">
            <div className="pointer-events-none absolute inset-0">
              <div className="h-full w-full bg-gradient-to-br from-violet-500/8 to-transparent" />
            </div>
            <div className="relative">
              <div className="mb-6 text-center">
                <div className="mb-4 inline-flex items-center justify-center h-12 w-12 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 mx-auto">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-2">Get paired with a maintainer</h2>
                <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
                  New to open source? Fill in the form below and a maintainer will reach out within 48 hours to guide your first PR step by step.
                </p>
              </div>

              {submitted ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
<<<<<<< HEAD
                  <p className="font-semibold text-white">Application received!</p>
=======
                  <p className="font-semibold text-[var(--foreground)]">Application received!</p>
>>>>>>> origin/main
                  <p className="text-sm text-[var(--text-secondary)]">
                    We will reach out via GitHub within 48 hours. Keep an eye on your notifications.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleMentorshipSubmit} className="grid sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Your name</label>
                    <input
                      type="text"
                      required
                      placeholder="Naim"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
<<<<<<< HEAD
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30 transition-colors"
=======
                      className="rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)] focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30 transition-colors"
>>>>>>> origin/main
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">GitHub username</label>
                    <input
                      type="text"
                      required
                      placeholder="@naimkatiman"
                      value={form.github}
                      onChange={(e) => setForm((f) => ({ ...f, github: e.target.value }))}
<<<<<<< HEAD
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30 transition-colors"
=======
                      className="rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)] focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30 transition-colors"
>>>>>>> origin/main
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Skills / interests</label>
                    <input
                      type="text"
                      required
                      placeholder="React, TypeScript, testing…"
                      value={form.skills}
                      onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
<<<<<<< HEAD
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30 transition-colors"
=======
                      className="rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)] focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30 transition-colors"
>>>>>>> origin/main
                    />
                  </div>
                  <div className="sm:col-span-3 flex justify-center pt-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-8 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 transition-colors duration-200"
                    >
                      Apply for mentorship
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Community Links ───────────────────────────────────────────────────── */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-2 text-center">Join the community</h2>
          <p className="text-sm text-[var(--text-secondary)] text-center mb-10">
            Discuss ideas, get help, and stay in the loop
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            {/* GitHub Discussions */}
            <a
              href={DISCUSSIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
<<<<<<< HEAD
              className="group flex flex-col gap-4 rounded-xl border border-white/8 bg-white/3 p-6 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200"
=======
              className="group flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-6 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200"
>>>>>>> origin/main
            >
              <div className="text-emerald-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div>
<<<<<<< HEAD
                <h3 className="font-semibold text-white mb-1">GitHub Discussions</h3>
=======
                <h3 className="font-semibold text-[var(--foreground)] mb-1">GitHub Discussions</h3>
>>>>>>> origin/main
                <p className="text-sm text-[var(--text-secondary)]">Q&amp;A, ideas, and announcements. Best place for in-depth technical discussion.</p>
              </div>
              <span className="text-xs font-medium text-emerald-400 mt-auto">Open discussions →</span>
            </a>

            {/* Discord */}
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
<<<<<<< HEAD
              className="group flex flex-col gap-4 rounded-xl border border-white/8 bg-white/3 p-6 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-200"
=======
              className="group flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-6 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-200"
>>>>>>> origin/main
            >
              <div className="text-indigo-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 00-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 00-5.487 0 12.36 12.36 0 00-.617-1.23A.077.077 0 008.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 00-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 00.031.055 20.03 20.03 0 005.993 2.98.078.078 0 00.084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 01-1.872-.878.075.075 0 01-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 01.078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 01.079.009c.12.098.245.195.372.288a.075.075 0 01-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 00-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 00.084.028 19.963 19.963 0 006.002-2.981.076.076 0 00.032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 00-.031-.028z" />
                </svg>
              </div>
              <div>
<<<<<<< HEAD
                <h3 className="font-semibold text-white mb-1">Discord</h3>
=======
                <h3 className="font-semibold text-[var(--foreground)] mb-1">Discord</h3>
>>>>>>> origin/main
                <p className="text-sm text-[var(--text-secondary)]">Real-time chat for contributors. Get unstuck fast and coordinate with maintainers.</p>
              </div>
              <span className="text-xs font-medium text-indigo-400 mt-auto">Join server →</span>
            </a>

            {/* Twitter/X */}
            <a
              href={TWITTER_URL}
              target="_blank"
              rel="noopener noreferrer"
<<<<<<< HEAD
              className="group flex flex-col gap-4 rounded-xl border border-white/8 bg-white/3 p-6 hover:border-sky-500/30 hover:bg-sky-500/5 transition-all duration-200"
=======
              className="group flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-6 hover:border-sky-500/30 hover:bg-sky-500/5 transition-all duration-200"
>>>>>>> origin/main
            >
              <div className="text-sky-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                </svg>
              </div>
              <div>
<<<<<<< HEAD
                <h3 className="font-semibold text-white mb-1">Twitter / X</h3>
=======
                <h3 className="font-semibold text-[var(--foreground)] mb-1">Twitter / X</h3>
>>>>>>> origin/main
                <p className="text-sm text-[var(--text-secondary)]">Follow for releases, contributor spotlights, and trading signal updates.</p>
              </div>
              <span className="text-xs font-medium text-sky-400 mt-auto">Follow @tradeclaw →</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats Badge ───────────────────────────────────────────────────────── */}
      <section className="px-4 pb-28">
        <div className="mx-auto max-w-4xl">
<<<<<<< HEAD
          <div className="rounded-2xl border border-white/8 bg-white/3 p-8">
=======
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-8">
>>>>>>> origin/main
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Show your support</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Add these badges to your README or blog post to spread the word
                </p>
              </div>
            </div>

<<<<<<< HEAD
            <div className="relative rounded-xl bg-black/40 border border-white/8 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                <span className="text-xs text-[var(--text-secondary)] font-mono">markdown</span>
                <button
                  onClick={copyBadge}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-white transition-colors"
=======
            <div className="relative rounded-xl bg-[#0d0d0d] border border-[var(--border)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                <span className="text-xs text-[var(--text-secondary)] font-mono">markdown</span>
                <button
                  onClick={copyBadge}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
>>>>>>> origin/main
                >
                  {badgeCopied ? (
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
              <pre className="p-4 text-sm font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                <code>{STATS_BADGE}</code>
              </pre>
            </div>

            <p className="mt-4 text-xs text-[var(--text-secondary)]">
              Paste into any Markdown file — badges update live from GitHub.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
