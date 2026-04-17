import type { Metadata } from 'next';
import UnlockClient from './unlock-client';

export const metadata: Metadata = {
  title: 'Unlock Premium — TradeClaw',
  description: 'Unlock premium signal strategies on this device with your license key.',
};

interface PageProps {
  searchParams: Promise<{ key?: string }>;
}

export default async function UnlockPage({ searchParams }: PageProps) {
  const { key } = await searchParams;
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-2 text-3xl font-bold">Unlock premium strategies</h1>
      <p className="mb-6 text-neutral-400">
        Paste your license key to unlock premium signal strategies on this device.
      </p>
      <UnlockClient initialKey={key ?? ''} />
    </main>
  );
}
