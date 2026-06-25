'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Brain,
  Shield,
  Briefcase,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

interface AgentAnalysis {
  role: 'analyst' | 'risk_manager' | 'portfolio_manager';
  summary: string;
  confidence: number;
  signals: { indicator: string; value: string; interpretation: string }[];
  timestamp: string;
}

interface FinalVerdict {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  sizing: string;
  reasoning: string;
}

interface ResearchJob {
  id: string;
  request: { symbol: string; timeframe: string; requestedBy: string };
  status: 'queued' | 'analyst' | 'risk' | 'pm' | 'complete' | 'failed';
  analyses: AgentAnalysis[];
  finalVerdict?: FinalVerdict;
  createdAt: string;
  completedAt?: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const SYMBOLS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'];
const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'];

const STATUS_LABELS: Record<ResearchJob['status'], string> = {
  queued: 'Queued',
  analyst: 'Analyst',
  risk: 'Risk Manager',
  pm: 'Portfolio Manager',
  complete: 'Complete',
  failed: 'Failed',
};

const ROLE_ICONS: Record<AgentAnalysis['role'], typeof Brain> = {
  analyst: Search,
  risk_manager: Shield,
  portfolio_manager: Briefcase,
};

const ROLE_LABELS: Record<AgentAnalysis['role'], string> = {
  analyst: 'Analyst',
  risk_manager: 'Risk Manager',
  portfolio_manager: 'Portfolio Manager',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function verdictColor(action: string): string {
  if (action === 'BUY') return 'text-emerald-400';
  if (action === 'SELL') return 'text-red-400';
  return 'text-zinc-400';
}

function verdictBg(action: string): string {
  if (action === 'BUY') return 'bg-emerald-500/10 border-emerald-500/20';
  if (action === 'SELL') return 'bg-red-500/10 border-red-500/20';
  return 'bg-zinc-500/10 border-zinc-500/20';
}

function statusColor(status: ResearchJob['status']): string {
  switch (status) {
    case 'complete':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'failed':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    default:
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export function ResearchClient() {
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState('H1');
  const [submitting, setSubmitting] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/pro/research');
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silently fail — will retry on next poll
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Poll for active jobs
  useEffect(() => {
    const hasActive = jobs.some(
      (j) => j.status !== 'complete' && j.status !== 'failed',
    );

    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(fetchJobs, 3000);
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobs, fetchJobs]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/pro/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, timeframe }),
      });
      if (res.ok) {
        await fetchJobs();
      }
    } catch {
      // Network error — user can retry
    } finally {
      setSubmitting(false);
    }
  }

  const activeJobs = jobs.filter(
    (j) => j.status !== 'complete' && j.status !== 'failed',
  );
  const completedJobs = jobs.filter(
    (j) => j.status === 'complete' || j.status === 'failed',
  );

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">AI Research Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Multi-agent analysis: Analyst, Risk Manager, and Portfolio Manager
            collaborate on your trading decisions.
          </p>
        </div>

        {/* Research Request Form */}
        <div className="mb-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">
            New Research
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs text-zinc-500">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
              >
                {SYMBOLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs text-zinc-500">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
              >
                {TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Brain size={14} />
              )}
              Run Research
            </button>
          </div>
        </div>

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
              In Progress
            </h2>
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <ActiveJobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Reports */}
        {completedJobs.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
              Completed Reports
            </h2>
            <div className="space-y-3">
              {completedJobs.map((job) => (
                <CompletedJobCard
                  key={job.id}
                  job={job}
                  expanded={expandedJob === job.id}
                  onToggle={() =>
                    setExpandedJob(expandedJob === job.id ? null : job.id)
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {jobs.length === 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
            <Brain size={32} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-500">
              No research jobs yet. Select a symbol and run your first analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ActiveJobCard({ job }: { job: ResearchJob }) {
  const steps: ResearchJob['status'][] = ['analyst', 'risk', 'pm', 'complete'];
  const currentIdx = steps.indexOf(job.status);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-amber-400" />
          <span className="text-sm font-medium text-white">
            {job.request.symbol}
          </span>
          <span className="text-xs text-zinc-500">{job.request.timeframe}</span>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs ${statusColor(job.status)}`}
        >
          {STATUS_LABELS[job.status]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 flex gap-1">
        {steps.map((step, i) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full ${
              i <= currentIdx ? 'bg-amber-400' : 'bg-white/[0.06]'
            }`}
          />
        ))}
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
        {steps.map((step, i) => {
          const Icon = i === 0 ? Search : i === 1 ? Shield : i === 2 ? Briefcase : CheckCircle;
          return (
            <div
              key={step}
              className={`flex items-center gap-1 ${
                i <= currentIdx ? 'text-amber-400' : ''
              }`}
            >
              <Icon size={10} />
              <span>{STATUS_LABELS[step]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompletedJobCard({
  job,
  expanded,
  onToggle,
}: {
  job: ResearchJob;
  expanded: boolean;
  onToggle: () => void;
}) {
  const failed = job.status === 'failed';

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
      {/* Header — clickable */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          {failed ? (
            <XCircle size={16} className="text-red-400" />
          ) : (
            <CheckCircle size={16} className="text-emerald-400" />
          )}
          <span className="text-sm font-medium text-white">
            {job.request.symbol}
          </span>
          <span className="text-xs text-zinc-500">{job.request.timeframe}</span>

          {!failed && job.finalVerdict && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${verdictBg(job.finalVerdict.action)} ${verdictColor(job.finalVerdict.action)}`}
            >
              {job.finalVerdict.action}
            </span>
          )}

          {!failed && job.finalVerdict && (
            <span className="text-xs text-zinc-500">
              {job.finalVerdict.confidence}% confidence
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600">
            {formatTime(job.createdAt)}
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-zinc-500" />
          ) : (
            <ChevronDown size={14} className="text-zinc-500" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 pb-4 pt-4">
          {failed && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              Research pipeline failed. Try again.
            </div>
          )}

          {!failed && job.finalVerdict && (
            <>
              {/* Verdict card */}
              <div
                className={`mb-4 rounded-lg border p-4 ${verdictBg(job.finalVerdict.action)}`}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className={`text-lg font-bold ${verdictColor(job.finalVerdict.action)}`}
                  >
                    {job.finalVerdict.action}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Size: {job.finalVerdict.sizing}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-300">
                  {job.finalVerdict.reasoning}
                </p>
              </div>

              {/* Agent timeline */}
              <div className="space-y-3">
                {job.analyses.map((analysis, i) => {
                  const Icon = ROLE_ICONS[analysis.role] ?? Brain;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="rounded-lg bg-white/[0.04] p-1.5">
                          <Icon size={14} className="text-zinc-400" />
                        </div>
                        {i < job.analyses.length - 1 && (
                          <div className="my-1 h-full w-px bg-white/[0.06]" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-300">
                            {ROLE_LABELS[analysis.role] ?? analysis.role}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {analysis.confidence}% confidence
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {analysis.summary}
                        </p>
                        {analysis.signals.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {analysis.signals.map((sig, si) => (
                              <span
                                key={si}
                                className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-500"
                              >
                                {sig.indicator}: {sig.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
