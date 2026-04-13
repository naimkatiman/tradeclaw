import { listLicenses } from '@/lib/licenses';
import LicensesClient from './licenses-client';

export const dynamic = 'force-dynamic';

export default async function LicensesAdminPage() {
  const licenses = await listLicenses();
  const serialized = licenses.map((l) => ({
    ...l,
    expiresAt: l.expiresAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    lastSeenAt: l.lastSeenAt?.toISOString() ?? null,
  }));
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Strategy Licenses</h1>
      <LicensesClient initialLicenses={serialized} />
    </main>
  );
}
