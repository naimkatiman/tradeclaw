import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { requireAdmin } from '../../../lib/admin-gate';
import { listActiveProEmailGrants } from '../../../lib/db';
import { getProGrantEmails } from '../../../lib/admin-emails';
import { GrantForm, RevokeButton } from './ProGrantsClient';

export const metadata: Metadata = {
  title: 'Pro Grants | Admin | TradeClaw',
  description: 'Grant or revoke Pro tier by email.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
}

export default async function ProGrantsPage() {
  await requireAdmin();
  const [grants, envEmails] = await Promise.all([
    listActiveProEmailGrants().catch(() => []),
    Promise.resolve(getProGrantEmails()),
  ]);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-300"
        >
          <ChevronLeft size={14} />
          Back to admin
        </Link>

        <div className="mt-3 flex items-center gap-2">
          <ShieldCheck size={20} className="text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">Pro Grants</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Grant Pro tier to an email without redeploying. Lookup is cached
          in-process for 60 seconds — newly granted users see Pro features
          on their next session refresh, instances on other pods may take
          up to a minute.
        </p>

        <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          New grant
        </h2>
        <GrantForm />

        <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Active DB grants ({grants.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Granted by</th>
                <th className="px-4 py-2.5 font-medium">Note</th>
                <th className="px-4 py-2.5 font-medium">Expires</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
                <th className="px-4 py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {grants.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-zinc-500" colSpan={6}>
                    No active DB grants. Use the form above to add one.
                  </td>
                </tr>
              )}
              {grants.map((g) => (
                <tr key={g.id} className="border-t border-white/[0.04]">
                  <td className="px-4 py-2.5 font-mono text-xs text-white">{g.email}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{g.grantedBy}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">{g.note ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {formatDate(g.expiresAt ? g.expiresAt.toISOString() : null)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {formatDate(g.createdAt.toISOString())}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <RevokeButton email={g.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* env-based grants — informational, can't be revoked from the UI */}
        {envEmails.size > 0 && (
          <>
            <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Bootstrap grants (PRO_EMAILS env)
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              These are baked into the Railway env. Edit{' '}
              <span className="font-mono">PRO_EMAILS</span> and redeploy to
              change them.
            </p>
            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <ul className="divide-y divide-white/[0.04]">
                {[...envEmails].map((email) => (
                  <li
                    key={email}
                    className="px-4 py-2.5 font-mono text-xs text-zinc-300"
                  >
                    {email}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
