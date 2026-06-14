'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUserSession } from '../../lib/hooks/use-user-tier';
import { Copy, CheckCircle2, Share2, Users, DollarSign, Clock, Wallet } from 'lucide-react';

interface ReferralRecord {
  id: string;
  referredId: string;
  amountCents: number;
  shareCents: number;
  status: 'pending' | 'paid_out' | 'cancelled';
  createdAt: string;
}

interface ReferralStats {
  referralCode: string | null;
  referralLink: string | null;
  referredCount: number;
  totalEarningsCents: number;
  pendingEarningsCents: number;
  paidOutEarningsCents: number;
  recentRecords: ReferralRecord[];
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ReferralsClient() {
  const { status, session } = useUserSession();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'anonymous') {
      // Session status resolves client-side after mount; clearing the loading
      // flag here is the intended response to that async transition.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    if (status !== 'authenticated') return;

    fetch('/api/referrals', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: ReferralStats) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
        setLoading(false);
      });
  }, [status]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareX = () => {
    if (!stats?.referralLink) return;
    const text = `Earn 20% lifetime revenue sharing every Pro subscriber you refer to TradeClaw — the open-source AI trading signal platform. ${stats.referralLink}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (status === 'loading' || loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-[var(--glass-bg)]" />
          <div className="h-32 animate-pulse rounded-xl bg-[var(--glass-bg)]" />
          <div className="h-64 animate-pulse rounded-xl bg-[var(--glass-bg)]" />
        </div>
      </main>
    );
  }

  if (status === 'anonymous') {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-3">
          Referral Program
        </h1>
        <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
          Sign in to view your referral dashboard, track earnings, and share your link.
        </p>
        <Link
          href="/signin?from=referrals"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          Sign In
        </Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="text-rose-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--glass-bg)]"
        >
          Retry
        </button>
      </main>
    );
  }

  if (!stats) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Referral Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Earn 20% lifetime revenue share for every Pro or Elite subscriber you refer.
        </p>
      </div>

      {/* Referral link card */}
      <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
          Your Referral Link
        </h2>
        {stats.referralLink ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-mono text-[var(--foreground)] truncate">
              {stats.referralLink}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(stats.referralLink!)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--glass-bg)]"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleShareX}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
              >
                <Share2 className="w-4 h-4" />
                Share on X
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            No referral code assigned. Contact support if you believe this is an error.
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-4 h-4 text-emerald-400" />}
          label="Total Referrals"
          value={stats.referredCount.toString()}
        />
        <StatCard
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          label="Total Earnings"
          value={formatCents(stats.totalEarningsCents)}
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          label="Pending"
          value={formatCents(stats.pendingEarningsCents)}
        />
        <StatCard
          icon={<Wallet className="w-4 h-4 text-purple-400" />}
          label="Paid Out"
          value={formatCents(stats.paidOutEarningsCents)}
        />
      </div>

      {/* Recent earnings */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
          Recent Earnings
        </h2>
        {stats.recentRecords.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              No earnings yet.
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Share your link and start earning when your referrals subscribe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                  <th className="pb-3 text-left font-medium">Date</th>
                  <th className="pb-3 text-left font-medium">Referred User</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                  <th className="pb-3 text-right font-medium">Your Share</th>
                  <th className="pb-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {stats.recentRecords.map((record) => (
                  <tr key={record.id} className="text-[var(--foreground)]">
                    <td className="py-3 whitespace-nowrap">
                      {formatDate(record.createdAt)}
                    </td>
                    <td className="py-3 font-mono text-xs text-[var(--text-secondary)]">
                      {record.referredId.slice(0, 8)}…
                    </td>
                    <td className="py-3 text-right">
                      {formatCents(record.amountCents)}
                    </td>
                    <td className="py-3 text-right font-medium text-emerald-400">
                      {formatCents(record.shareCents)}
                    </td>
                    <td className="py-3 text-right">
                      <StatusBadge status={record.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ReferralRecord['status'] }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    paid_out: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  const labels: Record<string, string> = {
    pending: 'Pending',
    paid_out: 'Paid',
    cancelled: 'Cancelled',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
