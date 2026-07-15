import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readSessionFromCookies } from '../../lib/user-session';
import ApiKeysClient from './ApiKeysClient';

export const metadata: Metadata = {
  title: 'API Keys | TradeClaw',
  description:
    'Create a TradeClaw API key with 100 requests per hour for current signals, observed outcomes, and screener endpoints.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ApiKeysPage() {
  const session = await readSessionFromCookies();
  if (!session?.userId) {
    redirect('/signin?next=/api-keys');
  }

  return <ApiKeysClient />;
}
