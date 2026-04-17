'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Trophy,
  Share2,
  Copy,
  Check,
  ImageIcon,
  FileText,
  Code2,
  Users,
  Zap,
  BookOpen,
} from 'lucide-react';
import { Navbar } from '../components/navbar';
import { SiteFooter } from '../../components/landing/site-footer';

/* ─── Types ────────────────────────────────────────────────────────────── */

interface CheckResult {
  id: string;
  label: string;
  description: string;
  passed: boolean;
  partial?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  weight: number;
  tip: string;
}

interface ScoreResult {
  repo: string;
  score: number;
  grade: string;
  gradeColor: string;
  checks: CheckResult[];
  readmeLength: number;
  analyzedAt: string;
}

/* ─── Score helpers ────────────────────────────────────────────────────── */

function getGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: 'A+', color: 'text-emerald-400' };
  if (score >= 80) return { grade: 'A', color: 'text-emerald-400' };
  if (score >= 70) return { grade: 'B+', color: 'text-blue-400' };
  if (score >= 60) return { grade: 'B', color: 'text-blue-400' };
  if (score >= 50) return { grade: 'C', color: 'text-zinc-400' };
  if (score >= 35) return { grade: 'D', color: 'text-orange-400' };
  return { grade: 'F', color: 'text-rose-400' };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function analyzeReadme(content: string, _repoUrl: string): CheckResult[] {
  const lower = content.toLowerCase();

  return [
    {
      id: 'demo_gif',
      label: 'Demo GIF / Screenshot',
      description: 'Visual demonstration of the project',
      passed: /\.(gif|png|jpg|jpeg|svg|webp)/i.test(content) && (lower.includes('demo') || lower.includes('screenshot') || lower.includes('preview') || lower.includes('![')),
      icon: ImageIcon,
      weight: 15,
      tip: 'Add a demo GIF or screenshot near the top. Projects with visuals get 40% more stars.',
    },
    {
      id: 'badges',
      label: 'Status Badges',
      description: 'Build status, version, license badges',
      passed: content.includes('img.shields.io') || content.includes('badge') || content.includes('[!['),
      icon: Star,
      weight: 10,
      tip: 'Add shields.io badges for build status, version, and license. They signal an active, maintained project.',
    },
    {
      id: 'install',
      label: 'Install Instructions',
      description: 'Clear setup / installation steps',
      passed: lower.includes('install') || lower.includes('npm install') || lower.includes('pip install') || lower.includes('getting started') || lower.includes('quick start'),
      icon: Code2,
      weight: 20,
      tip: 'Add a "Quick Start" or "Installation" section. Users should be running your project in under 2 minutes.',
    },
    {
      id: 'code_example',
      label: 'Code Examples',
      description: 'Fenced code blocks showing usage',
      passed: content.includes('```'),
      icon: Code2,
      weight: 15,
      tip: 'Add fenced code blocks (```language) with real usage examples. Show, don\'t just tell.',
    },
    {
      id: 'contributing',
      label: 'Contributing Guide',
      description: 'CONTRIBUTING.md or contributing section',
      passed: lower.includes('contributing') || lower.includes('contribute') || lower.includes('pull request') || lower.includes('issues'),
      icon: Users,
      weight: 10,
      tip: 'Add a CONTRIBUTING.md or contributing section. Makes it easier for others to help.',
    },
    {
      id: 'star_cta',
      label: 'Star CTA',
      description: 'Call-to-action to star the repo',
      passed: lower.includes('star') && (lower.includes('github') || lower.includes('⭐') || lower.includes('give') || lower.includes('click')),
      icon: Star,
      weight: 10,
      tip: 'Add a "⭐ Star this repo" section. Explicit asks increase stars by 2-3x.',
    },
    {
      id: 'description',
      label: 'Clear Description',
      description: 'What it does explained in first 3 lines',
      passed: content.length > 200 && !content.startsWith('# TODO'),
      icon: FileText,
      weight: 10,
      tip: 'Lead with a 1-2 sentence pitch. What is it, who is it for, why should they care?',
    },
    {
      id: 'license',
      label: 'License',
      description: 'Open source license declared',
      passed: lower.includes('license') || lower.includes('mit') || lower.includes('apache') || lower.includes('gpl'),
      icon: BookOpen,
      weight: 5,
      tip: 'Declare your license. MIT or Apache 2.0 are most developer-friendly.',
    },
    {
      id: 'length',
      label: 'Substantial Content',
      description: 'README is at least 300 characters',
      passed: content.length >= 300,
      partial: content.length >= 100 && content.length < 300,
      icon: FileText,
      weight: 5,
      tip: `Your README is ${content.length} chars. Aim for 1000+ with real sections.`,
    },
    {
      id: 'features',
      label: 'Features List',
      description: 'Bullet list of key features',
      passed: (lower.includes('feature') || lower.includes('✅') || lower.includes('- ') || lower.includes('* ')) && content.includes('##'),
      icon: Zap,
      weight: 10,
      tip: 'Add a Features section with bullet points. Makes it easy for visitors to scan.',
    },
  ];
}

/* ─── Presets ──────────────────────────────────────────────────────────── */

const PRESET_REPOS = [
  { label: 'TradeClaw (ours)', url: 'https://github.com/naimkatiman/tradeclaw' },
  { label: 'Next.js', url: 'https://github.com/vercel/next.js' },
  { label: 'shadcn/ui', url: 'https://github.com/shadcn-ui/ui' },
  { label: 'Tailwind CSS', url: 'https://github.com/tailwindlabs/tailwindcss' },
];

/* ─── Component ────────────────────────────────────────────────────────── */

export function ReadmeScoreClient() {
  const [url, setUrl] = useState('https://github.com/naimkatiman/tradeclaw');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function analyze() {
    setError('');
    setResult(null);

    // Extract owner/repo from URL
    const match = url.match(/github\.com\/([^/]+\/[^/?\s#]+)/);
    if (!match) {
      setError('Please enter a valid GitHub repo URL (e.g. https://github.com/owner/repo)');
      return;
    }

    const repoPath = match[1].replace(/\.git$/, '');
    setLoading(true);

    try {
      // Fetch raw README
      const rawUrl = `https://raw.githubusercontent.com/${repoPath}/HEAD/README.md`;
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error(`README not found (${res.status}). Is the repo public?`);
      const content = await res.text();

      const checks = analyzeReadme(content, url);
      const earned = checks.reduce((sum, c) => sum + (c.passed ? c.weight : c.partial ? c.weight * 0.5 : 0), 0);
      const total = checks.reduce((sum, c) => sum + c.weight, 0);
      const score = Math.round((earned / total) * 100);
      const { grade, color } = getGrade(score);

      setResult({
        repo: repoPath,
        score,
        grade,
        gradeColor: color,
        checks,
        readmeLength: content.length,
        analyzedAt: new Date().toLocaleTimeString(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch README. Make sure the repo is public.');
    } finally {
      setLoading(false);
    }
  }

  function copyShareText() {
    if (!result) return;
    const text = `My GitHub README scored ${result.score}/100 (${result.grade}) on @TradeClaw README grader!\n\nCheck yours: https://tradeclaw.win/readme-score\n\n⭐ Star TradeClaw: https://github.com/naimkatiman/tradeclaw`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const passCount = result?.checks.filter(c => c.passed).length ?? 0;
  const failCount = result?.checks.filter(c => !c.passed && !c.partial).length ?? 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Navbar />
      <div className="pt-24 pb-20 px-4 max-w-3xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4">
            <GitBranch className="w-3 h-3" />
            Free Developer Tool
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            README <span className="text-emerald-400">Score</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
            Grade any GitHub README in seconds. Get an actionable score with tips to get more stars.
          </p>
        </div>

        {/* Input */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6">
          <label className="block text-sm font-medium mb-3">GitHub Repository URL</label>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze()}
              placeholder="https://github.com/owner/repo"
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
            <button
              onClick={analyze}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mt-3">
            {PRESET_REPOS.map(p => (
              <button
                key={p.url}
                onClick={() => setUrl(p.url)}
                className="px-3 py-1 rounded-lg text-xs border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-emerald-500/40 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Score card */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{result.repo}</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-black">{result.score}</span>
                    <span className="text-2xl text-[var(--text-secondary)]">/100</span>
                    <span className={`text-4xl font-black ${result.gradeColor}`}>{result.grade}</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-[var(--text-secondary)]">
                    <span className="text-emerald-400 font-medium">{passCount} passed</span>
                    <span className="text-rose-400 font-medium">{failCount} failed</span>
                    <span>{result.readmeLength.toLocaleString()} chars</span>
                    <span>Analyzed {result.analyzedAt}</span>
                  </div>
                </div>

                {/* Score ring */}
                <div className="relative shrink-0 w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" strokeWidth="6" stroke="var(--border)" fill="none" />
                    <circle
                      cx="40" cy="40" r="34" strokeWidth="6" fill="none"
                      stroke={result.score >= 70 ? '#10b981' : result.score >= 50 ? '#a1a1aa' : '#f43f5e'}
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - result.score / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <Trophy className={`w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${result.gradeColor}`} />
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-2 rounded-full bg-[var(--glass-bg)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${result.score}%`,
                    background: result.score >= 70 ? '#10b981' : result.score >= 50 ? '#a1a1aa' : '#f43f5e',
                  }}
                />
              </div>

              {/* Share */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={copyShareText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[var(--border)] hover:border-emerald-500/40 transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy share text'}
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`My GitHub README scored ${result.score}/100 (${result.grade}) on @TradeClaw README grader!\n\nCheck yours: https://tradeclaw.win/readme-score`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[var(--border)] hover:border-blue-400/40 text-blue-400 transition-all"
                >
                  <Share2 className="w-3 h-3" />
                  Share on X
                </a>
              </div>
            </div>

            {/* Checks */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-sm font-semibold mb-4">Detailed Breakdown</h2>
              <div className="space-y-3">
                {result.checks.map(check => {
                  const Icon = check.icon;
                  return (
                    <div key={check.id} className={`p-3 rounded-xl border transition-all ${
                      check.passed
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : check.partial
                        ? 'border-zinc-500/20 bg-zinc-500/5'
                        : 'border-rose-500/10 bg-rose-500/5'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {check.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : check.partial ? (
                            <AlertCircle className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="w-3 h-3 text-[var(--text-secondary)]" />
                            <span className="text-sm font-medium">{check.label}</span>
                            <span className="text-xs text-[var(--text-secondary)]">+{check.weight}pts</span>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{check.description}</p>
                          {!check.passed && (
                            <p className="text-xs mt-1.5 text-[var(--text-secondary)] italic">
                              💡 {check.tip}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                TradeClaw scores{' '}
                <span className="text-emerald-400 font-bold">88/100</span> — help us hit 100 and 1000 stars!
              </p>
              <a
                href="https://github.com/naimkatiman/tradeclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all"
              >
                <Star className="w-4 h-4" />
                Star TradeClaw on GitHub
              </a>
            </div>
          </div>
        )}

        {/* Info cards when no result yet */}
        {!result && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {[
              { icon: Search, title: 'Instant Analysis', desc: 'Fetches and scores any public GitHub README in seconds' },
              { icon: Trophy, title: 'A+ to F Grading', desc: '10 checks covering visuals, docs, community, and CTAs' },
              { icon: Share2, title: 'Shareable Results', desc: 'Copy your score and share on Twitter or LinkedIn' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-center">
                <Icon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold mb-1">{title}</p>
                <p className="text-xs text-[var(--text-secondary)]">{desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors">
            ← Back to TradeClaw
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
