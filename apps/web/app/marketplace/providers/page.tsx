import type { Metadata } from 'next';
import { getProviders } from '../../../lib/marketplace-providers';
import { Users, BadgeCheck, Globe } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Published Signal Providers | TradeClaw',
  description:
    'Directory of provider records published by this TradeClaw instance. An empty directory stays empty; TradeClaw does not insert demo or fabricated verified providers.',
  openGraph: {
    title: 'Published Signal Providers | TradeClaw',
    description:
      'Provider records published by this instance, with verification badges only when stored in the database.',
  },
};

export default async function ProvidersPage() {
  let providers: Awaited<ReturnType<typeof getProviders>> = [];
  let directoryAvailable = true;

  try {
    providers = await getProviders(50);
  } catch (error) {
    directoryAvailable = false;
    console.warn('[marketplace/providers] provider directory unavailable', error);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Users className="h-8 w-8 text-emerald-400" />
            Signal Providers
          </h1>
          <p className="mt-2 text-zinc-400">
            Provider records published by this instance. A verification badge reflects the stored provider record; it is
            not a performance or profitability endorsement.
          </p>
        </div>

        {!directoryAvailable ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
            <p className="text-amber-200">The provider directory is unavailable because this instance cannot reach its database.</p>
            <p className="mt-2 text-sm text-zinc-500">Check DATABASE_URL and the migration status, then reload this page.</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <p className="text-zinc-400">No provider records have been published by this instance.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700"
              >
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  {p.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-400" />}
                </div>
                {p.bio && <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{p.bio}</p>}
                {p.website && (
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Website
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
