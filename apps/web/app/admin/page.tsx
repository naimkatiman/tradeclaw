import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Megaphone,
  Database,
  Users,
  Activity,
  ExternalLink,
} from 'lucide-react';
import { requireAdmin } from '../../lib/admin-gate';
import { query, queryOne } from '../../lib/db-pool';

export const metadata: Metadata = {
  title: 'Admin | TradeClaw',
  description: 'TradeClaw admin dashboard.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface Counts {
  users: number;
  proSubs: number;
  signals24h: number;
  premiumSignals: number;
}

async function loadCounts(): Promise<Counts> {
  const fallback: Counts = { users: 0, proSubs: 0, signals24h: 0, premiumSignals: 0 };
  try {
    const [users, proSubs, signals24h, premiumSignals] = await Promise.all([
      queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM users`),
      queryOne<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM subscriptions
         WHERE status IN ('active','trialing') AND tier IN ('pro','elite','custom')`,
      ),
      queryOne<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM signal_history
         WHERE created_at > NOW() - INTERVAL '24 hours'`,
      ),
      queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM premium_signals`).catch(
        () => ({ c: '0' }),
      ),
    ]);
    return {
      users: Number(users?.c ?? '0'),
      proSubs: Number(proSubs?.c ?? '0'),
      signals24h: Number(signals24h?.c ?? '0'),
      premiumSignals: Number(premiumSignals?.c ?? '0'),
    };
  } catch {
    return fallback;
  }
}

interface RecentUser {
  id: string;
  email: string;
  tier: string;
  created_at: string;
}

async function loadRecentUsers(): Promise<RecentUser[]> {
  try {
    return await query<RecentUser>(
      `SELECT id, email, tier, created_at::text
       FROM users
       ORDER BY created_at DESC
       LIMIT 10`,
    );
  } catch {
    return [];
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
        <Icon size={16} className="text-zinc-500" />
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function Tile({
  href,
  title,
  body,
  icon: Icon,
  external,
}: {
  href: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  external?: boolean;
}) {
  const Outer = external ? 'a' : Link;
  const props = external
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { href };
  return (
    <Outer
      {...props}
      className="group block rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-emerald-500/30 hover:bg-white/[0.04]"
    >
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-emerald-400" />
        <p className="font-semibold text-white">{title}</p>
        {external && <ExternalLink size={12} className="text-zinc-500" />}
      </div>
      <p className="mt-1.5 text-sm text-zinc-400">{body}</p>
    </Outer>
  );
}

export default async function AdminIndexPage() {
  const grant = await requireAdmin();
  const [counts, recentUsers] = await Promise.all([loadCounts(), loadRecentUsers()]);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-400" />
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Signed in as{' '}
              <span className="font-mono text-emerald-400">
                {grant.email ?? 'tc_admin (secret)'}
              </span>
              .
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5"
          >
            Go to user dashboard
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Users" value={counts.users} icon={Users} />
          <StatCard label="Active Pro Subs" value={counts.proSubs} icon={ShieldCheck} />
          <StatCard label="Signals (24h)" value={counts.signals24h} icon={Activity} />
          <StatCard label="Premium Signals" value={counts.premiumSignals} icon={Database} />
        </div>

        {/* Tiles */}
        <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Tools
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Tile
            href="/admin/social-queue"
            title="Social Queue"
            body="Approve, reject, or post queued social media content."
            icon={Megaphone}
          />
          <Tile
            href="/track-record"
            title="Public Track Record"
            body="Open the public verifiable signal history page."
            icon={Activity}
          />
          <Tile
            href="/admin/executions"
            title="Pilot Executions"
            body="Open positions, recent fills, errors, and today's symbol universe."
            icon={Activity}
          />
          <Tile
            href="/dashboard/billing"
            title="Billing (own account)"
            body="Manage Stripe subscription for the signed-in admin."
            icon={ShieldCheck}
          />
          <Tile
            href="https://dashboard.stripe.com/customers"
            title="Stripe Customers"
            body="Open the live Stripe dashboard in a new tab."
            icon={ExternalLink}
            external
          />
          <Tile
            href="https://railway.app/dashboard"
            title="Railway"
            body="Deploys, logs, and DB for the production app."
            icon={ExternalLink}
            external
          />
        </div>

        {/* Recent users */}
        <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Recent signups
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Tier</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-zinc-500" colSpan={3}>
                    No users yet.
                  </td>
                </tr>
              )}
              {recentUsers.map((u) => (
                <tr key={u.id} className="border-t border-white/[0.04]">
                  <td className="px-4 py-2.5 font-mono text-xs text-white">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        u.tier === 'pro' || u.tier === 'elite' || u.tier === 'custom'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {u.tier}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {new Date(u.created_at).toISOString().slice(0, 19).replace('T', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
